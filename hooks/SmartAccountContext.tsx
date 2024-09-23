import React, { useState, useEffect, useContext, useMemo } from "react";
import { Hex, EIP1193Provider, createWalletClient, custom } from "viem";
import { abstractTestnet } from "viem/chains";
import {
  createAbstractClient,
  AbstractClient,
} from "@abstract-foundation/agw-sdk";
import { toPrivyWalletProvider } from "@privy-io/cross-app-connect";

/** Interface returned by custom `useSmartAccount` hook */
interface SmartAccountInterface {
  /** Privy embedded wallet, used as a signer for the smart account */
  eoa: EIP1193Provider | undefined;
  /** Smart account client to send signature/transaction requests to the smart account */
  smartAccountClient: AbstractClient | undefined;
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
  // States to store the smart account and its status
  const eoa = useMemo(() => {
    return toPrivyWalletProvider({
      providerAppId: "cm04asygd041fmry9zmcyn5o5",
      chains: [abstractTestnet],
    });
  }, []);

  const [signer, setSigner] = useState<Hex>();

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
    const createSmartWallet = async () => {
      console.log(eoa);
      const res = await eoa.request({
        method: "eth_requestAccounts",
      });
      const [address] = res;
      setSigner(address);
      const signerClient = createWalletClient({
        account: address,
        chain: abstractTestnet,
        transport: custom(eoa),
      });
      const smartAccountClient = await createAbstractClient({
        signer: signerClient.account!,
        chain: abstractTestnet,
        transport: custom(eoa),
      });
      setSmartAccountClient(smartAccountClient);
      setSmartAccountAddress(smartAccountClient.account.address);
      setSmartAccountReady(true);
    };
    if (!smartAccountAddress && eoa) void createSmartWallet();
  }, [signer, smartAccountAddress, eoa]);

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

const Button = ({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      boxShadow:
        "0px 0px 0px 1px rgba(0, 0, 0, 0.05), 0px 6px 10px -4px rgba(0, 0, 0, 0.12)",
    }}
    className="z-10 flex flex-row items-center justify-center gap-2 bg-[#fcfcfc] py-3 px-4  rounded-[100px] hover:bg-slate-50 transition-all hover:scale-[.985] active:scale-[.970]  hover:text-gray-700   duration-200"
  >
    {children}
  </button>
);
