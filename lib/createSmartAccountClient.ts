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
import { abstractTestnet } from 'viem/chains';
import { ZksyncTransactionSerializableEIP712, serializeTransaction, eip712WalletActions } from 'viem/zksync';
import { customActions } from './actions';

type RpcRequest = {
  jsonrpc?: '2.0' | undefined
  method: string
  params?: any | undefined
  id?: number | undefined
}

type AbstractClientConfig = {
  smartAccountAddress: `0x${string}`;
  signerAddress: Hex;
  validatorAddress: `0x${string}`;
  eip1193Provider: EIP1193Provider;
};

type AbstractClientActions = {
  sendTransaction: (transaction: ZksyncTransactionSerializableEIP712) => Promise<`0x${string}`>;
  signTransaction: (transaction: ZksyncTransactionSerializableEIP712) => Promise<Hex>;
  signMessage: (parameters: SignMessageParameters) => Promise<Hex>;
  signTypedData: (parameters: SignTypedDataParameters) => Promise<Hex>;
  sign: (parameters: SignMessageParameters) => Promise<Hex>;
}

export type AbstractClient<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TAccount extends Account | undefined = Account | undefined
> = Client<TTransport, TChain, TAccount> & AbstractClientActions;

async function signTransaction(
  transaction: ZksyncTransactionSerializableEIP712, 
  request: (args: RpcRequest) => Promise<unknown>,
  validatorAddress: `0x${string}`,
  signerAddress: Hex,
): Promise<Hex> {
  const domain = {
    name: "zkSync",
    version: "2",
    chainId: abstractTestnet.id,
    verifyingContract: validatorAddress,
  };
  const types = {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" }
    ],
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
    params: [signerAddress, JSON.stringify(typedData)]
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

async function sendTransaction(
  transaction: ZksyncTransactionSerializableEIP712, 
  request: (args: RpcRequest) => Promise<unknown>,
  validatorAddress: `0x${string}`,
  signerAddress: Hex,
): Promise<`0x${string}`> {
  const serializedTx = await signTransaction(transaction, request, validatorAddress, signerAddress);
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
  const { smartAccountAddress, validatorAddress, signerAddress, eip1193Provider } = parameters;
  const transport = custom(eip1193Provider);

  const baseClient = createClient({
    account: smartAccountAddress as TAccount extends Address ? JsonRpcAccount<TAccount> : TAccount,
    chain: abstractTestnet,
    transport,
  });

  // Create a signer wallet client to handle actual signing
  const signerWalletClient = createWalletClient({
    account: signerAddress,
    chain: abstractTestnet,
    transport: custom(eip1193Provider)
  }).extend(eip712WalletActions());

  // Create a wrapper for the request function that matches the expected type
  const requestWrapper = (args: RpcRequest) => baseClient.request(args as any);

  const abstractClient = baseClient.extend(customActions());

  return abstractClient as AbstractClient<TTransport, typeof abstractTestnet, TAccount extends Address ? JsonRpcAccount<TAccount> : TAccount>;
}
