import { 
  createWalletClient,
  createClient,
  custom,
  http,
  Transport,
  Chain,
  Account,
  Hex,
  EIP1193Provider,
  hashTypedData,
  encodeAbiParameters,
  parseAbiParameters,
  createPublicClient,
  SignMessageParameters,
  SignTypedDataParameters,
  Address,
  Client,
  JsonRpcAccount,
  SignableMessage
} from 'viem';
import {
  signMessage,
} from "viem/actions"
import { RpcRequest } from 'viem/types/rpc';
import { abstractTestnet } from 'viem/chains';
import { ZksyncTransactionSerializableEIP712, serializeTransaction, eip712WalletActions } from 'viem/zksync';

type AbstractClientConfig = {
  smartAccountAddress: `0x${string}`;
  signer: Hex;
  validatorAddress: `0x${string}`;
  eip1193Provider: EIP1193Provider;
};

type AbstractClientActions = {
  sendAbstractTransaction: (transaction: ZksyncTransactionSerializableEIP712) => Promise<`0x${string}`>;
  signAbstractTransaction: (transaction: ZksyncTransactionSerializableEIP712) => Promise<Hex>;
  signMessage: (parameters: SignMessageParameters) => Promise<Hex>;
  signTypedData: (parameters: SignTypedDataParameters) => Promise<Hex>;
  sign: (parameters: SignMessageParameters) => Promise<Hex>;
}

export type AbstractClient<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TAccount extends Account | undefined = Account | undefined
> = Client<TTransport, TChain, TAccount> & AbstractClientActions;

async function signAbstractTransaction(
  transaction: ZksyncTransactionSerializableEIP712, 
  request: (args: RpcRequest) => Promise<unknown>,
  validatorAddress: `0x${string}`,
): Promise<Hex> {
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
  const rawSignature = await request({
    method: 'eth_signTypedData_v4',
    params: [transaction.from, JSON.stringify(typedData)]
  }) as Hex;
  const signature = encodeAbiParameters(
    parseAbiParameters(["bytes", "address", "bytes[]"]),
    [rawSignature, validatorAddress, []]
  );
  const serializedTx = serializeTransaction({
    ...transaction,
    customSignature: signature,
  });
  return serializedTx;
}

async function sendAbstractTransaction(
  transaction: ZksyncTransactionSerializableEIP712, 
  request: (args: RpcRequest) => Promise<unknown>,
  validatorAddress: `0x${string}`,
): Promise<`0x${string}`> {
  const serializedTx = await signAbstractTransaction(transaction, request, validatorAddress);
  const publicClient = createPublicClient({
    chain: abstractTestnet,
    transport: http(),
  });
  const transactionHash = await publicClient.sendRawTransaction({
    serializedTransaction: serializedTx,
  });
  return transactionHash;
}

export function createAbstractClient<
  TTransport extends Transport,
  TAccount extends Account | Address | undefined = undefined
>(
  parameters: AbstractClientConfig
): AbstractClient<TTransport, typeof abstractTestnet, TAccount extends Address ? JsonRpcAccount<TAccount> : TAccount> {
  const { smartAccountAddress, validatorAddress, signer, eip1193Provider } = parameters;
  const transport = custom(eip1193Provider);

  const baseClient = createClient({
    account: smartAccountAddress as TAccount extends Address ? JsonRpcAccount<TAccount> : TAccount,
    chain: abstractTestnet,
    transport,
  });

  // Create a signer wallet client to handle actual signing
  const signerWalletClient = createWalletClient({
    account: signer,
    chain: abstractTestnet,
    transport: custom(eip1193Provider)
  }).extend(eip712WalletActions());

  // Create a wrapper for the request function that matches the expected type
  const requestWrapper = (args: RpcRequest) => baseClient.request(args as any);

  const abstractClient = baseClient.extend((client) => ({
    sendAbstractTransaction: (transaction: ZksyncTransactionSerializableEIP712) => 
      sendAbstractTransaction(transaction, requestWrapper, validatorAddress),
    signAbstractTransaction: (transaction: ZksyncTransactionSerializableEIP712) => 
      signAbstractTransaction(transaction, requestWrapper, validatorAddress),
    async signMessage(parameters: SignMessageParameters): Promise<Hex> {
      let signableMessage: SignableMessage;

      if (typeof parameters.message === 'string') {
        signableMessage = parameters.message;
      } else if (parameters.message && 'raw' in parameters.message) {
        if (typeof parameters.message.raw === 'string') {
          signableMessage = parameters.message.raw;
        } else if (parameters.message.raw instanceof Uint8Array) {
          signableMessage = { raw: parameters.message.raw };
        } else {
          throw new Error('Unsupported raw message format');
        }
      } else {
        throw new Error('Unsupported message format');
      }

      return signMessage(signerWalletClient, {
        account: signer,
        message: signableMessage
      });
    },
    async signTypedData(parameters: SignTypedDataParameters): Promise<Hex> {
      return signerWalletClient.signTypedData(parameters);
    },
    async sign(parameters: SignMessageParameters): Promise<Hex> {
      return signerWalletClient.signMessage(parameters);
    }
  }));

  return abstractClient as AbstractClient<TTransport, typeof abstractTestnet, TAccount extends Address ? JsonRpcAccount<TAccount> : TAccount>;
}
