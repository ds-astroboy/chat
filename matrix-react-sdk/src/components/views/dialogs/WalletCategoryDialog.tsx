import React, { FC, useEffect, useMemo } from "react";
import BaseDialog from "../dialogs/BaseDialog";
import AccessibleButton from "../elements/AccessibleButton";
import dis from "../../../dispatcher/dispatcher";

const WalletCategoryDialog: FC<{
    onFinished(): void;
    handleEthereumWalletsModal: (value: boolean) => void;
    wallets: any;
}> = ({ onFinished, handleEthereumWalletsModal, wallets }) => {  

    const [ isSolWalletConnected, isEthWalletConnected ] = useMemo(() => {
        let solWallet = wallets.find(wallet => wallet.type === "solana");
        let ethWallet = wallets.find(wallet => wallet.type === "ethereum");
        return [solWallet, ethWallet];
    }, [wallets])

    useEffect(() => {
        if(Array.isArray(wallets) && wallets.length > 0) {
            dis.dispatch({
                action: "show_wallet_warn_dialog"
            })
        }
    }, [])

    const clickSolanaWalletsConnectButton = () => {
        document.getElementById("wallet-connect-button").click();
        if(document.getElementById("wallet-menu")) {
            document.getElementById("wallet-menu").className += " userMenu_connect_button";
        }
    }

    const clickSolanaWallets = () => {
        clickSolanaWalletsConnectButton();
        onFinished();
    }

    const clickEthereumWallets = () => {
        handleEthereumWalletsModal(true);
        onFinished();
    }

    return (
        <BaseDialog className="mx_WalletCategory_Dialog" title="Wallet Category" onFinished={onFinished}>
            <div className="mx_WalletCategory_Dialog_body">
                <AccessibleButton 
                    className="mx_WalletCategory_Dialog_button common-btn px-4 py-2 bg-green bt-hover-purple my-4"
                    onClick={clickSolanaWallets}
                    disabled={isSolWalletConnected}
                >
                    <div className="mx_WalletCategory_Dialog_button_logo solana img-fill mx-2"></div>
                    <div className="mx_WalletCategory_Dialog_button_label">
                        Solana Wallets
                    </div>
                </AccessibleButton>
                <AccessibleButton 
                    className="mx_WalletCategory_Dialog_button common-btn px-4 py-2 bg-green bt-hover-purple my-4"
                    onClick={clickEthereumWallets}
                    disabled={isEthWalletConnected}
                >
                    <div className="mx_WalletCategory_Dialog_button_logo ethereum img-fill mx-2"></div>
                    <div className="mx_WalletCategory_Dialog_button_label">
                        Ethereum Wallets
                    </div>
                </AccessibleButton>
            </div>
        </BaseDialog>
    )
}

export default WalletCategoryDialog;