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
import { abstractTestnet } from 'viem/chains';
import { eip712WalletActions, Eip712WalletActions } from 'viem/zksync';
import { customActions } from './actions';

type AbstractClientConfig = {
  smartAccountAddress: `0x${string}`;
  signerAddress: Hex;
  validatorAddress: `0x${string}`;
  eip1193Provider: EIP1193Provider;
};

type AbstractClientActions<TChain extends Chain | undefined = Chain | undefined> = 
  Eip712WalletActions<TChain>;

export type AbstractClient<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TAccount extends Account = Account
> = Client<TTransport, TChain, TAccount> & AbstractClientActions<TChain>;

export function createAbstractClient<
  TTransport extends Transport,
>(
  parameters: AbstractClientConfig
): AbstractClient<TTransport, typeof abstractTestnet> {
  const { smartAccountAddress, validatorAddress, signerAddress, eip1193Provider } = parameters;
  const transport = custom(eip1193Provider);

  const baseClient = createClient({
    account: smartAccountAddress,
    chain: abstractTestnet,
    transport,
  });

  // Create a signer wallet client to handle actual signing
  const signerWalletClient = createWalletClient({
    account: signerAddress,
    chain: abstractTestnet,
    transport: custom(eip1193Provider)
  }).extend(eip712WalletActions());

  const abstractClient = baseClient.extend(customActions(validatorAddress, signerWalletClient));
  return abstractClient as AbstractClient<TTransport, typeof abstractTestnet>;
}
