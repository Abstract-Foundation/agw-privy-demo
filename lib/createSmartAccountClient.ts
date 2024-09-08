import { 
  createWalletClient,
  createClient,
  custom,
  Transport,
  Account,
  Hex,
  EIP1193Provider,
  Client,
  createPublicClient,
  http,
} from 'viem';
import { ChainEIP712 } from 'viem/zksync';
import { globalWalletActions, AbstractWalletActions } from './actions';

type CreateAbstractClientParameters = {
  smartAccountAddress: Hex;
  signerAddress: Hex;
  validatorAddress: Hex;
  eip1193Provider: EIP1193Provider;
  chain: ChainEIP712;
};

type AbstractClientActions = AbstractWalletActions<ChainEIP712, Account>;

export type AbstractClient<
  TTransport extends Transport = Transport,
  TAccount extends Account = Account
> = Client<TTransport, ChainEIP712, TAccount> & AbstractClientActions;

export function createAbstractClient<
  TTransport extends Transport,
>(
  parameters: CreateAbstractClientParameters
): AbstractClient<TTransport> {
  const { smartAccountAddress, validatorAddress, signerAddress, eip1193Provider, chain } = parameters;
  const transport = custom(eip1193Provider);

  const baseClient = createClient({
    account: smartAccountAddress,
    chain: chain,
    transport,
  });

  // Create a signer wallet client to handle actual signing
  const signerWalletClient = createWalletClient({
    account: signerAddress,
    chain: chain,
    transport: custom(eip1193Provider)
  });

  // Create public client for reading contract code
  const publicClient = createPublicClient({
    chain: chain,
    transport: http()
  })

  const abstractClient = baseClient.extend(globalWalletActions(validatorAddress, signerWalletClient, publicClient));
  return abstractClient as AbstractClient<TTransport>;
}
