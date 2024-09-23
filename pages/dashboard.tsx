import React, { useState } from "react";
import Head from "next/head";
import { useSmartAccount } from "../hooks/SmartAccountContext";
import {
  ABS_SEPOLIA_SCAN_URL,
  NFT_ADDRESS,
  AA_FACTORY_PAYMASTER_ADDRESS,
} from "../lib/constants";
import { encodeFunctionData, Hex } from "viem";
import ABI from "../lib/nftABI.json";
import TestTokenABI from "../lib/TestTokenABI.json";
import { ToastContainer, toast } from "react-toastify";
import { Alert } from "../components/AlertWithLink";
import { getGeneralPaymasterInput } from "viem/zksync";
import { randomBytes } from "crypto";

export default function DashboardPage() {
  const { smartAccountAddress, smartAccountClient } = useSmartAccount();

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

      const transactionHash = await smartAccountClient.sendTransaction({
        // account: smartAccountClient.account,
        // chain: abstractTestnet,
        to: NFT_ADDRESS,
        data: mintData,
        paymaster: AA_FACTORY_PAYMASTER_ADDRESS,
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

  const onBatchMint = async () => {
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

      const transactionHash = await smartAccountClient.sendTransactionBatch({
        calls: [
          {
            to: NFT_ADDRESS,
            data: mintData,
            value: 0n,
          },
          {
            to: NFT_ADDRESS,
            data: mintData,
          },
        ],
        paymaster: AA_FACTORY_PAYMASTER_ADDRESS,
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

  const onDeployContract = async () => {
    // The button is disabled if either of these are undefined
    if (!smartAccountClient || !smartAccountAddress) return;

    // Store a state to disable the mint button while mint is in progress
    setIsMinting(true);
    const toastId = toast.loading("Minting...");

    function generateRandomBytes32(): Hex {
      // Generate 32 random bytes
      const randomBuffer = randomBytes(32);

      // Convert the buffer to a hexadecimal string and add the '0x' prefix
      return ("0x" + randomBuffer.toString("hex")) as Hex;
    }

    try {
      const transactionHash = await smartAccountClient.deployContract({
        abi: TestTokenABI,
        chain: smartAccountClient.chain,
        account: smartAccountClient.account,
        bytecode:
          "0x0000000100200190000000150000c13d000000000201001900000060022002700000000902200197000000040020008c0000001f0000413d000000000301043b0000000b033001970000000c0030009c0000001f0000c13d000000240020008c0000001f0000413d0000000002000416000000000002004b0000001f0000c13d0000000401100370000000000101043b000000000010041b0000000001000019000000220001042e0000008001000039000000400010043f0000000001000416000000000001004b0000001f0000c13d0000002001000039000001000010044300000120000004430000000a01000041000000220001042e000000000100001900000023000104300000002100000432000000220001042e000000230001043000000000000000000000000000000000000000000000000000000000ffffffff0000000200000000000000000000000000000040000001000000000000000000ffffffff0000000000000000000000000000000000000000000000000000000055241077000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bb15b285040315edf518d7c864e5d2c87378a8f1c65f45218de9cd10f3f559ed",
        args: [],
        deploymentType: "create2",
        salt: generateRandomBytes32(),
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
        <>
          <ToastContainer />
          <div className="flex flex-col z-10">
            <div className="flex flex-row gap-4">
              <Cell>
                <CellTitle title="Actions" />
                <Button onClick={onMint} disabled={isMinting}>
                  Mint NFT
                  <ArrowSVG />
                </Button>
                <Button onClick={onBatchMint} disabled={isMinting}>
                  Batch Mint NFT
                  <ArrowSVG />
                </Button>
                <Button onClick={onDeployContract} disabled={isMinting}>
                  Deploy Contract
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
                <AddressCell address={smartAccountAddress || ""} />
                <p className=" font-normal text-md text-gray-900">
                  Signer Address
                </p>

                {/* <AddressCell address={eoa?.address ?? ""} /> */}
              </Cell>
            </div>
          </div>
        </>

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
