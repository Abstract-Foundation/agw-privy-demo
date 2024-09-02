import type {
  Address,
  Hash,
  Hex,
} from 'viem';
import {
  createPublicClient,
  encodeAbiParameters,
  hashMessage,
  hashTypedData,
  http,
  keccak256,
  parseAbiParameters,
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

type ToSmartAccountParameters = {
  /** Address of the deployed Account's Contract implementation. */
  address: Address
  validatorAddress: `0x${string}`
  /** Function to sign a hash. */
  signMessage: (message: string, uiOptions?: SignMessageModalUIOptions | undefined) => Promise<string>
  signTypedData: (typedData: SignTypedDataParams, uiOptions?: SignMessageModalUIOptions | undefined) => Promise<string>
}

export function createSmartAccountClient(
  parameters: ToSmartAccountParameters,
): ZksyncSmartAccountClient {
  const { address, validatorAddress, signMessage, signTypedData } = parameters

  const sign = async ({ hash }: { hash: Hex }) => {
    console.log("Hash to sign: ", hash);
    // The Privy EOA (who is the initial k1 signer) signs msgs/txs
    const result = await signMessage(hash);
    return result as Hex;
  };

  const account = toAccount({
    address,
    sign,
    async signMessage({ message }) {
      return sign({
        hash: hashMessage(message),
      })
    },
    async signTransaction(transaction) {
      const signableTransaction = {
        ...transaction,
      } as ZksyncTransactionSerializableEIP712

      return serializeTransaction({
        ...signableTransaction,
        customSignature: await sign({
          hash: keccak256(serializeTransaction(signableTransaction)),
        }),
      })
    },
    async signTypedData(typedData) {
      return sign({
        hash: hashTypedData(typedData),
      })
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
    console.log(eip712message)
    const signedTxHash = hashTypedData(eip712message);
    console.log("signedTxHash2", signedTxHash)

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
    const rawSignature = await signTypedData(typedData, uiConfig);

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