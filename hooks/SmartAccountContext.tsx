import React, { useState, useEffect, useContext } from "react";
import { ConnectedWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, EIP1193Provider, Hex, createPublicClient, http } from "viem";
import { abstractTestnet } from "viem/chains";
import { VALIDATOR_ADDRESS } from '../lib/constants';
import { createAbstractClient, AbstractClient, getSmartAccountAddressFromInitialSigner } from "@abstract-foundation/agw-sdk";
import { eip712WalletActions } from "viem/zksync";

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
  const { ready } = usePrivy();
  // Find the embedded wallet by finding the entry in the list with a `walletClientType` of 'privy'
  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy"
  );

  // States to store the smart account and its status
  const [eoa, setEoa] = useState<ConnectedWallet | undefined>();
  const [smartAccountClient, setSmartAccountClient] = useState<
    | AbstractClient
    | undefined
  >();
  const [smartAccountAddress, setSmartAccountAddress] = useState<
    Hex | undefined
  >();
  const [smartAccountReady, setSmartAccountReady] = useState(false);

  useEffect(() => {
    if (!ready) return;
  }, [ready, embeddedWallet]);

  useEffect(() => {
    // Creates a smart account given a Privy `ConnectedWallet` object representing
    // the user's EOA.
    const createSmartWallet = async (eoa: ConnectedWallet) => {
      setEoa(eoa);

      const eip1193provider = await eoa.getEthereumProvider();
      const embeddedWalletClient = createWalletClient({
        account: eoa.address as Hex,
        chain: abstractTestnet,
        transport: custom(eip1193provider),
      }).extend(eip712WalletActions());

      const publicClient = createPublicClient({
        chain: abstractTestnet,
        transport: http()
      })

      // const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      // const address = getAddress(accounts[0]!);
      // const browserWalletClient = createWalletClient({
      //   account: address,
      //   chain: abstractTestnet,
      //   transport: custom(window.ethereum),
      // }).extend(eip712WalletActions());

      const smartAccountAddress = await getSmartAccountAddressFromInitialSigner(embeddedWalletClient.account.address, publicClient);

      const smartAccountClient = createAbstractClient({
        smartAccountAddress: smartAccountAddress,
        signerAddress: eoa.address as Hex,
        validatorAddress: VALIDATOR_ADDRESS,
        eip1193Provider: eip1193provider as EIP1193Provider,
        chain: abstractTestnet
      })

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
