import React, { useState, useEffect, useContext } from "react";
import { Hex, Account, Chain } from "viem";
import { abstractTestnet } from "viem/chains";
import {
  createAbstractClient,
  AbstractClient,
} from "@abstract-foundation/agw-sdk";
import { useAbstractGlobalWallet } from "./useAbstractGlobalWallet";
import { PrivyProvider } from "@privy-io/react-auth";

/** Interface returned by custom `useSmartAccount` hook */
interface SmartAccountInterface {
  /** Privy embedded wallet, used as a signer for the smart account */
  signer: Account | undefined;
  /** Smart account client to send signature/transaction requests to the smart account */
  smartAccountClient: AbstractClient | undefined;
  /** Smart account address */
  smartAccountAddress: `0x${string}` | undefined;
  /** Boolean to indicate whether the smart account state has initialized */
  smartAccountReady: boolean;
}

const SmartAccountContext = React.createContext<SmartAccountInterface>({
  signer: undefined,
  smartAccountClient: undefined,
  smartAccountAddress: undefined,
  smartAccountReady: false,
});

export const useSmartAccount = () => {
  return useContext(SmartAccountContext);
};

interface AbstractWalletProviderProps {
  appId: string;
  defaultChain: Chain;
  supportedChains: Chain[];
  children: React.ReactNode;
}

const SmartAccountProvider = ({ children }: { children: React.ReactNode }) => {
  const { account } = useAbstractGlobalWallet();

  // States to store the smart account and its status
  const [eoa, setEoa] = useState<Account | undefined>();
  const [smartAccountClient, setSmartAccountClient] = useState<
    AbstractClient | undefined
  >();
  const [smartAccountAddress, setSmartAccountAddress] = useState<
    Hex | undefined
  >();
  const [smartAccountReady, setSmartAccountReady] = useState(false);

  useEffect(() => {
    // Creates a smart account given a Privy `ConnectedWallet` object representing
    // the user's EOA.
    const createSmartWallet = async (eoa: Account) => {
      setEoa(eoa);

      const smartAccountClient = await createAbstractClient({
        signer: eoa,
        chain: abstractTestnet,
      });

      setSmartAccountClient(smartAccountClient);
      setSmartAccountAddress(smartAccountClient.account.address);
      setSmartAccountReady(true);
    };

    if (account) createSmartWallet(account);
  }, [account]);

  return (
    <SmartAccountContext.Provider
      value={{
        smartAccountReady: smartAccountReady,
        smartAccountClient: smartAccountClient,
        smartAccountAddress: smartAccountAddress,
        signer: eoa,
      }}
    >
      {children}
    </SmartAccountContext.Provider>
  );
};

export const AbstractWalletProvider = ({
  appId,
  defaultChain,
  supportedChains,
  children,
}: AbstractWalletProviderProps) => {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        // @ts-ignore
        embeddedWallets: {
          createOnLogin: "off",
          noPromptOnSignature: true,
        },
        defaultChain: defaultChain,
        supportedChains: supportedChains,
      }}
    >
      <SmartAccountProvider>{children}</SmartAccountProvider>
    </PrivyProvider>
  );
};
