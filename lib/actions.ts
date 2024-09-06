import {
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
  createPublicClient,
  http,
  ContractFunctionArgs,
  ContractFunctionName,
  WriteContractParameters,
  WriteContractReturnType,
  EncodeFunctionDataParameters,
  encodeFunctionData,
  Abi,
} from "viem";
import {
  abstractTestnet,
} from "viem/chains";
import {
  signTransaction as signTransaction_,
  sendTransaction as core_sendTransaction,
  SendTransactionParameters as core_SendTransactionParameters,
  signTypedData,
  getChainId,
  sendRawTransaction
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
  Eip712WalletActions,
  deployContract,
  SignEip712TransactionReturnType,
  ZksyncTransactionRequest,
  ZksyncTransactionSerializable,
  SignTransactionParameters,
  SignTransactionReturnType,
  SignEip712TransactionParameters,
  SendEip712TransactionParameters,
  SendEip712TransactionReturnType,
} from "viem/zksync";
import {prepareTransactionRequest} from "./prepareTransaction";

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

export async function signEip712Transaction<
  chain extends ChainEIP712 | undefined = ChainEIP712 | undefined,
  account extends Account | undefined = Account | undefined,
  chainOverride extends ChainEIP712 | undefined = ChainEIP712 | undefined,
>(
  client: Client<Transport, ChainEIP712, Account>,
  signerClient: WalletClient<Transport, chain, account>,
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

export async function signTransaction<
  chain extends ChainEIP712 | undefined = ChainEIP712 | undefined,
  account extends Account | undefined = Account | undefined,
  chainOverride extends ChainEIP712 | undefined = ChainEIP712 | undefined,
>(
  client: Client<Transport, ChainEIP712, Account>,
  signerClient: WalletClient<Transport, chain, account>,
  args: SignTransactionParameters<chain, account, chainOverride>,
  validatorAddress: Hex,
): Promise<SignTransactionReturnType> {
  if (isEIP712Transaction(args)) return signEip712Transaction(client, signerClient, args, validatorAddress)
  return await signTransaction_(client, args as any)
}

export async function sendEip712Transaction<
  const request extends SendTransactionRequest<chain, chainOverride>,
  chain extends ChainEIP712 | undefined = ChainEIP712 | undefined,
  account extends Account | undefined = Account | undefined,
  chainOverride extends ChainEIP712 | undefined = ChainEIP712 | undefined,
>(
  client: Client<Transport, ChainEIP712, Account>,
  signerClient: WalletClient<Transport, chain, account>,
  parameters: SendEip712TransactionParameters<
    chain,
    account,
    chainOverride,
    request
  >,
  validatorAddress: Hex,
): Promise<SendEip712TransactionReturnType> {
  const { chain = client.chain } = parameters

  if (!signerClient.account)
    throw new AccountNotFoundError({
      docsPath: '/docs/actions/wallet/sendTransaction',
    })
  const account = parseAccount(signerClient.account)

  const publicClient = createPublicClient({
    chain: chain!,
    transport: http(),
  });

  try {
    assertEip712Request(parameters)

    // Prepare the request for signing (assign appropriate fees, etc.)
    const request = await prepareTransactionRequest(client, publicClient, {
      ...parameters,
      parameters: ['gas', 'nonce', 'fees'],
    } as any)

    let chainId: number | undefined
    if (chain !== null) {
      chainId = await getAction(signerClient, getChainId, 'getChainId')({})
      assertCurrentChain({
        currentChainId: chainId,
        chain,
      })
    }

    const serializedTransaction = await signTransaction(client, signerClient, {
      ...request,
      chainId,
    } as any, validatorAddress)

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

export async function sendTransaction<
  const request extends SendTransactionRequest<chain, chainOverride>,
  chain extends ChainEIP712 | undefined = ChainEIP712 | undefined,
  account extends Account | undefined = Account | undefined,
  chainOverride extends ChainEIP712 | undefined = ChainEIP712 | undefined,
>(
  client: Client<Transport, ChainEIP712, Account>,
  signerClient: WalletClient<Transport, chain, account>,
  parameters: SendTransactionParameters<chain, account, chainOverride, request>,
  validatorAddress: Hex,
): Promise<SendTransactionReturnType> {
  if (isEIP712Transaction(parameters))
    return sendEip712Transaction(
      client,
      signerClient,
      parameters as SendEip712TransactionParameters,
      validatorAddress,
    )
  return core_sendTransaction(
    client,
    parameters as core_SendTransactionParameters,
  )
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

export function globalWalletActions<
  transport extends Transport,
  chain extends ChainEIP712 | undefined = ChainEIP712 | undefined,
  account extends Account | undefined = Account | undefined,
>(
  validatorAddress: Hex,
  signerClient: WalletClient<transport, chain, account>,
) {
  return (
    client: Client<transport, ChainEIP712, Account>,
  ): Eip712WalletActions<chain, account> => ({
    sendTransaction: (args) => sendTransaction(client, signerClient, args, validatorAddress),
    signTransaction: (args) => signTransaction(client, signerClient, args, validatorAddress),
    deployContract: (args) => deployContract(client, args),
    writeContract: (args) =>
      writeContract(
        Object.assign(client, {
          sendTransaction: (args: any) => sendTransaction(client, signerClient, args, validatorAddress),
        }),
        signerClient,
        args,
        validatorAddress,
      ),
  })
}