import {
  Address,
  Transport,
  Account,
  Client,
  WalletClient,
  Hex,
  encodeAbiParameters,
  parseAbiParameters,
  ExactPartial,
  OneOf,
  SendTransactionRequest,
  SendTransactionParameters,
  SendTransactionReturnType,
  Chain,
  ContractFunctionArgs,
  ContractFunctionName,
  WriteContractParameters,
  WriteContractReturnType,
  EncodeFunctionDataParameters,
  encodeFunctionData,
  Abi,
  PublicClient,
  toBytes,
  keccak256
} from "viem";
import {
  abstractTestnet,
} from "viem/chains";
import {
  signTypedData,
  getChainId,
  sendRawTransaction,
} from "viem/actions";
import {
  parseAccount,
  assertRequest,
  getAction,
  assertCurrentChain,
  getTransactionError,
  GetTransactionErrorParameters,
  getContractError
} from "viem/utils"
import {
  BaseError
} from "viem"
import {
  ChainEIP712,
  deployContract,
  SignEip712TransactionReturnType,
  ZksyncTransactionRequest,
  ZksyncTransactionSerializable,
  SignEip712TransactionParameters,
  SendEip712TransactionParameters,
  SendEip712TransactionReturnType,
  Eip712WalletActions
} from "viem/zksync";
import {prepareTransactionRequest} from "./prepareTransaction";
import {BATCH_CALLER_ADDRESS, SMART_ACCOUNT_FACTORY_ADDRESS} from "./constants";
import AccountFactoryAbi from "./AccountFactory.json";

const ALLOWED_CHAINS: ChainEIP712[] = [abstractTestnet];

export class AccountNotFoundError extends BaseError {
  constructor({ docsPath }: { docsPath?: string | undefined } = {}) {
    super(
      [
        'Could not find an Account to execute with this Action.',
        'Please provide an Account with the `account` argument on the Action, or by supplying an `account` to the Client.',
      ].join('\n'),
      {
        docsPath,
        docsSlug: 'account',
        name: 'AccountNotFoundError',
      },
    )
  }
}

export class InvalidEip712TransactionError extends BaseError {
  constructor() {
    super(
      [
        'Transaction is not an EIP712 transaction.',
        '',
        'Transaction must:',
        '  - include `type: "eip712"`',
        '  - include one of the following: `customSignature`, `paymaster`, `paymasterInput`, `gasPerPubdata`, `factoryDeps`',
      ].join('\n'),
      { name: 'InvalidEip712TransactionError' },
    )
  }
}

export async function isSmartAccountDeployed<
  chain extends ChainEIP712 | undefined = ChainEIP712 | undefined
>(publicClient: PublicClient<Transport, chain>, address: Hex): Promise<boolean> {
  try {
    const bytecode = await publicClient.getCode({
      address: address
    })
    return bytecode !== null && bytecode !== '0x' && bytecode !== undefined
  } catch (error) {
    console.error('Error checking address:', error)
    return false
  }
}

export type SendTransactionBatchParameters<
  chain extends Chain | undefined = Chain | undefined,
  account extends Account | undefined = Account | undefined,
  chainOverride extends ChainEIP712 | undefined = ChainEIP712 | undefined,
  request extends SendTransactionRequest<chain, chainOverride> = SendTransactionRequest<chain, chainOverride>
> = {
  // TODO: figure out if more fields need to be lifted up
  calls: SendTransactionParameters<chain, account, chainOverride, request>[];
  paymaster?: Address | undefined
  paymasterInput?: Hex | undefined
};

function isEIP712Transaction(
  transaction: ExactPartial<
    OneOf<ZksyncTransactionRequest | ZksyncTransactionSerializable>
  >,
) {
  if (transaction.type === 'eip712') return true
  if (
    ('customSignature' in transaction && transaction.customSignature) ||
    ('paymaster' in transaction && transaction.paymaster) ||
    ('paymasterInput' in transaction && transaction.paymasterInput) ||
    ('gasPerPubdata' in transaction &&
      typeof transaction.gasPerPubdata === 'bigint') ||
    ('factoryDeps' in transaction && transaction.factoryDeps)
  )
    return true
  return false
}

export function assertEip712Request(args: AssertEip712RequestParameters) {
  if (!isEIP712Transaction(args as any))
    throw new InvalidEip712TransactionError()
  assertRequest(args as any)
}

export type AssertEip712RequestParameters = ExactPartial<
  SendTransactionParameters<typeof abstractTestnet>
>

export async function signTransaction<
  chain extends ChainEIP712 | undefined = ChainEIP712 | undefined,
  account extends Account | undefined = Account | undefined,
  chainOverride extends ChainEIP712 | undefined = ChainEIP712 | undefined,
>(
  client: Client<Transport, ChainEIP712, Account>,
  signerClient: WalletClient<Transport, chain, account>,
  publicClient: PublicClient<Transport, chain>,
  args: SignEip712TransactionParameters<chain, account, chainOverride>,
  validatorAddress: Hex,
): Promise<SignEip712TransactionReturnType> {
  const {
    account: account_ = client.account,
    chain = client.chain,
    ...transaction
  } = args

  if (!account_)
    throw new AccountNotFoundError({
      docsPath: '/docs/actions/wallet/signTransaction',
    })
  const smartAccount = parseAccount(account_)

  assertEip712Request({
    account: smartAccount,
    chain,
    ...(args as AssertEip712RequestParameters),
  })

  if (!chain || !ALLOWED_CHAINS.includes(chain)) {
    throw new BaseError('Invalid chain specified');
  }

  if (!chain?.custom?.getEip712Domain)
    throw new BaseError('`getEip712Domain` not found on chain.')
  if (!chain?.serializers?.transaction)
    throw new BaseError('transaction serializer not found on chain.')

  const chainId = await getAction(client, getChainId, 'getChainId')({})
  if (chain !== null)
    assertCurrentChain({
      currentChainId: chainId,
      chain: chain,
    })

  const eip712Domain = chain?.custom.getEip712Domain({
    ...transaction,
    chainId,
    from: smartAccount.address,
    type: 'eip712',
  })

  const rawSignature = await signTypedData(signerClient, {
    ...eip712Domain,
    account: signerClient.account!
  });

  const signature = encodeAbiParameters(
    parseAbiParameters(["bytes", "address", "bytes[]"]),
    [rawSignature, validatorAddress, []]
  );

  return chain?.serializers?.transaction(
    {
      chainId,
      ...transaction,
      customSignature: signature,
      type: 'eip712' as any,
    },
    { r: '0x0', s: '0x0', v: 0n },
  ) as SignEip712TransactionReturnType
}

export async function signTransactionAsSigner<
  chain extends ChainEIP712 | undefined = ChainEIP712 | undefined,
  account extends Account | undefined = Account | undefined,
  chainOverride extends ChainEIP712 | undefined = ChainEIP712 | undefined,
>(
  client: Client<Transport, ChainEIP712, Account>,
  signerClient: WalletClient<Transport, chain, account>,
  publicClient: PublicClient<Transport, chain>,
  args: SignEip712TransactionParameters<chain, account, chainOverride>,
): Promise<SignEip712TransactionReturnType> {
  const {
    account: account_ = client.account,
    chain = client.chain,
    ...transaction
  } = args

  if (!account_)
    throw new AccountNotFoundError({
      docsPath: '/docs/actions/wallet/signTransaction',
    })
  const smartAccount = parseAccount(account_)

  assertEip712Request({
    account: smartAccount,
    chain,
    ...(args as AssertEip712RequestParameters),
  })

  if (!chain || !ALLOWED_CHAINS.includes(chain)) {
    throw new BaseError('Invalid chain specified');
  }

  if (!chain?.custom?.getEip712Domain)
    throw new BaseError('`getEip712Domain` not found on chain.')
  if (!chain?.serializers?.transaction)
    throw new BaseError('transaction serializer not found on chain.')

  const chainId = await getAction(client, getChainId, 'getChainId')({})
  if (chain !== null)
    assertCurrentChain({
      currentChainId: chainId,
      chain: chain,
    })

  const eip712Domain = chain?.custom.getEip712Domain({
    ...transaction,
    chainId,
    from: signerClient.account?.address!,
    type: 'eip712',
  });

  const signature = await signTypedData(signerClient, {
    ...eip712Domain,
    account: signerClient.account!
  });

  return chain?.serializers?.transaction(
    {
      chainId,
      ...transaction,
      from: signerClient.account?.address!,
      customSignature: signature,
      type: 'eip712' as any,
    },
    { r: '0x0', s: '0x0', v: 0n },
  ) as SignEip712TransactionReturnType
}

export async function sendTransaction<
  chain extends ChainEIP712 | undefined = ChainEIP712 | undefined,
  account extends Account | undefined = Account | undefined,
  chainOverride extends ChainEIP712 | undefined = ChainEIP712 | undefined,
  const request extends SendTransactionRequest<chain, chainOverride> = SendTransactionRequest<chain, chainOverride>,
>(
  client: Client<Transport, ChainEIP712, Account>,
  signerClient: WalletClient<Transport, chain, account>,
  publicClient: PublicClient<Transport, chain>,
  parameters: SendEip712TransactionParameters<
    chain,
    account,
    chainOverride,
    request
  >,
  validatorAddress: Hex,
): Promise<SendEip712TransactionReturnType> {
  const isDeployed = await isSmartAccountDeployed(publicClient, client.account.address);
  if (!isDeployed) {
    const initialCall = {
      target: parameters.to,
      allowFailure: false,
      value: parameters.value ?? 0,
      callData: parameters.data ?? '0x',
    } as Call;
  
    // Create calldata for initializing the proxy account
    const initializerCallData = encodeFunctionData({
      abi: [{
        name: 'initialize',
        type: 'function',
        inputs: [
          { name: 'initialK1Owner', type: 'address' },
          { name: 'initialK1Validator', type: 'address' },
          { name: 'modules', type: 'bytes[]' },
          {
            name: 'initCall',
            type: 'tuple',
            components: [
              { name: 'target', type: 'address' },
              { name: 'allowFailure', type: 'bool' },
              { name: 'value', type: 'uint256' },
              { name: 'callData', type: 'bytes' }
            ]
          }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      }],
      functionName: 'initialize',
      args: [
        signerClient.account!.address,
        validatorAddress,
        [],
        initialCall
      ]
    });

    const addressBytes = toBytes(signerClient.account!.address);
    const salt = keccak256(addressBytes);
    const deploymentCalldata = encodeFunctionData({
      abi: AccountFactoryAbi,
      functionName: 'deployAccount',
      args: [salt, initializerCallData]
    });

    const transactionPayload = {
      to: SMART_ACCOUNT_FACTORY_ADDRESS,
      data: deploymentCalldata,
      value: parameters.value ?? 0,
      paymaster: parameters.paymaster,
      paymasterInput: parameters.paymasterInput,
      type: "eip712",
    } as any;

    return _sendTransaction(client, signerClient, publicClient, transactionPayload, validatorAddress, true);
  } else {
    return _sendTransaction(client, signerClient, publicClient, parameters, validatorAddress, false);
  }
}

export async function _sendTransaction<
  const request extends SendTransactionRequest<chain, chainOverride>,
  chain extends ChainEIP712 | undefined = ChainEIP712 | undefined,
  account extends Account | undefined = Account | undefined,
  chainOverride extends ChainEIP712 | undefined = ChainEIP712 | undefined,
>(
  client: Client<Transport, ChainEIP712, Account>,
  signerClient: WalletClient<Transport, chain, account>,
  publicClient: PublicClient<Transport, chain>,
  parameters: SendEip712TransactionParameters<
    chain,
    account,
    chainOverride,
    request
  >,
  validatorAddress: Hex,
  isInitialTransaction: boolean,
): Promise<SendEip712TransactionReturnType> {
  const { chain = client.chain } = parameters

  if (!signerClient.account)
    throw new AccountNotFoundError({
      docsPath: '/docs/actions/wallet/sendTransaction',
    })
  const account = parseAccount(signerClient.account)

  try {
    assertEip712Request(parameters)

    // Prepare the request for signing (assign appropriate fees, etc.)
    const request = await prepareTransactionRequest(client, signerClient, publicClient, {
      ...parameters,
      parameters: ['gas', 'nonce', 'fees'],
    } as any, isInitialTransaction)

    let chainId: number | undefined
    if (chain !== null) {
      chainId = await getAction(signerClient, getChainId, 'getChainId')({})
      assertCurrentChain({
        currentChainId: chainId,
        chain,
      })
    }

    let serializedTransaction;
    if (isInitialTransaction) {
      serializedTransaction = await signTransactionAsSigner(client, signerClient, publicClient, {
        ...request,
        chainId,
      } as any)
    } else {
      serializedTransaction = await signTransaction(client, signerClient, publicClient, {
        ...request,
        chainId,
      } as any, validatorAddress)
    }

    return await getAction(
      client,
      sendRawTransaction,
      'sendRawTransaction',
    )({
      serializedTransaction,
    })
  } catch (err) {
    throw getTransactionError(err as BaseError, {
      ...(parameters as GetTransactionErrorParameters),
      account,
      chain: chain as Chain,
    })
  }
}

type Call = {
  target: Address
  allowFailure: boolean
  value: bigint
  callData: Hex
}

export async function sendTransactionBatch<
  chain extends ChainEIP712 | undefined = ChainEIP712 | undefined,
  account extends Account | undefined = Account | undefined,
  chainOverride extends ChainEIP712 | undefined = ChainEIP712 | undefined,
  request extends SendTransactionRequest<chain, chainOverride> = SendTransactionRequest<chain, chainOverride>,
>(
  client: Client<Transport, ChainEIP712, Account>,
  signerClient: WalletClient<Transport, chain, account>,
  publicClient: PublicClient<Transport, chain>,
  parameters: SendTransactionBatchParameters<chain, account, chainOverride, request>,
  validatorAddress: Hex,
): Promise<SendTransactionReturnType> {
  if (parameters.calls.length === 0) {
    throw new Error("No calls provided");
  }

  const calls: Call[] = parameters.calls.map(tx => ({
    target: tx.to!,
    allowFailure: false, // Set to false by default, adjust if needed
    value: BigInt(tx.value ?? 0),
    callData: tx.data ?? '0x'
  }));

  const batchCallData = encodeFunctionData({
    abi: [{
      name: 'batchCall',
      type: 'function',
      inputs: [{ 
        type: 'tuple[]', 
        name: 'calls',
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'value', type: 'uint256' },
          { name: 'callData', type: 'bytes' }
        ]
      }],
      outputs: [],
    }],
    args: [calls],
  })

  // Get cumulative value passed in
  const totalValue = calls.reduce((sum, call) => sum + BigInt(call.value), BigInt(0));

  let batchTransaction;

  const isDeployed = await isSmartAccountDeployed(publicClient, client.account.address);
  if (!isDeployed) {
    const initialCall = {
      target: BATCH_CALLER_ADDRESS,
      allowFailure: false,
      value: totalValue,
      callData: batchCallData,
    } as Call;
  
    // Create calldata for initializing the proxy account
    const initializerCallData = encodeFunctionData({
      abi: [{
        name: 'initialize',
        type: 'function',
        inputs: [
          { name: 'initialK1Owner', type: 'address' },
          { name: 'initialK1Validator', type: 'address' },
          { name: 'modules', type: 'bytes[]' },
          {
            name: 'initCall',
            type: 'tuple',
            components: [
              { name: 'target', type: 'address' },
              { name: 'allowFailure', type: 'bool' },
              { name: 'value', type: 'uint256' },
              { name: 'callData', type: 'bytes' }
            ]
          }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      }],
      functionName: 'initialize',
      args: [
        signerClient.account!.address,
        validatorAddress,
        [],
        initialCall
      ]
    });

    const addressBytes = toBytes(signerClient.account!.address);
    const salt = keccak256(addressBytes);
    const deploymentCalldata = encodeFunctionData({
      abi: AccountFactoryAbi,
      functionName: 'deployAccount',
      args: [salt, initializerCallData]
    });

    batchTransaction = {
      to: SMART_ACCOUNT_FACTORY_ADDRESS,
      data: deploymentCalldata,
      value: totalValue,
      paymaster: parameters.paymaster,
      paymasterInput: parameters.paymasterInput,
      type: "eip712",
    } as any;

    return _sendTransaction(client, signerClient, publicClient, batchTransaction, validatorAddress, true);
  } else {
    batchTransaction = {
      to: BATCH_CALLER_ADDRESS as Hex,
      data: batchCallData,
      value: totalValue,
      paymaster: parameters.paymaster,
      paymasterInput: parameters.paymasterInput,
      type: "eip712",
    } as any;

    return _sendTransaction(client, signerClient, publicClient, batchTransaction, validatorAddress, false);
  }
}

export async function writeContract<
  chain extends Chain | undefined,
  account extends Account | undefined,
  const abi extends Abi | readonly unknown[],
  functionName extends ContractFunctionName<abi, 'nonpayable' | 'payable'>,
  args extends ContractFunctionArgs<
    abi,
    'nonpayable' | 'payable',
    functionName
  >,
  chainOverride extends Chain | undefined,
>(
  client: Client<Transport, ChainEIP712, Account>,
  signerClient: WalletClient<Transport, chain, account>,
  publicClient: PublicClient<Transport, chain>,
  parameters: WriteContractParameters<
    abi,
    functionName,
    args,
    chain,
    account,
    chainOverride
  >,
  validatorAddress: Hex,
): Promise<WriteContractReturnType> {
  const {
    abi,
    account: account_ = client.account,
    address,
    args,
    dataSuffix,
    functionName,
    ...request
  } = parameters as WriteContractParameters

  if (!account_)
    throw new AccountNotFoundError({
      docsPath: '/docs/contract/writeContract',
    })
  const account = parseAccount(account_)

  const data = encodeFunctionData({
    abi,
    args,
    functionName,
  } as EncodeFunctionDataParameters)

  try {
    return await sendTransaction(
      client,
      signerClient,
      publicClient,
      {
        data: `${data}${dataSuffix ? dataSuffix.replace('0x', '') : ''}`,
        to: address,
        account,
        ...request,
      },
      validatorAddress,
    );
  } catch (error) {
    throw getContractError(error as BaseError, {
      abi,
      address,
      args,
      docsPath: '/docs/contract/writeContract',
      functionName,
      sender: account.address,
    })
  }
}

export type AbstractWalletActions<
  chain extends Chain | undefined = Chain | undefined,
  account extends Account | undefined = Account | undefined,
> = Eip712WalletActions<chain, account> & {
  sendTransactionBatch: <const request extends SendTransactionRequest<chain, chainOverride>, chainOverride extends ChainEIP712 | undefined = undefined>(
    args: SendTransactionBatchParameters<chain, account, chainOverride, request>
  ) => Promise<SendTransactionReturnType>;
};

export function globalWalletActions<
  transport extends Transport,
  chain extends ChainEIP712 | undefined = ChainEIP712 | undefined,
  account extends Account | undefined = Account | undefined,
>(
  validatorAddress: Hex,
  signerClient: WalletClient<transport, chain, account>,
  publicClient: PublicClient<Transport, chain>,
) {
  return (
    client: Client<transport, ChainEIP712, Account>,
  ): AbstractWalletActions<chain, account> => ({
    sendTransaction: (args) => sendTransaction(client, signerClient, publicClient, args, validatorAddress),
    sendTransactionBatch: (args) => sendTransactionBatch(client, signerClient, publicClient, args, validatorAddress),
    signTransaction: (args) => signTransaction(client, signerClient, publicClient, args, validatorAddress),
    deployContract: (args) => deployContract(client, args), // TODO: update this
    writeContract: (args) =>
      writeContract(
        Object.assign(client, {
          sendTransaction: (args: any) => sendTransaction(client, signerClient, publicClient, args, validatorAddress),
        }),
        signerClient,
        publicClient,
        args,
        validatorAddress,
      ),
  })
}