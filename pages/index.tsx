import { useEffect, useState } from "react";
import { usePrivyCrossAppEIP1193 } from "../components/privy1193CrossApp";
import { Address, toHex } from "viem";
import { usePrivy } from "@privy-io/react-auth";

export default function Home() {
  const { logout } = usePrivy();

  const provider = usePrivyCrossAppEIP1193({ testnet: true });

  const [account, setAccount] = useState<Address | undefined>(undefined);

  const buttonStyle =
    "cursor-pointer p-2 ring-2 ring-green-500 hover:bg-green-100 rounded-md";

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-2">
      {account ? (
        <>
          <div>Hello {account}</div>
          <div className={buttonStyle} onClick={() => {
            logout()
            setAccount(undefined)
          }}>
            Logout
          </div>
        </>
      ) : (
        <div
          className={buttonStyle}
          onClick={async () => {
            const accounts = await provider.request({
              method: "eth_requestAccounts",
            });
            setAccount(accounts[0]);
          }}
        >
          Connect
        </div>
      )}

      {!!account && (
        <div
          className={buttonStyle}
          onClick={() =>
            provider.request({
              method: "personal_sign",
              params: [toHex("Hello World"), account],
            })
          }
        >
          Sign Message
        </div>
      )}
    </div>
  );
}
