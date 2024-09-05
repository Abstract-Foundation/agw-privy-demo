import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { /*useLinkWithSiwe,*/ usePrivy } from "@privy-io/react-auth";
import Head from "next/head";
import { useSmartAccount } from "../hooks/SmartAccountContext";
import {
  ABS_SEPOLIA_SCAN_URL,
  NFT_ADDRESS,
  NFT_PAYMASTER_ADDRESS,
} from "../lib/constants";
import { encodeFunctionData } from "viem";
import ABI from "../lib/nftABI.json";
import { ToastContainer, toast } from "react-toastify";
import { Alert } from "../components/AlertWithLink";
import { abstractTestnet } from "viem/chains";
import { getGeneralPaymasterInput } from "viem/zksync";

export default function DashboardPage() {
  const router = useRouter();
  const { ready, authenticated, user, logout } = usePrivy();
  // const {generateSiweMessage, linkWithSiwe} = useLinkWithSiwe();
  const { smartAccountAddress, smartAccountClient, eoa } = useSmartAccount();

  // If the user is not authenticated, redirect them back to the landing page
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  const isLoading = !smartAccountAddress || !smartAccountClient;
  const [isMinting, setIsMinting] = useState(false);

  const onMint = async () => {
    // The mint button is disabled if either of these are undefined
    if (!smartAccountClient || !smartAccountAddress) return;

    // Store a state to disable the mint button while mint is in progress
    setIsMinting(true);
    const toastId = toast.loading("Minting...");

    try {
      const mintData = encodeFunctionData({
        abi: ABI,
        functionName: "mint",
        args: [smartAccountAddress, 1],
      });
      const paymasterInput = getGeneralPaymasterInput({
        innerInput: "0x",
      });

      // TODO: figure out account hoisting
      const transactionHash = await smartAccountClient.sendTransaction({
        account: smartAccountClient.account,
        chain: abstractTestnet,
        to: NFT_ADDRESS,
        data: mintData,
        paymaster: NFT_PAYMASTER_ADDRESS,
        paymasterInput: paymasterInput,
      });

      toast.update(toastId, {
        render: "Waiting for your transaction to be confirmed...",
        type: "info",
        isLoading: true,
      });

      toast.update(toastId, {
        render: (
          <Alert href={`${ABS_SEPOLIA_SCAN_URL}/tx/${transactionHash}`}>
            Successfully minted! Click here to see your transaction.
          </Alert>
        ),
        type: "success",
        isLoading: false,
        autoClose: 5000,
      });
    } catch (error) {
      console.error("Mint failed with error: ", error);
      toast.update(toastId, {
        render: (
          <Alert>
            There was an error sending your transaction. See the developer
            console for more info.
          </Alert>
        ),
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }

    setIsMinting(false);
  };

  const onLink = async () => {
    return;
    // // The link button is disabled if either of these are undefined
    // if (!smartAccountClient || !smartAccountAddress) return;
    // const chainId = `eip155:${abstractTestnet.id}`;

    // const message = await generateSiweMessage({
    //   address: smartAccountAddress,
    //   chainId
    // });

    // const signature = await smartAccountClient.signMessage({message});

    // await linkWithSiwe({
    //   signature,
    //   message,
    //   chainId,
    //   walletClientType: 'privy_smart_account',
    //   connectorType: 'safe'
    // });
  };

  return (
    <>
      <Head>
        <title>Abstract Global Wallet (Demo)</title>
      </Head>

      <main className="flex flex-col items-center min-w-screen min-h-screen px-4 sm:px-20 py-6 sm:py-10 bg-gradient-to-t from-white to-[#ecf7fd]">
        {ready && authenticated && !isLoading ? (
          <>
            <ToastContainer />
            <div className="flex flex-col z-10">
              <Header logout={logout} />
              <div className="flex flex-row gap-4">
                <Cell>
                  <CellTitle title="Actions" />
                  <Button onClick={onMint} disabled={isLoading || isMinting}>
                    Mint NFT
                    <ArrowSVG />
                  </Button>

                  <Button onClick={onLink} disabled>
                    Link Smart Account
                  </Button>
                </Cell>
                <Cell>
                  <CellTitle title="Addresses" />

                  <p className=" font-normal text-md text-gray-900">
                    Abstract Global Wallet Address
                  </p>
                  <AddressCell address={smartAccountAddress} />
                  <p className=" font-normal text-md text-gray-900">
                    Signer Address
                  </p>

                  <AddressCell address={eoa?.address ?? ""} />
                </Cell>
              </div>
              <LongCell>
                <CellTitle title="User Object" />
                <textarea
                  value={JSON.stringify(user, null, 2)}
                  style={{
                    boxShadow: "0px 4px 10px 0px rgba(222, 228, 235, 0.75)",
                  }}
                  className="p-6 w-screen max-w-4xl rounded-2xl font-mono border-solid border-2 text-sm border-[#abe1f3a3] text-gray-800"
                  rows={20}
                  disabled
                />
              </LongCell>
            </div>
          </>
        ) : null}
        {/* Add Dots Background */}
        <DotsBG />
      </main>
    </>
  );
}

function AddressCell({ address }: { address: string }) {
  const formattedAddress = address.toLowerCase();
  return (
    <a
      target="_blank"
      style={{ boxShadow: "0px 0.79px 2.37px 0px rgba(0, 0, 0, 0.29)" }}
      className="py-1.5 px-4 rounded-full font-medium text-[#93969a] bg-gradient-primary"
      href={`${ABS_SEPOLIA_SCAN_URL}/address/${formattedAddress}`}
    >
      {formattedAddress.slice(0, 7)}...
      {formattedAddress.slice(-5)}
    </a>
  );
}

function Button({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        boxShadow:
          "0px 0px 0px 1px rgba(0, 0, 0, 0.05), 0px 6px 10px -4px rgba(0, 0, 0, 0.12)",
      }}
      className="flex flex-row items-center justify-center gap-2 bg-[#fcfcfc] py-2 px-3  rounded-[100px] hover:bg-slate-50 transition-all hover:scale-[.985] active:scale-[.970]  hover:text-gray-700   duration-200 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

const ArrowSVG = () => (
  <svg fill="none" viewBox="0 0 14 13" height="14">
    <path
      fill="currentColor"
      d="M9.5 4.5v3a.5.5 0 0 1-1 0V5.707L5.354 8.854a.5.5 0 0 1-.708-.708L7.793 5H6a.5.5 0 0 1 0-1h3a.5.5 0 0 1 .5.5m4 2A6.5 6.5 0 1 1 7 0a6.507 6.507 0 0 1 6.5 6.5m-1 0A5.5 5.5 0 1 0 7 12a5.507 5.507 0 0 0 5.5-5.5"
    ></path>
  </svg>
);

//
function Header({ logout }: { logout: () => void }) {
  return (
    <div className="flex flex-row justify-between w-full max-w-5xl">
      <h1 className="text-2xl font-medium">Abstract Global Wallet (Demo)</h1>
      <Button onClick={logout} disabled={false}>
        Logout
      </Button>
    </div>
  );
}

const CellTitle = ({ title }: { title: string }) => (
  <p className="mb-2 font-normal text-2xl ">{title}</p>
);

const Cell = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      boxShadow: "0px 4px 10px 0px rgba(222, 228, 235, 0.95)",
    }}
    className="mt-4 flex flex-col justify-start items-start gap-4 p-5 rounded-2xl min-w-[320px] bg-white max-w-sm border-solid border-2 border-[#eefbffa3]"
  >
    {children}
  </div>
);

const LongCell = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      boxShadow: "0px 4px 10px 0px rgba(222, 228, 235, 0.95)",
    }}
    className="mt-4 flex flex-col justify-start items-start gap-4 p-5 rounded-2xl min-w-[320px] bg-[rgba(255,255,255,0.8)] backdrop-blur-sm"
  >
    {children}
  </div>
);

const DotsBG = () => (
  <div
    className="absolute top-0 left-0 z-0 w-full h-full"
    style={{
      backgroundImage: "url(/dots.svg)",
      backgroundSize: "50px",
      backgroundPosition: "center",
      opacity: 0.025,
    }}
  />
);
