import React, { useEffect, useMemo, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletDialogProvider, WalletMultiButton, WalletDisconnectButton } from "@solana/wallet-adapter-material-ui";
import { _t } from "../../languageHandler";
import classNames from "classnames";
import EthereumWalletsDialog from "../views/dialogs/EthereumWalletsDialog";
import AptosWalletsDialog from "../views/dialogs/AptosWalletsDialog";
import Modal from "../../Modal";
import WalletCategoryDialog from "../views/dialogs/WalletCategoryDialog";
import WalletControlDialog from "../views/dialogs/WalletControlDialog";
import { useWeb3React } from "@web3-react/core";
import { useAlert } from 'react-alert'
import { PROVIDERNAMES } from "../../@variables/common";
import { useLocalStorageState } from "../../hooks/useLocalStorageState";
import { MatrixClientPeg } from "../../MatrixClientPeg";
import { connectWalletByUserName, getUserDetailByUserName, getWalletAddress, signInEthWallet, signInSolanaWallet, verifyEthWallet, verifySolanaWallet } from "../../apis";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { ethers } from "ethers";
import { useMatrixContexts, setUserDetail } from "../../contexts";
import { getUserNameFromId } from "../../utils/strings";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { WalletConnector } from "@aptos-labs/wallet-adapter-mui-design";
import { PetraWallet } from "petra-plugin-wallet-adapter";
import AptosWalletButtons from "../views/dialogs/AptosWalletsDialog";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";

const ConnectButton = props => {
    const [ethereumWalletsModalShow, setEthereumWalletsModalShow] = useState(false);
    const [aptosWalletsModalShow, setAptosWalletsModalShow] = useState(false);
    const [isSendSignRequestSolana, setIsSendSignRequestSolana] = useState(false);
    const [isSendSignRequestEthereum, setIsSendSignRequestEthereum] = useState(false);
    const solanaWallet = useWallet();
    const ethWallet = useWeb3React();
    const alert = useAlert();
    const [userData, ] = useLocalStorageState("userData", null);
    const [controller, dispatch] = useMatrixContexts(); 
    const { userDetail } = controller;

    const ethProvider = useMemo(() => { 
        return ethWallet.active ? new ethers.providers.Web3Provider(ethWallet.library.provider) : null;
    }, [ethWallet.active]);

    useEffect(() => {
        if(!userDetail) return;
        console.log("userDetail: ", userDetail);
        if(!ethWallet.active && !solanaWallet.connected) return; // user didn't connect wallet
        console.log("wallet connected")
        if(!userData) return;
        console.log("userData: ", userData);
        const accessToken = MatrixClientPeg.get().getAccessToken();
        console.log("accessToken: ", accessToken);
        if(!accessToken) return; // user didn't signin
        const connectedWallet = window.localStorage.getItem("conneted_wallet");
        console.log({connectedWallet});
        if(solanaWallet.connected && !isSendSignRequestSolana) {
            if(solanaWallet.publicKey?.toBase58() !== connectedWallet) {
                signInViaSolanaWallet();
            };
        }
        if(ethWallet.active && !isSendSignRequestEthereum) {
            if(ethWallet.account !== connectedWallet) {
                console.log("signInViaEthWallet");
                signInViaEthWallet();
            };
        }
    }, [solanaWallet.connected, ethWallet.active]);

    const connectWallet = async(accountData, protocol, address) => {
        let web3UserData = {
            username: accountData.username,
            password: accountData.password,
        }
        const connectResult = await connectWalletByUserName(userData, web3UserData, protocol);
        if(connectResult) {
            const { success, userDetail } = await getUserDetailByUserName(userData);
            if(success) {
                setUserDetail(dispatch, userDetail);
            };
            alert.success("Wallet Connected to this account successfully.")
            window.localStorage.setItem("conneted_wallet", address);
        }
        else {
            alert.error("Wallet wasn't connected, please try again.")
        }
    }

    const signInViaSolanaWallet = async() => {
        setIsSendSignRequestSolana(true);
        let address = solanaWallet.publicKey.toBase58();
        if(userDetail?.wallets[0]?.solana?.toLowerCase() === address.toLowerCase()) { //solana wallet was already connected
            setIsSendSignRequestSolana(false);
            return;
        }
        const userId = MatrixClientPeg.get()?.getUserId();
        if(!userId) {
            setIsSendSignRequestEthereum(false);
            return;
        }
        {
            const userName = getUserNameFromId(userId);
            const {success, wallets} = await getWalletAddress(userName, "solana", userData);
            if(success && wallets && wallets["solana"]?.toLowerCase() === address.toLowerCase()) {
                setIsSendSignRequestSolana(false);
                return;
            }
        }
        const {success, data} = await verifySolanaWallet(address);
        if(!success) {
            setIsSendSignRequestSolana(false);
            alert.error("Wallet verification was failed. Please try again.")
            solanaWallet.disconnect();
            return;
        }
        
        const encodedMessage = new TextEncoder().encode(data.message);
        await solanaWallet.signMessage(encodedMessage)
        .then(async(hash) => {
            const signature = bs58.encode(hash);
            const {success: signinResult, data: accountData} = await signInSolanaWallet(solanaWallet.publicKey.toBase58(), signature, data.token);
            if(!signinResult)  {
                solanaWallet.disconnect();
                alert.error("Message Signature was failed. Please try again.")
                return;
            }
            connectWallet(accountData, "solana", address);
        })
        .finally(() => {
            setIsSendSignRequestSolana(false);
        });
    }

    const signInViaEthWallet = async() => {
        setIsSendSignRequestEthereum(true);
        if(userDetail?.wallets[1]?.ethereum?.toLowerCase() === ethWallet.account.toLowerCase()) { //ethereum wallet was already connected
            setIsSendSignRequestEthereum(false);
            return; 
        }
        const userId = MatrixClientPeg.get()?.getUserId();
        if(!userId) {
            setIsSendSignRequestEthereum(false);
            return;
        }
        {
            const userName = getUserNameFromId(userId);
            const {success, wallets} = await getWalletAddress(userName, "ethereum", userData);
            if(success && wallets && wallets["ethereum"]?.toLowerCase() === ethWallet.account.toLowerCase()) {
                setIsSendSignRequestEthereum(false);
                return;
            }
        }
        const {success, data} = await verifyEthWallet(ethWallet.account);
        if(!success) {
            setIsSendSignRequestEthereum(false);
            deactivate();
            alert.error("Wallet verification was failed. Please try again.")
            return;
        }
        const signer = ethProvider.getSigner();
        const msg = `0x${Buffer.from(data.message, 'utf8').toString('hex')}`;
        const addr = await signer.getAddress();
        console.log("provider: ", ethProvider);
        console.log("addr: ", addr);
        await ethProvider.send('personal_sign', [msg, addr.toLowerCase()])
        .then(async(signature) => {
            const {success: signinResult, data: accountData} = await signInEthWallet(addr.toLowerCase(), signature, data.token);
            if(!signinResult) {
                deactivate()
                alert.error("Message Signature was failed. Please try again.")
                return;
            }
            connectWallet(accountData, "ethereum", ethWallet.account);
        })
        .finally(() => {
            setIsSendSignRequestEthereum(false);
        });
    }    

    const handleEthereumWalletsModal = (value) => {
        setEthereumWalletsModalShow(value)
    }

    const handleAptosWalletsModal = (value) => {
        setAptosWalletsModalShow(value)
    }
    
    return (
        <>
            <div className="mx_WalletConnectButton">                                       
                { props.children }
            </div>
            <WalletDialogProvider>
                <WalletMultiButton id="wallet-connect-button"/>
                <WalletDisconnectButton id="wallet-disconnect-button"/>
            </WalletDialogProvider>
            <EthereumWalletsDialog 
                show={props.ethereumWalletsModalShow || ethereumWalletsModalShow} 
                handleEthereumWalletsModal={props.handleEthereumWalletsModal || handleEthereumWalletsModal}
            />
            <AptosWalletsDialog 
                show={props.aptosWalletsModalShow || aptosWalletsModalShow} 
                handleAptosWalletsModal={props.handleAptosWalletsModal || handleAptosWalletsModal}
            />
        </>
    )
}

export default ConnectButton