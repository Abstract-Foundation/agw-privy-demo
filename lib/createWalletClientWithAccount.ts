import {
  Account,
  Chain,
  createPublicClient,
  createWalletClient,
  custom,
  Hex,
  http,
  RpcSchema,
  Transport,
  WalletClient,
} from "viem";
import { ConnectedWallet } from "@privy-io/react-auth";
import { abstractTestnet } from "viem/chains";
import {
  eip712WalletActions,
  toSmartAccount,
  ZksyncSmartAccount,
} from "viem/zksync";

const testnetRpcUrl = "https://api.testnet.abs.xyz";

/**
 * Creates a smart contract account from a deployed contract address.
 * @param contractAddress - The address of the deployed smart contract account
 * @param signerWallet - The Privy EOA (who is the initial k1 signer)
 */
export function createSmartContractAccount(
  contractAddress: Hex,
  signerWallet: ConnectedWallet
): ZksyncSmartAccount {
  return toSmartAccount({
    address: contractAddress, // The address of the deployed smart contract account
    async sign({ hash }) {
      // The Privy EOA (who is the initial k1 signer) signs msgs/txs
      const result = await signerWallet.sign(hash);
      return result as Hex;
    },
  });
}

export type SmartContractClient = WalletClient<
  Transport,
  Chain | undefined,
  Account | undefined,
  RpcSchema
>;

/**
 * Creates a viem client with a smart contract account.
 * @param smartAccount - the  smart account from viem toSmartAccount
 */
export function createSmartContractWalletClient(
  smartAccount: ZksyncSmartAccount
) {
  return createWalletClient({
    account: smartAccount, // Use the smart contract account
    chain: abstractTestnet,
    transport: http(testnetRpcUrl),
  }).extend(eip712WalletActions());
}

/**
 * Creates a viem client with an EOA account from Privy.
 * Uses that EOA account to sign transactions.
 * @param eoa - The ConnectedWallet instance from Privy
 */
export async function createEoaWalletClient(eoa: ConnectedWallet) {
  const eip1193provider = await eoa.getEthereumProvider();

  return createWalletClient({
    account: eoa.address as Hex,
    chain: abstractTestnet,
    transport: custom(eip1193provider),
  }).extend(eip712WalletActions());
}

export function createNoWalletClient() {
  return createPublicClient({
    chain: abstractTestnet,
    transport: http(testnetRpcUrl),
  }).extend(eip712WalletActions());
}
