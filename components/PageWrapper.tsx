import { useAccount } from "wagmi";
import LoginPage from "./LoginPage";

export const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  const { address } = useAccount();

  return <>{address ? <div>{children}</div> : <LoginPage />}</>;
};
