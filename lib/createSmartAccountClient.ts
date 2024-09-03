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
  TypedDataParameter,
  http,
} from 'viem';
import { abstractTestnet } from "viem/chains";
import {
  serializeTransaction,
  ZksyncTransactionSerializableEIP712,
} from 'viem/zksync';
import { SignTypedDataParams, SignMessageModalUIOptions } from '@privy-io/react-auth';

export type ZksyncSmartAccountClient = {
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

type ToZksyncSmartAccountParameters = {
  address: Address;
  validatorAddress: `0x${string}`;
  privySignMessage: (message: string, uiOptions?: SignMessageModalUIOptions) => Promise<string>;
  privySignTypedData: (typedData: SignTypedDataParams, uiOptions?: SignMessageModalUIOptions) => Promise<string>;
};

type MessageTypes = Record<string, { name: string; type: string }[]>

function convertBigIntToString(value: any): any {
  if (typeof value === 'bigint') {
    return value.toString();
  } else if (Array.isArray(value)) {
    return value.map(convertBigIntToString);
  } else if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, convertBigIntToString(val)])
    );
  }
  return value;
}

type MessageTypeProperty = {
  name: string;
  type: string;
};

function convertToSignTypedDataParams<
  T extends TypedData | Record<string, unknown>,
  P extends keyof T | 'EIP712Domain'
>(typedDataDef: TypedDataDefinition<T, P>): SignTypedDataParams {
  // Helper function to convert TypedDataParameter to MessageTypeProperty
  function convertToMessageTypeProperty(param: TypedDataParameter): MessageTypeProperty {
    return {
      name: param.name,
      type: param.type,
    };
  }

  // Ensure the types property is correctly formatted
  const types: MessageTypes = {};
  
  // Use type assertion to treat typedDataDef.types as a safe type
  const safeTypes = typedDataDef.types as { [key: string]: readonly TypedDataParameter[] | undefined };

  for (const [key, value] of Object.entries(safeTypes)) {
    if (Array.isArray(value)) {
      types[key] = value.map(convertToMessageTypeProperty);
    } else if (value && typeof value === 'object') {
      types[key] = Object.entries(value).map(([name, type]) => ({
        name,
        type: typeof type === 'string' ? type : type.type,
      }));
    }
  }

  // Construct the result object
  const result: SignTypedDataParams = {
    types,
    primaryType: typedDataDef.primaryType as string,
    domain: convertBigIntToString(typedDataDef.domain) ?? {},
    message: typedDataDef.primaryType === 'EIP712Domain'
      ? {}
      : convertBigIntToString(typedDataDef.message as Record<string, unknown>),
  };

  return result;
}

export function createSmartAccountClient(
  parameters: ToZksyncSmartAccountParameters
): ZksyncSmartAccountClient {
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
      description: "You are signing a ZkSync transaction.",
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