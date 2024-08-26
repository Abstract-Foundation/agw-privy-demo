import React, { useState, useEffect, useContext } from "react";
import { ConnectedWallet, useWallets } from "@privy-io/react-auth";
import { deployAccount } from '../lib/deployAccount';
import { createSmartContractAccount, createSmartContractWalletClient, SmartContractClient } from "../lib/createWalletClientWithAccount";
import { ZksyncSmartAccount } from "viem/zksync";

/** Interface returned by custom `useSmartAccount` hook */
interface SmartAccountInterface {
  /** Privy embedded wallet, used as a signer for the smart account */
  eoa: ConnectedWallet | undefined;
  /** Smart account instance */
  smartAccount: ZksyncSmartAccount | undefined;
  /** Smart account client to send signature/transaction requests to the smart account */
  smartAccountClient: SmartContractClient |  undefined;
  /** Smart account address */
  smartAccountAddress: `0x${string}` | undefined;
  /** Boolean to indicate whether the smart account state has initialized */
  smartAccountReady: boolean;
}

const SmartAccountContext = React.createContext<SmartAccountInterface>({
  eoa: undefined,
  smartAccount: undefined,
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
  // Find the embedded wallet by finding the entry in the list with a `walletClientType` of 'privy'
  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy"
  );

  // States to store the smart account and its status
  const [eoa, setEoa] = useState<ConnectedWallet>();
  const [smartAccountAddress, setSmartAccountAddress] = useState<
    `0x${string}` | undefined
  >();
  const [smartAccount, setSmartAccount] = useState<ZksyncSmartAccount>();
  const [smartAccountClient, setSmartAccountClient] = useState<SmartContractClient>();
  const [smartAccountReady, setSmartAccountReady] = useState(false);

  useEffect(() => {
    // Deploy a smart contract wallet from the Privy EOA (sponsored by paymaster)
    const createSmartWallet = async (connectedEoa: ConnectedWallet) => {
      // What EOA is the signer for the smart account
      setEoa(connectedEoa); 

      // Deploy a smart contract account from that EOA
      const scAccountAddress = await deployAccount(connectedEoa);

      // Once deployed, setup a Viem client with the smart account which uses the EOA to sign
      const scAccount = createSmartContractAccount(scAccountAddress, connectedEoa);
      const scAccountClient = createSmartContractWalletClient(scAccount);

      // Set the smart account state
      setSmartAccount(scAccount);
      setSmartAccountClient(scAccountClient);
      setSmartAccountAddress(scAccountAddress);
      setSmartAccountReady(true);
    };

    if (embeddedWallet) createSmartWallet(embeddedWallet);
  }, [embeddedWallet?.address]);

  return (
    <SmartAccountContext.Provider
      value={{
        eoa: eoa,
        smartAccount: smartAccount,
        smartAccountReady: smartAccountReady,
        smartAccountClient: smartAccountClient,
        smartAccountAddress: smartAccountAddress,
      }}
    >
      {children}
    </SmartAccountContext.Provider>
  );
};
