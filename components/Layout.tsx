import React from "react";
import Navbar from "./Navbar";
import type { NavbarItem } from "./Navbar";


type Props = {
  children?: React.ReactNode;
  accountId: string;
  appName: string;
  navbarItems: Array<NavbarItem>;
};

export default function Layout({
  children,
  accountId,
  appName,
  navbarItems,
}: Props) {
  
  return (
    <>
      <Navbar accountId={accountId} appName={appName} items={navbarItems} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </>
  );
}
