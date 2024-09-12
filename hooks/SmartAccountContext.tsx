import React, { useState, useEffect, useContext } from "react";
import { Hex, Account } from "viem";
import { abstractTestnet } from "viem/chains";
import { createAbstractClient, AbstractClient} from "@abstract-foundation/agw-sdk";
import { useAbstractGlobalWallet } from "./useAbstractGlobalWallet";

/** Interface returned by custom `useSmartAccount` hook */
interface SmartAccountInterface {
  /** Privy embedded wallet, used as a signer for the smart account */
  eoa: Account | undefined;
  /** Smart account client to send signature/transaction requests to the smart account */
  smartAccountClient:
    | AbstractClient
    | undefined;
  /** Smart account address */
  smartAccountAddress: Hex | undefined;
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
  const { account } = useAbstractGlobalWallet();
  
  // States to store the smart account and its status
  const [eoa, setEoa] = useState<Account | undefined>();
  const [smartAccountClient, setSmartAccountClient] = useState<
    | AbstractClient
    | undefined
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
        chain: abstractTestnet
      })

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
        eoa: eoa,
      }}
    >
      {children}
    </SmartAccountContext.Provider>
  );
};
