import React, { useState, useEffect, useContext } from "react";
import { ConnectedWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { Account, createPublicClient, createWalletClient, custom, WalletClient, CustomTransport } from "viem";
import { abstractTestnet } from "viem/chains";
import { Chain, Transport } from "viem";
import { eip712WalletActions } from 'viem/zksync'
import { deployAccount } from '../lib/deployAccount';

/** Interface returned by custom `useSmartAccount` hook */
interface SmartAccountInterface {
  /** Privy embedded wallet, used as a signer for the smart account */
  eoa: ConnectedWallet | undefined;
  /** Smart account client to send signature/transaction requests to the smart account */
  smartAccountClient:
    | WalletClient<CustomTransport, Chain, Account>
    | undefined;
  /** Smart account address */
  smartAccountAddress: `0x${string}` | undefined;
  /** Boolean to indicate whether the smart account state has initialized */
  smartAccountReady: boolean;
}

const SmartAccountContext = React.createContext<SmartAccountInterface>({
  eoa: undefined,
  smartAccountClient: undefined,
  smartAccountAddress: undefined,
  smartAccountReady: false,
});

export const useSmartAccount = () => {
  return useContext(SmartAccountContext);
};

export const SmartAccountProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Get a list of all of the wallets (EOAs) the user has connected to your site
  const { wallets } = useWallets();
  const {ready} = usePrivy();
  // Find the embedded wallet by finding the entry in the list with a `walletClientType` of 'privy'
  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy"
  );

  // States to store the smart account and its status
  const [eoa, setEoa] = useState<ConnectedWallet | undefined>();
  const [smartAccountClient, setSmartAccountClient] = useState<
    | WalletClient<CustomTransport, Chain, Account>
    | undefined
  >();
  const [smartAccountAddress, setSmartAccountAddress] = useState<
    `0x${string}` | undefined
  >();
  const [smartAccountReady, setSmartAccountReady] = useState(false);

  useEffect(() => {
    if (!ready) return;
  }, [ready, embeddedWallet]);

  useEffect(() => {
    // Creates a smart account given a Privy `ConnectedWallet` object representing
    // the  user's EOA.
    const createSmartWallet = async (eoa: ConnectedWallet) => {
      setEoa(eoa);

      const eip1193provider = await eoa.getEthereumProvider();
      const smartAccountClient = createWalletClient({
        account: eoa.address as `0x${string}`,
        chain: abstractTestnet,
        transport: custom(eip1193provider),
      }).extend(eip712WalletActions());

      const smartAccountAddress = await deployAccount(smartAccountClient);

      setSmartAccountClient(smartAccountClient);
      setSmartAccountAddress(smartAccountAddress);
      setSmartAccountReady(true);
    };

    if (embeddedWallet) createSmartWallet(embeddedWallet);
  }, [embeddedWallet?.address]);

  return (
    <SmartAccountContext.Provider
      value={{
        smartAccountReady: smartAccountReady,
        smartAccountClient: smartAccountClient,
        smartAccountAddress: smartAccountAddress,
        eoa: eoa,
      }}
    >
      {children}
    </SmartAccountContext.Provider>
  );
};
