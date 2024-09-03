import { 
  createWalletClient, 
  custom,
  http,
  Transport,
  Chain,
  Account,
  Hex,
  WalletClient,
  EIP1193Provider,
  hashTypedData,
  encodeAbiParameters,
  parseAbiParameters,
  createPublicClient,
  EIP1193RequestFn,
  TransportConfig
} from 'viem';
import { RpcRequest } from 'viem/types/rpc';
import { abstractTestnet } from 'viem/chains';
import { ZksyncTransactionSerializableEIP712, serializeTransaction } from 'viem/zksync';

type CustomActions = {
  sendAbstractTransaction: (transaction: ZksyncTransactionSerializableEIP712) => Promise<`0x${string}`>;
  signAbstractTransaction: (transaction: ZksyncTransactionSerializableEIP712) => Promise<Hex>;
};

export type AbstractClient<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TAccount extends Account | undefined = Account | undefined
> = WalletClient<TTransport, TChain, TAccount> & CustomActions;

type ToAbstractSmartAccountParameters = {
  address: `0x${string}`;
  validatorAddress: `0x${string}`;
  eip1193Provider: EIP1193Provider;
};

type CustomTransportReturn = {
  config: TransportConfig<'custom', EIP1193RequestFn>
  request: EIP1193RequestFn
  value?: Record<string, any>
}

// Extend the Transport type to include the request property
type TransportWithRequest = Transport<'custom', EIP1193RequestFn> & {
  (): CustomTransportReturn
}

function createCustomTransport(
  eip1193Provider: EIP1193Provider,
  validatorAddress: `0x${string}`
): TransportWithRequest {
  const standardTransport = custom(eip1193Provider) as TransportWithRequest;

  return ((config) => {
    console.log("config", config);
    const transport = standardTransport(config);

    return {
      ...transport,
      async request({ method, params }: RpcRequest) {
        switch (method) {
          case 'eth_sendTransaction':
            if (Array.isArray(params) && params.length > 0 && isAbstractTransaction(params[0])) {
              return sendAbstractTransaction(params[0] as ZksyncTransactionSerializableEIP712, transport.request, validatorAddress);
            }
            return transport.request({ method, params });
          case 'eth_signTransaction':
            if (Array.isArray(params) && params.length > 0 && isAbstractTransaction(params[0])) {
              return signAbstractTransaction(params[0] as ZksyncTransactionSerializableEIP712, transport.request, validatorAddress);
            }
            return transport.request({ method, params });
          default:
            return transport.request({ method, params });
        }
      },
    };
  }) as TransportWithRequest;
}

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

export function createAbstractClient(
  parameters: ToAbstractSmartAccountParameters
): AbstractClient {
  const { address, validatorAddress, eip1193Provider } = parameters;

  const transport = createCustomTransport(eip1193Provider, validatorAddress);

  return createWalletClient({
    account: address,
    chain: abstractTestnet,
    transport,
  }).extend((client) => ({
    sendAbstractTransaction: (transaction: ZksyncTransactionSerializableEIP712) => 
      sendAbstractTransaction(transaction, transport({chain: abstractTestnet, pollingInterval: 4000}).request, validatorAddress),
    signAbstractTransaction: (transaction: ZksyncTransactionSerializableEIP712) => 
      signAbstractTransaction(transaction, transport({chain: abstractTestnet, pollingInterval: 4000}).request, validatorAddress),
  })) as AbstractClient;
}

function isAbstractTransaction(tx: unknown): tx is ZksyncTransactionSerializableEIP712 {
  if (typeof tx !== 'object' || tx === null) return false;
  return 'gasPerPubdata' in tx;
}