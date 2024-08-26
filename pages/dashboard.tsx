import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useLinkWithSiwe, usePrivy } from "@privy-io/react-auth";
import Head from "next/head";
import { useSmartAccount } from "../hooks/SmartAccountContext";
import { ABS_SEPOLIA_SCAN_URL, NFT_ADDRESS, VALIDATOR_ADDRESS } from "../lib/constants";
import { encodeFunctionData, Hex } from "viem";
import ABI from "../lib/nftABI.json";
import { ToastContainer, toast } from "react-toastify";
import { Alert } from "../components/AlertWithLink";
import { createPublicClient, http,createWalletClient, custom, encodeAbiParameters, parseAbiParameters } from "viem";
import { abstractTestnet } from "viem/chains";
import { eip712WalletActions } from "viem/zksync";
import { serializeEip712 } from "zksync-ethers/build/utils";
import { EIP712Signer, utils, types } from 'zksync-ethers';

export default function DashboardPage() {
  const router = useRouter();
  const { ready, authenticated, user, logout } = usePrivy();
  const {generateSiweMessage, linkWithSiwe} = useLinkWithSiwe();
  const { smartAccountAddress, smartAccountClient, eoa } = useSmartAccount();

  // If the user is not authenticated, redirect them back to the landing page
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  const isLoading = !smartAccountAddress || !smartAccountClient;
  const [isMinting, setIsMinting] = useState(false);

  const publicClient = createPublicClient({
    chain: abstractTestnet,
    transport: http()
  })

  const onMint = async () => {
    // The mint button is disabled if either of these are undefined
    if (!smartAccountClient || !smartAccountAddress) return;

    // Store a state to disable the mint button while mint is in progress
    setIsMinting(true);
    const toastId = toast.loading("Minting...");

    try {
      const eip1193provider = await eoa!.getEthereumProvider();
      const embeddedWalletClient = createWalletClient({
        account: eoa!.address as `0x${string}`,
        chain: abstractTestnet,
        transport: custom(eip1193provider),
      }).extend(eip712WalletActions());

      const mintData = encodeFunctionData({
        abi: ABI,
        functionName: "mint",
        args: [smartAccountAddress, 1]
      })

      const nonce = await publicClient.getTransactionCount({
        address: smartAccountAddress
      });
      const gasPrice = await publicClient.getGasPrice()
      const gasLimit = await publicClient.estimateGas({
        account: smartAccountAddress,
        to: NFT_ADDRESS,
        data: mintData,
      })

      const tx = {
        from: smartAccountAddress,
        to: NFT_ADDRESS,
        data: mintData,
        nonce: nonce,
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString(),
        chainId: abstractTestnet.id,
        value: 0,
        type: 113,
        customData: {
          gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
          paymasterParams: undefined
        } as types.Eip712Meta,
      };
      const signedTxHash = EIP712Signer.getSignedDigest(tx);

      const rawSignature = await embeddedWalletClient.signMessage({
        message: { raw: signedTxHash as Hex },
      });
      const signature = encodeAbiParameters(
        parseAbiParameters(['bytes', 'address', 'bytes[]']),
        [rawSignature as `0x${string}`, VALIDATOR_ADDRESS, []]
      );

      const serializedTx = serializeEip712({
        ...tx,
        customData: {
          ...tx.customData,
          customSignature: signature,
        },
      });

      const transactionHash = await publicClient.sendRawTransaction({ serializedTransaction: serializedTx as `0x${string}` })

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
      // The link button is disabled if either of these are undefined
      if (!smartAccountClient || !smartAccountAddress) return;
      const chainId = `eip155:${abstractTestnet.id}`;

      const message = await generateSiweMessage({
        address: smartAccountAddress,
        chainId
      });

      const signature = await smartAccountClient.signMessage({message});

      await linkWithSiwe({
        signature,
        message,
        chainId,
        walletClientType: 'privy_smart_account',
        connectorType: 'safe'
      });
  }

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
              <h1 className="text-2xl font-semibold">
                Privy x AGW Demo
              </h1>
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
                disabled={isLoading}
              >
                Link smart account to user
              </button>
            </div>
            <p className="mt-6 font-bold uppercase text-sm text-gray-600">
              Your Smart Wallet Address
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
