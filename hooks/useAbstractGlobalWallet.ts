import { useCrossAppAccounts, usePrivy, User, type SignTypedDataParams } from "@privy-io/react-auth";
import { useCallback, useMemo } from "react";
import { type Account, type CustomSource, hexToString, toHex } from "viem";
import { toAccount } from "viem/accounts";

const AGW_APP_ID = "cm04asygd041fmry9zmcyn5o5";

interface AbstractGlobalWalletInterface {
    /** Boolean to indicate whether the abstract global wallet state has initialized */
    ready: boolean;
    /** Boolean to indicate whether the user is authenticated */
    authenticated: boolean;
    /** Function to login with the Abstract global wallet */
    loginWithAbstract: () => Promise<void>;
    /** Account object for the Abstract global wallet signer */
    account: Account | undefined;
    /** Function to logout of the abstract global wallet */
    logout: () => Promise<void>;
}

export const useAbstractGlobalWallet = (): AbstractGlobalWalletInterface => {

    const { loginWithCrossAppAccount, signMessage, signTypedData } = useCrossAppAccounts();

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

    const account = useMemo(() => {
        const getAccountFromCrossAppUser = (user: User) => {
            const crossAppAccount = user.linkedAccounts.find((account) => account.type === 'cross_app');
            if (crossAppAccount?.embeddedWallets === undefined || crossAppAccount.embeddedWallets.length === 0) {
                throw new Error("No embedded wallet found");
            }
            const address = crossAppAccount.embeddedWallets[0]!.address;

            const signMessageWithPrivy: CustomSource['signMessage'] = async ({ message }) => {
                let messageString: string
                if (typeof message !== 'string') {
                    if (typeof message.raw === 'string') {
                        messageString = hexToString(message.raw);
                    } else {
                        messageString = hexToString(toHex(message.raw));
                    }
                } else {
                    messageString = message;
                }
                return signMessage(messageString, { address }) as Promise<`0x${string}`>;
            }

            const signTransactionWithPrivy: CustomSource['signTransaction'] = async ({ }) => {
                throw new Error("Raw transaction signing not currently implemented");
            }

            // Sanitize the message to ensure it's a valid JSON object
            // This is necessary because the message object can contain BigInt values, which 
            // can't be serialized by JSON.stringify
            function sanitizeMessage(message: any) {
                for (const key in message) {
                    if (typeof message[key] === 'object' && message[key] !== null) {
                        sanitizeMessage(message[key]);
                    } else {
                        if (typeof message[key] === 'bigint') {
                            message[key] = message[key].toString();
                        }
                    }
                }
            }

            const signTypedDataWithPrivy: CustomSource['signTypedData'] = async (data) => {
                sanitizeMessage(data.message);
                return signTypedData(data as SignTypedDataParams, { address }) as Promise<`0x${string}`>;
            }

            return toAccount({
                address: address as `0x${string}`,
                signMessage: signMessageWithPrivy,
                signTransaction: signTransactionWithPrivy,
                signTypedData: signTypedDataWithPrivy,
            });
        }

        if (!ready) return;
        if (!authenticated) return;
        return getAccountFromCrossAppUser(user as User);
    }, [ready, authenticated, user, signMessage, signTypedData]);

    return {
        ready,
        authenticated,
        loginWithAbstract,
        account,
        logout,
    }
}