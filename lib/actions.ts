import {
  Transport,
  Account,
  Client,
  WalletClient,
  Hex,
  hashTypedData,
  encodeAbiParameters,
  parseAbiParameters,
  serializeTransaction,
  ExactPartial,
  OneOf,
  Address,
  SendTransactionRequest,
  SendTransactionParameters,
  SendTransactionReturnType,
} from "viem";
import {
  abstractTestnet,
  zksync
} from "viem/chains";
import {
  AccountNotFoundError
} from "viem/errors/account";
import {
  writeContract,
  signTransaction as signTransaction_,
  signTypedData,
  getChainId
} from "viem/actions";
import {
  parseAccount,
  assertRequest,
  getAction,
  assertCurrentChain
} from "viem/utils"
import {
  BaseError
} from "viem/errors/base"
import {
  ChainEIP712,
  Eip712WalletActions,
  sendTransaction,
  deployContract,
  SignEip712TransactionReturnType,
  ZksyncTransactionRequest,
  ZksyncTransactionSerializable,
  // ZksyncTransactionSerializableEIP712,
  SignTransactionParameters,
  SignTransactionReturnType,
  SignEip712TransactionParameters,
  // signEip712Transaction
} from "viem/zksync";
import {
  InvalidEip712TransactionError
} from "viem/zksync/errors/transaction"


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
  SendTransactionParameters<typeof zksync>
>

export async function signEip712Transaction<
  chain extends ChainEIP712 | undefined,
  account extends Account | undefined,
  chainOverride extends ChainEIP712 | undefined,
>(
  client: Client<Transport, chain, account>,
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
  const account = parseAccount(account_)

  assertEip712Request({
    account,
    chain,
    ...(args as AssertEip712RequestParameters),
  })

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
    from: account.address,
    type: 'eip712',
  })

  const customSignature = await signTypedData(client, {
    ...eip712Domain,
    account,
  })

  return chain?.serializers?.transaction(
    {
      chainId,
      ...transaction,
      customSignature,
      type: 'eip712' as any,
    },
    { r: '0x0', s: '0x0', v: 0n },
  ) as SignEip712TransactionReturnType
}

export async function signTransaction<
  chain extends ChainEIP712 | undefined,
  account extends Account | undefined,
  chainOverride extends ChainEIP712 | undefined,
>(
  client: Client<Transport, chain, account>,
  args: SignTransactionParameters<chain, account, chainOverride>,
): Promise<SignTransactionReturnType> {
  if (isEIP712Transaction(args)) return signEip712Transaction(client, args)
  return await signTransaction_(client, args as any)
}

export function customActions() {
  return <
    transport extends Transport,
    chain extends ChainEIP712 | undefined = ChainEIP712 | undefined,
    account extends Account | undefined = Account | undefined,
  >(
    client: Client<transport, chain, account>,
  ): Eip712WalletActions<chain, account> => ({
    sendTransaction: (args) => sendTransaction(client, args),
    signTransaction: (args) => signTransaction(client, args),
    deployContract: (args) => deployContract(client, args),
    writeContract: (args) =>
      writeContract(
        Object.assign(client, {
          sendTransaction: (args: any) => sendTransaction(client, args),
        }),
        args,
      ),
  })
}