import "../styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { abstractTestnet } from "viem/chains";
import { AbstractWalletProvider } from "../hooks/AbstractWalletProvider";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link
          rel="preload"
          href="/fonts/AdelleSans-Regular.woff"
          as="font"
          crossOrigin=""
        />
        <link
          rel="preload"
          href="/fonts/AdelleSans-Regular.woff2"
          as="font"
          crossOrigin=""
        />
        <link
          rel="preload"
          href="/fonts/AdelleSans-Semibold.woff"
          as="font"
          crossOrigin=""
        />
        <link
          rel="preload"
          href="/fonts/AdelleSans-Semibold.woff2"
          as="font"
          crossOrigin=""
        />

        <link rel="icon" href="/favicons/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicons/apple-touch-icon.png" />
        <link rel="manifest" href="/favicons/manifest.json" />

        <title>Privy x Permissionless</title>
        <meta name="description" content="Privy x Permissionless" />
      </Head>
      <AbstractWalletProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
        defaultChain={abstractTestnet}
        supportedChains={[abstractTestnet]}
      >
        <ToastContainer position="top-right" />
        <Component {...pageProps} />
      </AbstractWalletProvider>
    </>
  );
}

export default MyApp;
