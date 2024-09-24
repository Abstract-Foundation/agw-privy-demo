import { useAccount } from "wagmi";
import LoginPage from "./LoginPage";

export const PageWrapper = ({ children }: { children: React.ReactNode }) => {
    const { address } = useAccount();

    if (!address) {
        return <LoginPage />;
    } else{
        return <div>{children}</div>;
    }
};