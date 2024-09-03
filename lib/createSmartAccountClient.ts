import type {
  Address,
  Hash,
  Hex,
} from 'viem';
import {
  bytesToHex,
  createPublicClient,
  encodeAbiParameters,
  hashMessage,
  hashTypedData,
  http,
  keccak256,
  parseAbiParameters,
  TypedDataDefinition,
  TypedData,
  TypedDataParameter
} from 'viem';
import {
  toAccount
} from 'viem/accounts';
import { abstractTestnet } from "viem/chains";
import {
  serializeTransaction,
  ZksyncTransactionSerializableEIP712,
  ZksyncSmartAccount,
} from 'viem/zksync';
import { SignTypedDataParams, SignMessageModalUIOptions } from '@privy-io/react-auth';

export type ZksyncSmartAccountClient = ZksyncSmartAccount & {
  sendTransaction(transaction: ZksyncTransactionSerializableEIP712): Promise<`0x${string}`>;
}

type MessageTypeProperty = {
  name: string;
  type: string;
};

type ToSmartAccountParameters = {
  /** Address of the deployed Account's Contract implementation. */
  address: Address
  validatorAddress: `0x${string}`
  /** Function to sign a hash. */
  privySignMessage: (message: string, uiOptions?: SignMessageModalUIOptions | undefined) => Promise<string>
  privySignTypedData: (typedData: SignTypedDataParams, uiOptions?: SignMessageModalUIOptions | undefined) => Promise<string>
}

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
  parameters: ToSmartAccountParameters,
): ZksyncSmartAccountClient {
  const { address, validatorAddress, privySignMessage, privySignTypedData } = parameters

  const account = toAccount({
    address,
    async sign({ hash }: { hash: Hex }) {
      return await privySignMessage(hash) as Hex;
    },
    async signMessage({ message }) {
      let messageToSign: string
      if (typeof message === 'string') {
        messageToSign = message
      } else if (typeof message === 'object' && 'raw' in message) {
        if (typeof message.raw === 'string') {
          messageToSign = message.raw
        } else {
          // Assuming ByteArray is Uint8Array or similar
          messageToSign = bytesToHex(message.raw)
        }
      } else {
        throw new Error('Invalid message format')
      }
      return await privySignMessage(messageToSign) as Hex
    },
    async signTransaction(transaction) {
      const signableTransaction = {
        ...transaction,
      } as ZksyncTransactionSerializableEIP712

      return serializeTransaction({
        ...signableTransaction,
        customSignature: await privySignMessage(keccak256(serializeTransaction(signableTransaction))) as Hex,
      })
    },
    async signTypedData(typedData) {
      return await privySignTypedData(convertToSignTypedDataParams(typedData)) as Hex;
    },
  })

  const sendTransaction = async (transaction: ZksyncTransactionSerializableEIP712): Promise<`0x${string}`> => {
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
      title: "Mint an NFT",
      description:
        "You are minting an NFT using your Abstract Global Wallet. Gas fees are sponsored by a paymaster.",
      buttonText: "Mint NFT",
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

    const publicClient = createPublicClient({
      chain: abstractTestnet,
      transport: http(),
    });

    const transactionHash = await publicClient.sendRawTransaction({
      serializedTransaction: serializedTx as `0x${string}`,
    });

    return transactionHash;
  }

  return {
    ...account,
    sendTransaction,
    source: 'smartAccountZksync',
  } as ZksyncSmartAccountClient
}