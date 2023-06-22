import React, { FC, useEffect, useState } from "react";
import { useWeb3React } from "@web3-react/core";
import { connectors } from "../../../blockchain/ethereum/connectors";
import AccessibleButton from "../elements/AccessibleButton";
import Modal from 'react-bootstrap/Modal';
import { PROVIDERNAMES } from "../../../@variables/common";
import { useLocalStorageState } from "../../../hooks/useLocalStorageState";
import { useWallet, WalletReadyState } from "@aptos-labs/wallet-adapter-react";
import { PetraWalletName } from "petra-plugin-wallet-adapter";

interface IProps {
    show: boolean;
    handleAptosWalletsModal: (value: boolean) => void;
}

const AptosWalletsDialog: FC<IProps> = (props) => {
    const { activate } = useWeb3React();
    const handleClose = () => props.handleAptosWalletsModal(false);
    const [, setProvider] = useLocalStorageState("provider", null);
    const {
        connect,
        account,
        network,
        connected,
        disconnect,
        wallet,
        wallets,
        signAndSubmitTransaction,
        signTransaction,
        signMessage,
        signMessageAndVerify,
    } = useWallet();

    const AptosWalletButtons = () => {
        const { wallets } = useWallet();

        return (
            <>
            {wallets.map((wallet: Wallet) => {
                return walletView(wallet);
            })}
            </>
        );
    };
    
    const walletView = (wallet: Wallet) => {
    const { connect } = useWallet();
    const isWalletReady =
        wallet.readyState === WalletReadyState.Installed ||
        wallet.readyState === WalletReadyState.Loadable;
    const mobileSupport = wallet.deeplinkProvider;
    /**
     * If we are on a mobile browser, adapter checks whether a wallet has a `deeplinkProvider` property
     * a. If it does, on connect it should redirect the user to the app by using the wallet's deeplink url
     * b. If it does not, up to the dapp to choose on the UI, but can simply disable the button
     * c. If we are already in a in-app browser, we dont want to redirect anywhere, so connect should work as expected in the mobile app.
     *
     * !isWalletReady - ignore installed/sdk wallets that dont rely on window injection
     * isRedirectable() - are we on mobile AND not in an in-app browser
     * mobileSupport - does wallet have deeplinkProvider property? i.e does it support a mobile app
     */
    if (!isWalletReady && isRedirectable()) {
        // wallet has mobile app
        if (mobileSupport) {
        return (
            <button
            className={`bg-blue-500 text-white font-bold py-2 px-4 rounded mr-4 hover:bg-blue-700`}
            disabled={false}
            key={wallet.name}
            onClick={() => connect(wallet.name)}
            >
            <>{wallet.name}</>
            </button>
        );
        }
        // wallet does not have mobile app
        return (
        <button
            className={`bg-blue-500 text-white font-bold py-2 px-4 rounded mr-4 opacity-50 cursor-not-allowed`}
            disabled={true}
            key={wallet.name}
        >
            <>{wallet.name} - Desktop Only</>
        </button>
        );
    } else {
        // we are on desktop view
        return (
        <button
            className={`bg-blue-500  text-white font-bold py-2 px-4 rounded mr-4 ${
            isWalletReady ? "hover:bg-blue-700" : "opacity-50 cursor-not-allowed"
            }`}
            disabled={!isWalletReady}
            key={wallet.name}
            onClick={() => connect(wallet.name)}
        >
            <>{wallet.name}</>
        </button>
        );
    }
    };

    return (
        <Modal
            {...props}
            className="mx_EthereumWalletsModal"
            size="sm"
            centered
            onHide={handleClose}
        >
            <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">
                    Select Wallet
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <AccessibleButton
                    className="mx_EthereumWalletsModal_button"
                    onClick={() => {
                        console.log("Wallet = ", wallet);
                        console.log("Wallets = ", wallets)
                        // connect(wallet.name);
                        connect(PetraWalletName)
                        setProvider(PROVIDERNAMES.COINBASE);
                        handleClose();
                    }}
                >
                    <div className="mx_EthereumWalletsModal_button_label">
                        Petra Wallet
                    </div>
                    <div className="mx_EthereumWalletsModal_button_logo coinbase img-fill"></div>
                </AccessibleButton>
                <AccessibleButton
                    className="mx_EthereumWalletsModal_button"
                    onClick={() => {
                        activate(connectors.walletConnect);
                        setProvider(PROVIDERNAMES.WALLETCONNECT);
                        handleClose();
                    }}
                >
                    <div className="mx_EthereumWalletsModal_button_label">
                        Pontem Wallet
                    </div>
                    <div className="mx_EthereumWalletsModal_button_logo wallet-connect img-fill"></div>
                </AccessibleButton>
            </Modal.Body>
        </Modal>
    )
}

export default AptosWalletsDialog;