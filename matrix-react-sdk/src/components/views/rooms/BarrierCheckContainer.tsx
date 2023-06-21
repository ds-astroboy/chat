import React, { useState, useEffect, FC } from "react"
import dis from '../../../dispatcher/dispatcher';
import { useWallet } from "@solana/wallet-adapter-react";
import BarrierPayLoadingScreen from "./BarrierPayLoadingScreen";
import loadingLottie from "../../../../res/img/cafeteria-loading.json";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { useWeb3React } from "@web3-react/core";
import { PROVIDERNAMES } from "../../../@variables/common";
import { useLocalStorageState } from "../../../hooks/useLocalStorageState";
import { Connection } from "@solana/web3.js";

interface IProps {
    roomId?: string;
    joinClick: () => void;
    barrierInfo: any;
}

const BarrierCheckContainer:FC<IProps> = props => {
    const [ wallet, setWallet ] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const {
        // library,
        // chainId,
        // account,
        // activate,
        // deactivate,
        active
      } = useWeb3React();
    const connection = new Connection("https://rpc.helius.xyz/?api-key=f0d1b5da-e7dd-48a0-994b-0ec919294917");
    const solanaWallet = useWallet();
    // const [provider, ] = useLocalStorageState("provider", null);

    useEffect(() => {
        // if(provider === PROVIDERNAMES.SOLANA) {
          setWallet(solanaWallet);
        // }
        // else {
        //   let wallet = {
        //     library,
        //     chainId,
        //     account,
        //     activate,
        //     deactivate,
        //     active
        //   }
        //   setWallet(wallet);
        // }
    }, [solanaWallet, active])

    useEffect(() => {
        if(!wallet || isInitialized) return;
        try {
            const accessToken = MatrixClientPeg.get().getAccessToken();
            dis.dispatch({
                action: "view_barriercheck_dialog", 
                wallet,
                connection,
                joinClick: props.joinClick,
                setIsLoading: setIsLoading,
                barrierInfo: props.barrierInfo,
                roomId: props.roomId,
                userId: MatrixClientPeg.get().getUserId(),
                accessToken,
                setShowConfirmation: setShowConfirmation,
            })             
        }
        catch(e) {
            console.warn(e);
        }
        setIsInitialized(true)
    }, [wallet])

    let label;
    switch(props.barrierInfo.type) {
        case "wallet.check":
        case "wallet.pay":
            label = "Checking Wallet Status ... ";
            break;
        case "nft.check":
            label = "Checking NFT in Wallet ... "
            break;
        case "points.check":
            label = "Checking Cafeteria Credits Status ... ";
            break;
        case "points.pay":
            label = "Paying Cafeteria Credits to Join Room ... "
            break;
    }

    return (
        <div>
            {
                isLoading?
                <BarrierPayLoadingScreen 
                    label={label}
                    type={props.barrierInfo.type} 
                    loadingLottie={loadingLottie}
                    showConfirmation={showConfirmation}
                />
                :
                false
            }
        </div>
    )
}

export default BarrierCheckContainer