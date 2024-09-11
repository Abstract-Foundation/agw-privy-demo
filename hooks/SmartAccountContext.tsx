import React, { useState, useEffect, useContext } from "react";
import { ConnectedWallet, useWallets } from "@privy-io/react-auth";
import { Hex, Account } from "viem";
import { abstractTestnet } from "viem/chains";
import { createAbstractClient, AbstractClient} from "../lib/abstractClient";
import { useLoginWithAbstract } from "./usePrivyCrossAppAccount";

/** Interface returned by custom `useSmartAccount` hook */
interface SmartAccountInterface {
  /** Privy embedded wallet, used as a signer for the smart account */
  eoa: ConnectedWallet | undefined;
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
  // Get a list of all of the wallets (EOAs) the user has connected to your site
  const { wallets } = useWallets();

  const { account, ready } = useLoginWithAbstract();
  
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

      //const eip1193provider = await eoa.getEthereumProvider();
      console.log(eoa)

      // const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      // const address = getAddress(accounts[0]!);
      // const browserWalletClient = createWalletClient({
      //   account: address,
      //   chain: abstractTestnet,
      //   transport: custom(window.ethereum),
      // }).extend(eip712WalletActions());
      const smartAccountClient = await createAbstractClient({
        signer: eoa,
        chain: abstractTestnet
      })

      console.log(smartAccountClient)

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
