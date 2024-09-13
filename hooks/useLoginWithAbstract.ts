import { useCrossAppAccounts, usePrivy, type User } from "@privy-io/react-auth";
import { useCallback } from "react";

const AGW_APP_ID = "cm04asygd041fmry9zmcyn5o5";

interface AbstractGlobalWalletInterface {
    /** Boolean to indicate whether the abstract global wallet state has initialized */
    ready: boolean;
    /** Boolean to indicate whether the user is authenticated */
    authenticated: boolean;
    /** Privy user object */
    user: User | undefined;
    /** Function to login with the Abstract global wallet */
    loginWithAbstract: () => Promise<void>;
    /** Function to logout of the abstract global wallet */
    logout: () => Promise<void>;
}

export const useLoginWithAbstract = (): AbstractGlobalWalletInterface => {

    const { loginWithCrossAppAccount } = useCrossAppAccounts();
    const { user, ready, authenticated, logout } = usePrivy();

    const loginWithAbstract = useCallback(async () => {
        if (!ready) return;
        if (!authenticated) {
            try {
                await loginWithCrossAppAccount({ appId: AGW_APP_ID });
            } catch (error) {
                console.error(error);
                return;
            }
        }
    }, [ready, authenticated, loginWithCrossAppAccount]);

    return {
        ready,
        authenticated,
        user: user ?? undefined,
        loginWithAbstract,
        logout,
    }
}