import React, { FC, useState, useEffect, useMemo } from "react";
import AccessibleButton from "../../views/elements/AccessibleButton";
import ConnectButton from "../ConnectButton";
import { useWeb3React } from "@web3-react/core";
import { useWallet as solanaUseWallet } from "@solana/wallet-adapter-react";
import { BLOCKCHAINNETWORKS, PROVIDERNAMES } from "../../../@variables/common";
import { signInAptosWallet, signInEthWallet, signInSolanaWallet, verifyAptosWallet, verifyEthWallet, verifySolanaWallet } from "../../../apis";
import { useLocalStorageState } from "../../../hooks/useLocalStorageState";
import { ethers } from "ethers";
// TODO when click Aptos Connect:
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletConnector } from "@aptos-labs/wallet-adapter-mui-design";
import { PetraWallet } from "petra-plugin-wallet-adapter";
import { FewchaWallet } from "fewcha-plugin-wallet-adapter";
import { NightlyWallet } from "@nightlylabs/aptos-wallet-adapter-plugin";
import { RiseWallet } from "@rise-wallet/wallet-adapter";
import { TrustWallet } from "@trustwallet/aptos-wallet-adapter";
import { base58 } from "ethers/lib/utils";


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

    const solanaWallet = solanaUseWallet();
    const aptosWallet = useWallet();

    const ethProvider = useMemo(() => { 
        return active ? new ethers.providers.Web3Provider(library.provider) : null;
    }, [active]);


    // TODO Here is my updated code
    useEffect(() => {
        console.log("Effect has started!!!!!!!!");
        console.log("Aptos Wallet execute: ", aptosWallet.connected);
        console.log(typeof(aptosWallet.connect));
        console.log("-----------------------------------")
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
            console.log("Aptos Wallet Selected!");
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
        console.log("Wallet effect has started");
        if(!isClickedConnectButton) return; //user didn't click wallet connect button
        if(!wallet?.connected && !wallet?.active) return; //user didn't connect wallet
        if(isSigning) return;
        if(solanaWallet.connected) {
            signInViaSolanaWallet()
        }
        else if(aptosWallet.connected) {
            console.log("SignInViaAptosWallet!!!!!");
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
        console.log("Solana Success = ", success);
        console.log("Solana data = ", data);
        console.log("Solana responseCode = ", responseCode);
        if(!success) {
            props.setVerifyResult({responseCode});
            setIsSigning(false);
            wallet.disconnect();
            return;
        }
        
        const encodedMessage = new TextEncoder().encode(data.message);
        let signature;
        console.log("Sign Message = ", await wallet.signMessage(encodedMessage))
        try {
            signature = bs58.encode(await wallet.signMessage(encodedMessage));
        }
        catch(e) {
            console.error(e);
            setIsSigning(false);
            wallet.disconnect();
            return;
        }
        console.log("Hey Hey Here!!!");
        console.log(wallet.publicKey.toBase58());
        console.log(signature, typeof signature);
        console.log(data.token, typeof data.token);
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
        // const success = true;
        // const data = "";
        // const responseCode = 200;
        console.log("Sign In Via Aptos Wallet Started");
        console.log(wallet.account.publicKey, typeof wallet.account.publicKey);
        console.log(base58.encode(wallet.account.publicKey));
        console.log("Public Key = ", base58.encode(wallet.account.publicKey));
        const {success, data, responseCode} = await verifySolanaWallet(base58.encode(wallet.account.publicKey));
        console.log("APTOS:: success = ", success, "data = ", data, "response = ", responseCode);
        if(!success) {
            props.setVerifyResult({responseCode});
            setIsSigning(false);
            wallet.disconnect();
            return;
        }
        
        const encodedMessage = new TextEncoder().encode(data.message);
        console.log(encodedMessage);
        console.log("EncodedMessageLevel?");
        let signature;
        console.log(data);
        console.log("data.message = ", data.message);
        try {
            // await aptosWallet.signMessage(data);
            signature = await wallet.signMessage({message: data.message, nonce: "random_string",});
            signature = signature.signature;
            console.log("signature = ", signature);
        }
        catch(e) {
            console.error(e);
            setIsSigning(false);
            wallet.disconnect();
            return;
        }
        console.log("Signature Level = ", base58.encode(signature.slice(0, 58)));
        console.log("Public Key = ", base58.encode(wallet.account.publicKey));
        console.log("data.token = ", data.token);
        const {success: signinResult, data: accountData} = await signInAptosWallet(base58.encode(wallet.account.publicKey), signature.slice(0, 64), data.token);
        console.log("Next Stage: success = ", success, "data = ", data);
        if(!signinResult)  {
            setIsSigning(false);
            wallet.disconnect();
            return;
        }
        window.localStorage.setItem("conneted_wallet", base58.encode(wallet.account.publicKey));
        let primaryWallet = {
            protocol: BLOCKCHAINNETWORKS.Aptos,
            address: base58.encode(wallet.account.publicKey)
        }
        console.log("Primary Wallet");
        window.localStorage.setItem("primary_wallet", JSON.stringify(primaryWallet));
        let userData = {
            username: accountData.username,
            password: accountData.password,
        }
        setUserData(userData);
        props.getUserInfo({...accountData, newUser: accountData.newUser});
        setIsSigning(false);
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
        console.log("Aptos Wallet = ");
        setIsClickedConnectButton([false, false, true]);
        // setAptosWalletsModalShow(true);
        console.log("Aptos Wallet Button Clicked");
        // document.getElementsByClassName("ant-btn css-dev-only-do-not-override-1wazalj ant-btn-default wallet-button")[0].click();
        document.getElementsByClassName("MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary MuiButton-sizeLarge MuiButton-containedSizeLarge MuiButton-root MuiButton-contained MuiButton-containedPrimary MuiButton-sizeLarge MuiButton-containedSizeLarge wallet-button css-1ekazca-MuiButtonBase-root-MuiButton-root")[0].click();
        console.log("Hey I am here");
        console.log(aptosWallet.connected);
        console.log("HAPPYY!!!!!!!!!!");
    }

    // TODO Aptos Connect Show
    return (
        <div className="mx_WalletSignupButtonGroup">
            <div className='mx_WalletSignupButtonGroup_header common-badge bg-purple mt-4'>Web3</div>
            <div className='mx_WalletSignupButtonGroup_body mt-4'>
                {/* <AptosWalletAdapterProvider plugins={[new PetraWallet(), new FewchaWallet(), new NightlyWallet(), 
                new RiseWallet(), new TrustWallet(),]}>*/}
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
                <AccessibleButton className='mx_WalletSignupButtonGroup_button' onClick={clickAptosWalletButton}>
                    <div className='mx_WalletSignupButtonGroup_button_info'>
                        <div className='mx_WalletSignupButtonGroup_button_logo ethereum'>
                        </div> 
                        <div className='mx_WalletSignupButtonGroup_button_label mx-2'>
                            Aptos Connect
                        </div>
                    </div>
                </AccessibleButton>
                {/* </AptosWalletAdapterProvider> */}
            </div>
        </div>
    )
}

export default WalletSignupButtonGroup