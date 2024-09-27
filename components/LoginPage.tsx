import Head from "next/head";
import React from "react";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react"

export default function LoginPage() {
  
  const { login } = useLoginWithAbstract();

  return (
    <>
      <Head>
        <title>Login · Privy</title>
      </Head>

      <main className="flex min-h-screen min-w-full">
        <div className="flex relative flex-1 p-6 justify-center items-center bg-gradient-to-t from-white to-[#f2f9fd]">
          <InnerContainer>
            <div className="flex flex-col justify-center items-center relative">
              {/*  */}
              {/*  */}
              {/*  */}
              <img className="absolute z-20 h-[80px]" src="/images/logo.png" />
              <img
                // add spinning animation to the circle
                className=" animate-spin"
                src="/images/circle.svg"
              />
            </div>
            <Button onClick={() => login()}>
              Login with Abstract
              <svg fill="none" viewBox="0 0 14 13" height="15">
                <path
                  fill="currentColor"
                  d="M9.5 4.5v3a.5.5 0 0 1-1 0V5.707L5.354 8.854a.5.5 0 0 1-.708-.708L7.793 5H6a.5.5 0 0 1 0-1h3a.5.5 0 0 1 .5.5m4 2A6.5 6.5 0 1 1 7 0a6.507 6.507 0 0 1 6.5 6.5m-1 0A5.5 5.5 0 1 0 7 12a5.507 5.507 0 0 0 5.5-5.5"
                ></path>
              </svg>
            </Button>
          </InnerContainer>
        </div>
        <DotsBG />
      </main>
    </>
  );
}

const InnerContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="z-20 relative gap-6 flex flex-col justify-center items-center h-80 w-80   rounded-2xl border-solid border-2 border-[#abe1f3a3] bg-gradient-to-t backdrop-blur-sm from-[rgba(255,255,255,0.2)] to-[rgba(235,255,255,0.65)]">
    {children}
  </div>
);
const DotsBG = () => (
  <div
    className="absolute top-0 left-0 z-0 w-full h-full"
    style={{
      backgroundImage: "url(/dots.svg)",
      backgroundSize: "44px",
      backgroundPosition: "center",
      opacity: 0.0225,
    }}
  />
);

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
