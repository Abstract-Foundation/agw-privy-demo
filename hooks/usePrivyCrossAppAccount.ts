import { useCrossAppAccounts, usePrivy, User, type SignTypedDataParams } from "@privy-io/react-auth";
import { useCallback, useMemo } from "react";
import { CustomSource, hexToString, toHex } from "viem";
import { toAccount } from "viem/accounts";

export const useLoginWithAbstract = () => {
    const { loginWithCrossAppAccount, signMessage, signTypedData } = useCrossAppAccounts();

    const { user, ready, authenticated, logout } = usePrivy();

    const loginWithAbstract = useCallback(async () => {
        if (!ready) return;
        if (!authenticated) {
            try {
                const user = await loginWithCrossAppAccount({ appId: "cm04asygd041fmry9zmcyn5o5" });
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
            const address = crossAppAccount!.embeddedWallets[0]!.address;

            const signMessageWithPrivy: CustomSource['signMessage'] = async ({ message }) => {
                console.log(message)
                let messageString: string
                if (typeof message !== 'string') {
                    messageString = hexToString(toHex(message.raw));
                } else {
                    messageString = message;
                }
                return signMessage(messageString, { address }) as Promise<`0x${string}`>;
            }

            const signTransactionWithPrivy: CustomSource['signTransaction'] = async ({ }) => {
                console.log("signTransactionWithPrivy called")
                throw new Error("Not implemented");
            }

            const sanitizeMessage = (message: any) => {
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
                console.log("signTypedDataWithPrivy called")
                sanitizeMessage(data.message)
                console.log(data)
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
    }, [ready, authenticated, user]);

    return {
        ready,
        authenticated,
        loginWithAbstract,
        account,
        logout,
        user
    }
}