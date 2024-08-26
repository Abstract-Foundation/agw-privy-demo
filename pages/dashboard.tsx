import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { /*useLinkWithSiwe,*/ usePrivy } from "@privy-io/react-auth";
import Head from "next/head";
import { useSmartAccount } from "../hooks/SmartAccountContext";
import {
  ABS_SEPOLIA_SCAN_URL,
  NFT_ADDRESS,
  NFT_PAYMASTER_ADDRESS,
  VALIDATOR_ADDRESS,
} from "../lib/constants";
import ABI from "../lib/nftABI.json";
import { ToastContainer, toast } from "react-toastify";
import { Alert } from "../components/AlertWithLink";
import { abstractTestnet } from "viem/chains";
import { getGeneralPaymasterInput, serializeTransaction } from "viem/zksync";
import {
  encodeAbiParameters,
  encodeFunctionData,
  Hex,
  parseAbiParameters,
} from "viem";
import { getSignInput, getTypedDataDomain, typedDataTypes } from "../lib/eip712";

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
    if (!smartAccountClient || !smartAccountAddress || !smartAccountClient.account) return;

    // Store a state to disable the mint button while mint is in progress
    setIsMinting(true);
    const toastId = toast.loading("Minting...");

    const mintData = encodeFunctionData({
      abi: ABI,
      functionName: "mint",
      args: [smartAccountAddress, 1],
    });

    try {
      // Prepare a transaction to mint an NFT using the smart account
      const preppedTx = await smartAccountClient.prepareTransactionRequest({
        account: smartAccountAddress as Hex,
        chain: abstractTestnet,
        data: mintData,
        paymaster: NFT_PAYMASTER_ADDRESS,
        paymasterInput: getGeneralPaymasterInput({
          innerInput: "0x",
        }),
        to: NFT_ADDRESS,
        type: "eip712",
      });

      // Convert the prepped transaction into a typed data object
      const typedData = {
        types: typedDataTypes(),
        primaryType: "Transaction",
        message: getSignInput(preppedTx), // Reshape the object into Eip-712 format
        domain: getTypedDataDomain(),
      };

      // The EOA signs the typed data under the hood
      const rawSignature = await smartAccountClient.signTypedData(typedData);

      const signature = encodeAbiParameters(
        parseAbiParameters(["bytes", "address", "bytes[]"]),
        [rawSignature as `0x${string}`, VALIDATOR_ADDRESS, []]
      );

      // Finally, format a transaction where it's sent from the smart contract
      // But the signature is from the EOA that is the signer of the account
      const serializedTx = serializeTransaction({
        ...preppedTx,
        customSignature: signature,
      });

      const transactionHash = await smartAccountClient.sendRawTransaction({
        serializedTransaction: serializedTx,
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
        <title>Privy x AGW Demo</title>
      </Head>

      <main className="flex flex-col min-h-screen px-4 sm:px-20 py-6 sm:py-10 bg-privy-light-blue">
        {ready && authenticated && !isLoading ? (
          <>
            <ToastContainer />
            <div className="flex flex-row justify-between">
              <h1 className="text-2xl font-semibold">Privy x AGW Demo</h1>
              <button
                onClick={logout}
                className="text-sm bg-violet-200 hover:text-violet-900 py-2 px-4 rounded-md text-violet-700"
              >
                Logout
              </button>
            </div>
            <div className="mt-12 flex gap-4 flex-wrap">
              <button
                onClick={onMint}
                className="text-sm bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 py-2 px-4 rounded-md text-white"
                disabled={isLoading || isMinting}
              >
                Mint NFT
              </button>
              <button
                onClick={onLink}
                className="text-sm bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 py-2 px-4 rounded-md text-white"
                disabled={true /*isLoading*/}
              >
                Link smart account to user
              </button>
            </div>
            <p className="mt-6 font-bold uppercase text-sm text-gray-600">
              Your Abstract Global Wallet Address
            </p>
            <a
              className="mt-2 text-sm text-gray-500 hover:text-violet-600"
              href={`${ABS_SEPOLIA_SCAN_URL}/address/${smartAccountAddress}`}
            >
              {smartAccountAddress}
            </a>
            <p className="mt-6 font-bold uppercase text-sm text-gray-600">
              Your Signer Address
            </p>
            <a
              className="mt-2 text-sm text-gray-500 hover:text-violet-600"
              href={`${ABS_SEPOLIA_SCAN_URL}/address/${eoa?.address}`}
            >
              {eoa?.address}
            </a>
            <p className="mt-6 font-bold uppercase text-sm text-gray-600">
              User object
            </p>
            <textarea
              value={JSON.stringify(user, null, 2)}
              className="max-w-4xl bg-slate-700 text-slate-50 font-mono p-4 text-xs sm:text-sm rounded-md mt-2"
              rows={20}
              disabled
            />
          </>
        ) : null}
      </main>
    </>
  );
}
