import type { Address } from 'abitype'
import {
  Account,
  Client,
  Transport,
  Chain,
  Block,
  TransactionRequest,
  TransactionRequestEIP1559,
  TransactionRequestEIP2930,
  TransactionRequestEIP4844,
  TransactionRequestEIP7702,
  TransactionRequestLegacy,
  DeriveAccount,
  DeriveChain,
  GetChainParameter,
  GetTransactionRequestKzgParameter,
  ExactPartial,
  IsNever,
  Prettify,
  UnionOmit,
  UnionRequiredBy,
  FormattedTransactionRequest,
  NonceManager,
  SendTransactionParameters,
  BaseError,
  formatGwei,
  PublicClient
} from "viem";

import {
  ParseAccountErrorType,
} from "viem/accounts";

import {
  EstimateFeesPerGasErrorType,
  EstimateGasErrorType,
  EstimateGasParameters,
  estimateGas,
  GetBlockErrorType,
  GetTransactionCountErrorType,
  getTransactionCount,
  getChainId as getChainId_
} from "viem/actions";

import {
  AccountNotFoundErrorType
} from "viem/errors/account"

import {
  getAction,
  AssertRequestErrorType,
  assertRequest,
  GetTransactionType,
  parseAccount,
} from "viem/utils";

import {
  estimateFee,
  EstimateFeeParameters,
  ChainEIP712
} from "viem/zksync"

export type IsUndefined<T> = [undefined] extends [T] ? true : false

export const defaultParameters = [
  'blobVersionedHashes',
  'chainId',
  'fees',
  'gas',
  'nonce',
  'type',
] as const

export type AssertRequestParameters = ExactPartial<
  SendTransactionParameters<Chain>
>

export class Eip1559FeesNotSupportedError extends BaseError {
  constructor() {
    super('Chain does not support EIP-1559 fees.', {
      name: 'Eip1559FeesNotSupportedError',
    })
  }
}

export class MaxFeePerGasTooLowError extends BaseError {
  constructor({ maxPriorityFeePerGas }: { maxPriorityFeePerGas: bigint }) {
    super(
      `\`maxFeePerGas\` cannot be less than the \`maxPriorityFeePerGas\` (${formatGwei(
        maxPriorityFeePerGas,
      )} gwei).`,
      { name: 'MaxFeePerGasTooLowError' },
    )
  }
}

export type GetAccountParameter<
  account extends Account | undefined = Account | undefined,
  accountOverride extends Account | Address | undefined = Account | Address,
  required extends boolean = true,
> = IsUndefined<account> extends true
  ? required extends true
    ? { account: accountOverride | Account | Address }
    : { account?: accountOverride | Account | Address | undefined }
  : { account?: accountOverride | Account | Address | undefined }

export type PrepareTransactionRequestParameterType =
  | 'blobVersionedHashes'
  | 'chainId'
  | 'fees'
  | 'gas'
  | 'nonce'
  | 'sidecars'
  | 'type'
type ParameterTypeToParameters<
  parameterType extends PrepareTransactionRequestParameterType,
> = parameterType extends 'fees'
  ? 'maxFeePerGas' | 'maxPriorityFeePerGas' | 'gasPrice'
  : parameterType

export type PrepareTransactionRequestRequest<
  chain extends Chain | undefined = Chain | undefined,
  chainOverride extends Chain | undefined = Chain | undefined,
  ///
  _derivedChain extends Chain | undefined = DeriveChain<chain, chainOverride>,
> = UnionOmit<FormattedTransactionRequest<_derivedChain>, 'from'> &
  GetTransactionRequestKzgParameter & {
    /**
     * Nonce manager to use for the transaction request.
     */
    nonceManager?: NonceManager | undefined
    /**
     * Parameters to prepare for the transaction request.
     *
     * @default ['blobVersionedHashes', 'chainId', 'fees', 'gas', 'nonce', 'type']
     */
    parameters?: readonly PrepareTransactionRequestParameterType[] | undefined
  }

export type PrepareTransactionRequestParameters<
  chain extends Chain | undefined = Chain | undefined,
  account extends Account | undefined = Account | undefined,
  chainOverride extends Chain | undefined = Chain | undefined,
  accountOverride extends Account | Address | undefined =
    | Account
    | Address
    | undefined,
  request extends PrepareTransactionRequestRequest<
    chain,
    chainOverride
  > = PrepareTransactionRequestRequest<chain, chainOverride>,
> = request &
  GetAccountParameter<account, accountOverride, false> &
  GetChainParameter<chain, chainOverride> &
  GetTransactionRequestKzgParameter<request> & { chainId?: number | undefined }

export type PrepareTransactionRequestReturnType<
  chain extends Chain | undefined = Chain | undefined,
  account extends Account | undefined = Account | undefined,
  chainOverride extends Chain | undefined = Chain | undefined,
  accountOverride extends Account | Address | undefined =
    | Account
    | Address
    | undefined,
  request extends PrepareTransactionRequestRequest<
    chain,
    chainOverride
  > = PrepareTransactionRequestRequest<chain, chainOverride>,
  ///
  _derivedAccount extends Account | Address | undefined = DeriveAccount<
    account,
    accountOverride
  >,
  _derivedChain extends Chain | undefined = DeriveChain<chain, chainOverride>,
  _transactionType = request['type'] extends string | undefined
    ? request['type']
    : GetTransactionType<request> extends 'legacy'
      ? unknown
      : GetTransactionType<request>,
  _transactionRequest extends TransactionRequest =
    | (_transactionType extends 'legacy' ? TransactionRequestLegacy : never)
    | (_transactionType extends 'eip1559' ? TransactionRequestEIP1559 : never)
    | (_transactionType extends 'eip2930' ? TransactionRequestEIP2930 : never)
    | (_transactionType extends 'eip4844' ? TransactionRequestEIP4844 : never)
    | (_transactionType extends 'eip7702' ? TransactionRequestEIP7702 : never),
> = Prettify<
  UnionRequiredBy<
    Extract<
      UnionOmit<FormattedTransactionRequest<_derivedChain>, 'from'> &
        (_derivedChain extends Chain
          ? { chain: _derivedChain }
          : { chain?: undefined }) &
        (_derivedAccount extends Account
          ? { account: _derivedAccount; from: Address }
          : { account?: undefined; from?: undefined }),
      IsNever<_transactionRequest> extends true
        ? unknown
        : ExactPartial<_transactionRequest>
    > & { chainId?: number | undefined },
    ParameterTypeToParameters<
      request['parameters'] extends readonly PrepareTransactionRequestParameterType[]
        ? request['parameters'][number]
        : (typeof defaultParameters)[number]
    >
  > &
    (unknown extends request['kzg'] ? {} : Pick<request, 'kzg'>)
>

export type PrepareTransactionRequestErrorType =
  | AccountNotFoundErrorType
  | AssertRequestErrorType
  | ParseAccountErrorType
  | GetBlockErrorType
  | GetTransactionCountErrorType
  | EstimateGasErrorType
  | EstimateFeesPerGasErrorType


// async function internal_estimateFeesPerGas<
//   chain extends Chain | undefined,
//   chainOverride extends Chain | undefined,
//   type extends FeeValuesType = 'eip1559',
// >(
//   client: Client<Transport, chain>,
//   args: EstimateFeesPerGasParameters<chain, chainOverride, type> & {
//   block?: Block | undefined
//   request?: PrepareTransactionRequestParameters<Chain, Account> | undefined
//   },
// ): Promise<EstimateFeesPerGasReturnType<type>> {

// }

/**
 * Prepares a transaction request for signing.
 *
 * - Docs: https://viem.sh/docs/actions/wallet/prepareTransactionRequest
 *
 * @param args - {@link PrepareTransactionRequestParameters}
 * @returns The transaction request. {@link PrepareTransactionRequestReturnType}
 *
 * @example
 * import { createWalletClient, custom } from 'viem'
 * import { mainnet } from 'viem/chains'
 * import { prepareTransactionRequest } from 'viem/actions'
 *
 * const client = createWalletClient({
 *   chain: mainnet,
 *   transport: custom(window.ethereum),
 * })
 * const request = await prepareTransactionRequest(client, {
 *   account: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
 *   to: '0x0000000000000000000000000000000000000000',
 *   value: 1n,
 * })
 *
 * @example
 * // Account Hoisting
 * import { createWalletClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 * import { mainnet } from 'viem/chains'
 * import { prepareTransactionRequest } from 'viem/actions'
 *
 * const client = createWalletClient({
 *   account: privateKeyToAccount('0x…'),
 *   chain: mainnet,
 *   transport: custom(window.ethereum),
 * })
 * const request = await prepareTransactionRequest(client, {
 *   to: '0x0000000000000000000000000000000000000000',
 *   value: 1n,
 * })
 */
export async function prepareTransactionRequest<
  chain extends Chain,
  account extends Account | undefined,
  const request extends PrepareTransactionRequestRequest<chain, chainOverride>,
  accountOverride extends Account | Address | undefined = undefined,
  chainOverride extends Chain | undefined = undefined,
>(
  client: Client<Transport, chain, account>,
  publicClient: PublicClient<Transport, chain>,
  args: PrepareTransactionRequestParameters<
    chain,
    account,
    chainOverride,
    accountOverride,
    request
  >,
): Promise<
  PrepareTransactionRequestReturnType<
    chain,
    account,
    chainOverride,
    accountOverride,
    request
  >
> {
  const {
    account: account_ = client.account,
    chain,
    gas,
    nonce,
    nonceManager,
    parameters = defaultParameters,
  } = args
  const smartAccount = account_ ? parseAccount(account_) : undefined

  const request = { ...args, ...(smartAccount ? { from: smartAccount?.address } : {}) }

  let chainId: number | undefined
  async function getChainId(): Promise<number> {
    if (chainId) return chainId
    if (chain) return chain.id
    if (typeof args.chainId !== 'undefined') return args.chainId
    const chainId_ = await getAction(client, getChainId_, 'getChainId')({})
    chainId = chainId_
    return chainId
  }

  if (parameters.includes('chainId')) request.chainId = await getChainId()

  if (parameters.includes('nonce') && typeof nonce === 'undefined' && smartAccount) {
    if (nonceManager) {
      const chainId = await getChainId()
      request.nonce = await nonceManager.consume({
        address: smartAccount.address,
        chainId,
        client,
      })
    } else {
      request.nonce = await getAction(
        publicClient,  // The public client is more reliable for fetching the latest nonce
        getTransactionCount,
        'getTransactionCount',
      )({
        address: smartAccount.address,
        blockTag: 'pending',
      })
    }
  }

  if (parameters.includes('fees')) {
    if (
      typeof request.maxFeePerGas === 'undefined' ||
      typeof request.maxPriorityFeePerGas === 'undefined'
    ) {
      const estimateFeeRequest: EstimateFeeParameters<chain, account | undefined, ChainEIP712> = {
        account: smartAccount,
        to: request.to,
        value: request.value,
        data: request.data,
        gas: request.gas,
        nonce: request.nonce,
        chainId: request.chainId,
        authorizationList: []
      };
      const { maxFeePerGas, maxPriorityFeePerGas } =
        await estimateFee(publicClient, estimateFeeRequest)

      if (
        typeof args.maxPriorityFeePerGas === 'undefined' &&
        args.maxFeePerGas &&
        args.maxFeePerGas < maxPriorityFeePerGas
      )
        throw new MaxFeePerGasTooLowError({
          maxPriorityFeePerGas,
        })

      request.maxPriorityFeePerGas = maxPriorityFeePerGas
      request.maxFeePerGas = maxFeePerGas
    }
  }

  if (parameters.includes('gas') && typeof gas === 'undefined')
    request.gas = await getAction(
      client,
      estimateGas,
      'estimateGas',
    )({
      ...request,
      account: smartAccount
        ? { address: smartAccount.address, type: 'json-rpc' }
        : undefined,
    } as EstimateGasParameters)

  assertRequest(request as AssertRequestParameters)

  delete request.parameters

  return request as any
}
