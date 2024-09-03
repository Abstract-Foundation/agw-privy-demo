import {
  Address,
  Hash,
  Hex,
  TypedDataDefinition,
  TypedData,
  encodeAbiParameters,
  hashTypedData,
  parseAbiParameters,
  createPublicClient,
  http,
} from 'viem';
import { abstractTestnet } from "viem/chains";
import {
  serializeTransaction,
  ZksyncTransactionSerializableEIP712,
} from 'viem/zksync';
import { SignTypedDataParams, SignMessageModalUIOptions } from '@privy-io/react-auth';
import { convertToSignTypedDataParams } from './utils';

export type AbstractSmartAccountClient = {
  address: Address;
  sign: (parameters: { hash: Hash }) => Promise<Hex>;
  signMessage: (parameters: { message: string | { raw: Uint8Array } }) => Promise<Hex>;
  signTransaction: (transaction: ZksyncTransactionSerializableEIP712) => Promise<Hex>;
  signTypedData: <
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | 'EIP712Domain' = keyof typedData,
  >(
    parameters: TypedDataDefinition<typedData, primaryType>,
  ) => Promise<Hex>;
  sendTransaction: (transaction: ZksyncTransactionSerializableEIP712) => Promise<`0x${string}`>;
  source: 'smartAccountZksync';
};

type ToAbstractSmartAccountParameters = {
  address: Address;
  validatorAddress: `0x${string}`;
  privySignMessage: (message: string, uiOptions?: SignMessageModalUIOptions) => Promise<string>;
  privySignTypedData: (typedData: SignTypedDataParams, uiOptions?: SignMessageModalUIOptions) => Promise<string>;
};

export function createSmartAccountClient(
  parameters: ToAbstractSmartAccountParameters
): AbstractSmartAccountClient {
  const { address, validatorAddress, privySignMessage, privySignTypedData } = parameters;

  const sign = async ({ hash }: { hash: Hash }): Promise<Hex> => {
    return await privySignMessage(hash) as Hex;
  };

  const signMessage = async ({ message }: { message: string | { raw: Uint8Array } }): Promise<Hex> => {
    let messageToSign: string;
    if (typeof message === 'string') {
      messageToSign = message;
    } else if (typeof message === 'object' && 'raw' in message) {
      messageToSign = new TextDecoder().decode(message.raw);
    } else {
      throw new Error('Invalid message format');
    }
    return await privySignMessage(messageToSign) as Hex;
  };

  const signTransaction = async (transaction: ZksyncTransactionSerializableEIP712): Promise<Hex> => {
    const domain = {
      name: "zkSync",
      version: "2",
      chainId: abstractTestnet.id,
      verifyingContract: validatorAddress,
    };

    const types = {
      SignMessage: [
        { name: "details", type: "string" },
        { name: "hash", type: "bytes32" },
      ],
    };

    // TODO: update viem to include the new domain
    const eip712message = abstractTestnet.custom.getEip712Domain(transaction);
    const signedTxHash = hashTypedData(eip712message);

    const typedData = {
      types,
      domain,
      primaryType: "SignMessage",
      message: {
        details: "You are signing a hash of your transaction",
        hash: signedTxHash,
      },
    };

    const uiConfig = {
      title: "Sign Transaction",
      description: "You are signing an Abstract transaction.",
      buttonText: "Sign",
    };
    const rawSignature = await privySignTypedData(typedData, uiConfig);

    const signature = encodeAbiParameters(
      parseAbiParameters(["bytes", "address", "bytes[]"]),
      [rawSignature as `0x${string}`, validatorAddress, []]
    );

    const serializedTx = serializeTransaction({
      ...transaction,
      customSignature: signature,
    });

    return serializedTx;
  };

  const signTypedData = async <
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | 'EIP712Domain' = keyof typedData,
  >(
    parameters: TypedDataDefinition<typedData, primaryType>,
  ): Promise<Hex> => {
    return await privySignTypedData(convertToSignTypedDataParams(parameters)) as Hex;
  };

  const sendTransaction = async (transaction: ZksyncTransactionSerializableEIP712): Promise<`0x${string}`> => {
    const serializedTx = await signTransaction(transaction);

    const publicClient = createPublicClient({
      chain: abstractTestnet,
      transport: http(),
    });

    const transactionHash = await publicClient.sendRawTransaction({
      serializedTransaction: serializedTx,
    });

    return transactionHash;
  };

  return {
    address,
    sign,
    signMessage,
    signTransaction,
    signTypedData,
    sendTransaction,
    source: 'smartAccountZksync',
  };
}