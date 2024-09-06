import { 
  createWalletClient,
  createClient,
  custom,
  Transport,
  Chain,
  Account,
  Hex,
  EIP1193Provider,
  Client,
} from 'viem';
import { ChainEIP712, Eip712WalletActions } from 'viem/zksync';
import { globalWalletActions } from './actions';

type AbstractClientConfig = {
  smartAccountAddress: `0x${string}`;
  signerAddress: Hex;
  validatorAddress: `0x${string}`;
  eip1193Provider: EIP1193Provider;
  chain: ChainEIP712;
};

type AbstractClientActions<TChain extends Chain | undefined = Chain | undefined> = 
  Eip712WalletActions<TChain>;

export type AbstractClient<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TAccount extends Account = Account
> = Client<TTransport, TChain, TAccount> & AbstractClientActions<TChain>;

// TODO: add parameter checking - smartAccountAddress should be valid
export function createAbstractClient<
  TTransport extends Transport,
>(
  parameters: AbstractClientConfig
): AbstractClient<TTransport, ChainEIP712> {
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

  const abstractClient = baseClient.extend(globalWalletActions(validatorAddress, signerWalletClient));
  return abstractClient as AbstractClient<TTransport, ChainEIP712>;
}
