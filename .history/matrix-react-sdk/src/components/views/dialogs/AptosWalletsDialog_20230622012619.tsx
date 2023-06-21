import React, { FC, useEffect, useState } from "react";
import { useWeb3React } from "@web3-react/core";
import { connectors } from "../../../blockchain/ethereum/connectors";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import AccessibleButton from "../elements/AccessibleButton";
import Modal from 'react-bootstrap/Modal';
import { PROVIDERNAMES } from "../../../@variables/common";
import { useLocalStorageState } from "../../../hooks/useLocalStorageState";

interface IProps {
    show: boolean;
    handleEthereumWalletsModal: (value: boolean) => void;
}

const AptosWalletsDialog: FC<IProps> = (props) => {
    const { activate } = useWeb3React();
    const handleClose = () => props.handleAptosWalletsModal(false);
    const [, setProvider] = useLocalStorageState("provider", null);

    return (
        <Modal
            {...props}
            className="mx_AptosWalletsModal"
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
                    className="mx_AptosWalletsModal_button"
                    onClick={() => {
                        activate(connectors.coinbaseWallet);
                        setProvider(PROVIDERNAMES.COINBASE);
                        handleClose();
                    }}
                >
                    <div className="mx_AptosWalletsModal_button_label">
                        Petra Wallet
                    </div>
                    <div className="mx_AptosWalletsModal_button_logo coinbase img-fill"></div>
                </AccessibleButton>
                <AccessibleButton
                    className="mx_AptosWalletsModal_button"
                    onClick={() => {
                        activate(connectors.walletConnect);
                        setProvider(PROVIDERNAMES.WALLETCONNECT);
                        handleClose();
                    }}
                >
                    <div className="mx_AptosWalletsModal_button_label">
                        Pontem Wallet
                    </div>
                    <div className="mx_AptosWalletsModal_button_logo wallet-connect img-fill"></div>
                </AccessibleButton>
                <AccessibleButton
                    className="mx_AptosWalletsModal_button"  
                    onClick={() => {
                        activate(connectors.injected);
                        setProvider(PROVIDERNAMES.INJECTED);
                        handleClose();
                    }}
                >
                    <div className="mx_AptosWalletsModal_button_label">
                        Metamask
                    </div>
                    <div className="mx_AptosWalletsModal_button_logo metamask img-fill"></div>
                </AccessibleButton>
            </Modal.Body>
        </Modal>
    )
}

export default AptosWalletsDialog;