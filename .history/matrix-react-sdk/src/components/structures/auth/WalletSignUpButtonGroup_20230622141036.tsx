import React, { FC, useState, useEffect, useMemo } from "react";
import AccessibleButton from "../../views/elements/AccessibleButton";
import ConnectButton from "../ConnectButton";
import { useWeb3React } from "@web3-react/core";
import { useWallet } from "@solana/wallet-adapter-react";
import { BLOCKCHAINNETWORKS, PROVIDERNAMES } from "../../../@variables/common";
import { signInAptosWallet, signInEthWallet, signInSolanaWallet, verifyAptosWallet, verifyEthWallet, verifySolanaWallet } from "../../../apis";
import { useLocalStorageState } from "../../../hooks/useLocalStorageState";
import { ethers } from "ethers";
// TODO when click Aptos Connect:
import { AptosWalletAdapterProvider, useWallet as aptosUseWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletConnector } from "@aptos-labs/wallet-adapter-mui-design";
import { PetraWallet } from "petra-plugin-wallet-adapter";
import { FewchaWallet } from "fewcha-plugin-wallet-adapter";
import { NightlyWallet } from "@nightlylabs/aptos-wallet-adapter-plugin";
import { PontemWallet } from "@pontem/wallet-adapter-plugin";
import { RiseWallet } from "@rise-wallet/wallet-adapter";
import { TrustWallet } from "@trustwallet/aptos-wallet-adapter";

import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";

const bs58 = require('bs58');

interface IProps {
    getUserInfo: (user: any) => void;
    setVerifyResult: (result) => void;
}

// TODO _Overall
const WalletSignupButtonGroup: FC<IProps> = (props) => {
    const [wallet, setWallet] = useState(null);
    const [isSigning, setIsSigning] = useState(false);
    const [isClickedConnectButton, setIsClickedConnectButton] = useState<boolean[]>([false, false, false]);
    const [ethereumWalletsModalShow, setEthereumWalletsModalShow] = useState<boolean>(false);
    const [aptosWalletsModalShow, setAptosWalletsModalShow] = useState<boolean>(false);
    const [userData, setUserData] = useLocalStorageState("userData", null);

    const {
        library,
        chainId,
        account,
        activate,
        deactivate,
        active
    } = useWeb3React();
    
    // TODO  add aptos wallet
    // TODO Here is my Code

    const solanaWallet = useWallet();
    const aptosWallet = aptosUseWallet();

    const ethProvider = useMemo(() => { 
        return active ? new ethers.providers.Web3Provider(library.provider) : null;
    }, [active]);


    // TODO Here is my updated code
    useEffect(() => {
        if(!isClickedConnectButton[0] && solanaWallet.connected) {
            solanaWallet.disconnect();
        }
        if(!isClickedConnectButton[1] && active) {
            deactivate();
        }
        if(!isClickedConnectButton[2] && aptosWallet.connected) {
            aptosWallet.disconnect();
        }
        if(isClickedConnectButton[0] && solanaWallet.connected) {
            setWallet(solanaWallet);
        }
        else if(isClickedConnectButton[2] && aptosWallet.connected){
            setWallet(aptosWallet)
        }
        else if(isClickedConnectButton[1] && active) {
            let wallet = {
                library,
                chainId,
                account,
                activate,
                deactivate,
                active
            }
            setWallet(wallet);
        }
        else {
            setWallet(null);
        }
    }, [solanaWallet, aptosWallet, active, chainId]);

    useEffect(() => {
        if(!isClickedConnectButton) return; //user didn't click wallet connect button
        if(!wallet?.connected && !wallet?.active) return; //user didn't connect wallet
        if(isSigning) return;
        if(solanaWallet.connected) {
            signInViaSolanaWallet()
        }
        else if(aptosWallet.connected) {
            signInViaAptosWallet()
        }
        else if(active) {
            signInViaEthWallet();
        }
    }, [wallet])

    // TODO add useEffect of aptos wallet

    const signInViaSolanaWallet = async() => {
        setIsSigning(true);
        const {success, data, responseCode} = await verifySolanaWallet(wallet.publicKey.toBase58());
        if(!success) {
            props.setVerifyResult({responseCode});
            setIsSigning(false);
            wallet.disconnect();
            return;
        }
        
        const encodedMessage = new TextEncoder().encode(data.message);
        let signature;
        try {
            signature = bs58.encode(await wallet.signMessage(encodedMessage));
        }
        catch(e) {
            console.error(e);
            setIsSigning(false);
            wallet.disconnect();
            return;
        }
        const {success: signinResult, data: accountData} = await signInSolanaWallet(wallet.publicKey.toBase58(), signature, data.token);
        if(!signinResult)  {
            setIsSigning(false);
            wallet.disconnect();
            return;
        }
        window.localStorage.setItem("conneted_wallet", wallet.publicKey.toBase58());
        let primaryWallet = {
            protocol: BLOCKCHAINNETWORKS.Solana,
            address: wallet.publicKey.toBase58()
        }
        window.localStorage.setItem("primary_wallet", JSON.stringify(primaryWallet));
        let userData = {
            username: accountData.username,
            password: accountData.password,
        }
        setUserData(userData);
        props.getUserInfo({...accountData, newUser: accountData.newUser});
        setIsSigning(false);
    }

    // TODO SignInVia Aptos Wallet
    const signInViaAptosWallet = async() => {
        setIsSigning(true);
        const {success, data, responseCode} = await verifyAptosWallet(wallet.publicKey.toBase58());
        if(!success) {
            props.setVerifyResult({responseCode});
            setIsSigning(false);
            wallet.disconnect();
            return;
        }
        
        const encodedMessage = new TextEncoder().encode(data.message);
        let signature;
        try {
            signature = bs58.encode(await wallet.signMessage(encodedMessage));
        }
        catch(e) {
            console.error(e);
            setIsSigning(false);
            wallet.disconnect();
            return;
        }
        const {success: signinResult, data: accountData} = await signInAptosWallet(wallet.publicKey.toBase58(), signature, data.token);
        if(!signinResult)  {
            setIsSigning(false);
            wallet.disconnect();
            return;
        }
        window.localStorage.setItem("conneted_wallet", wallet.publicKey.toBase58());
        let primaryWallet = {
            protocol: BLOCKCHAINNETWORKS.Aptos,
            address: wallet.publicKey.toBase58()
        }
        window.localStorage.setItem("primary_wallet", JSON.stringify(primaryWallet));
        let userData = {
            username: accountData.username,
            password: accountData.password,
        }
        setUserData(userData);
        props.getUserInfo({...accountData, newUser: accountData.newUser});
        setIsSigning(false);

        // success = aptosWallet.connected;
        // var codedString = Base58.encode(new Buffer("Hello world"));
    }

    const signInViaEthWallet = async() => {
        setIsSigning(true);
        const {success, data, responseCode} = await verifyEthWallet(account);
        if(!success) {
            props.setVerifyResult({responseCode});
            setIsSigning(false);
            deactivate()
            return;
        }
        const signer = ethProvider.getSigner();
        const msg = `0x${Buffer.from(data.message, 'utf8').toString('hex')}`;
        const addr = await signer.getAddress();
        await ethProvider.send('personal_sign', [msg, addr.toLowerCase()])
        .then(async(signature) => {
            const {success: signinResult, data: accountData} = await signInEthWallet(addr.toLowerCase(), signature, data.token);
            if(!signinResult) {
                setIsSigning(false);
                deactivate()
                return;
            }
            window.localStorage.setItem("conneted_wallet", account);
            let primaryWallet = {
                protocol: BLOCKCHAINNETWORKS.Ethereum,
                address: account
            }
            window.localStorage.setItem("primary_wallet", JSON.stringify(primaryWallet));
            let userData = {
                username: accountData.username,
                password: accountData.password
            }
            setUserData(userData);
            props.getUserInfo({...accountData, newUser: accountData.newUser});
        });
        setIsSigning(false);
    }

    // TODO signInviaAptosWallet

    const clickEthWalletButton = () => {
        setIsClickedConnectButton([false, true, false]);
        setEthereumWalletsModalShow(true);
    }

    const clickSolanaWalletButton = () => {
        setIsClickedConnectButton([true, false, false]);
        document.getElementById("wallet-connect-button").click();
    }

    // TODO clickAptosWalletButton
    const clickAptosWalletButton = () => {
        console.log("Aptos Wallet = ", aptosWallet);
        setIsClickedConnectButton([false, false, true]);
        // setAptosWalletsModalShow(true);
        console.log("Aptos Wallet Button Clicked");
        <AptosWalletAdapterProvider plugins={[new PetraWallet(), new FewchaWallet(), new NightlyWallet(), 
            new RiseWallet(), new TrustWallet(),]}>
            <WalletSelector/>
        </AptosWalletAdapterProvider>
        // return <WalletSelector/>;
    }

    // TODO Aptos Connect Show
    return (
        <div className="mx_WalletSignupButtonGroup">
            <div className='mx_WalletSignupButtonGroup_header common-badge bg-purple mt-4'>Web3</div>
            <div className='mx_WalletSignupButtonGroup_body mt-4'>                
                <ConnectButton 
                    ethereumWalletsModalShow={ethereumWalletsModalShow}
                    aptosWalletsModalShow={aptosWalletsModalShow}
                    handleEthereumWalletsModal={setEthereumWalletsModalShow}
                    handleAptosWalletsModal={setAptosWalletsModalShow}
                />                    
                <AccessibleButton className='mx_WalletSignupButtonGroup_button' onClick={clickSolanaWalletButton}>
                    <div className='mx_WalletSignupButtonGroup_button_info'>
                        <div className='mx_WalletSignupButtonGroup_button_logo solana'>
                        </div>  
                        <div className='mx_WalletSignupButtonGroup_button_label mx-2'>
                            Solana Connect
                        </div>                                                  
                    </div>
                </AccessibleButton>
                <AccessibleButton className='mx_WalletSignupButtonGroup_button' onClick={clickEthWalletButton}>
                    <div className='mx_WalletSignupButtonGroup_button_info'>
                        <div className='mx_WalletSignupButtonGroup_button_logo ethereum'>
                        </div> 
                        <div className='mx_WalletSignupButtonGroup_button_label mx-2'>
                            Ethereum Connect
                        </div>
                    </div>
                </AccessibleButton>
                {/* <AccessibleButton className='mx_WalletSignupButtonGroup_button' onClick={clickAptosWalletButton}>
                    <div className='mx_WalletSignupButtonGroup_button_info'>
                        <div className='mx_WalletSignupButtonGroup_button_logo ethereum'>
                        </div> 
                        <div className='mx_WalletSignupButtonGroup_button_label mx-2'>
                            Aptos Connect
                        </div>
                    </div>
                </AccessibleButton> */}
                
                
            </div>
        </div>
    )
}

export default WalletSignupButtonGroup