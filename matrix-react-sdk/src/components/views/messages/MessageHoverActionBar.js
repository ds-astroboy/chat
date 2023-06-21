/*
Copyright 2019 New Vector Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React, { useEffect, useState, createRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { EventStatus } from 'matrix-js-sdk/src/models/event';

import { _t } from '../../../languageHandler';
import * as sdk from '../../../index';
import dis from '../../../dispatcher/dispatcher';
import { aboveLeftOf, ContextMenu, ContextMenuTooltipButton, useContextMenu } from '../../structures/ContextMenu';
import { isContentActionable, canEditContent } from '../../../utils/EventUtils';
import RoomContext from "../../../contexts/RoomContext";
import Toolbar from "../../../accessibility/Toolbar";
import { RovingAccessibleTooltipButton, useRovingTabIndex } from "../../../accessibility/RovingTabIndex";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import { canCancel } from "../context_menus/MessageContextMenu";
import Resend from "../../../Resend";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { MediaEventHelper } from "../../../utils/MediaEventHelper";
import DownloadActionButton from "./DownloadActionButton";
import Modal from '../../../Modal';
import InputTokenAmtDialog from '../dialogs/InputTokenAmtDialog';
import { getSolInstruction } from '../dialogs/SolInstruction';
import { sendSolTransaction } from '../dialogs/SolInstruction/sendSolTransaction';
import { useWallet } from '@solana/wallet-adapter-react';
import { savePointsPresentTip, saveCryptoPresentTip, sendPointsToUser, sendTipSucessEvent, getWalletAddress, getUserDetailByUserName } from "../../../apis"
import { useMatrixContexts } from '../../../contexts';
import { Connection, Transaction } from '@solana/web3.js';
import classNames from 'classnames';
import { sendSplToken } from '../../../blockchain/solana/spl-token-transfer';
import { useAlert } from 'react-alert';
import Web3 from 'web3';
import { useWeb3React } from '@web3-react/core';
import { getUserNameFromId } from '../../../utils/strings';
import { useLocalStorageState } from "../../../hooks/useLocalStorageState";
import { BLOCKCHAINNETWORKS, METAMASKNETWORKS, PROVIDERNAMES } from '../../../@variables/common';
import { MESSAGES } from '../../../@types/error-type';
import { useSelector } from "react-redux";
import { getProtocol } from '../../../hooks/commonFuncs';

const OptionsButton = ({ mxEvent, getTile, getReplyThread, permalinkCreator, onFocusChange }) => {    
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();
    const [onFocus, isActive, ref] = useRovingTabIndex(button);
    useEffect(() => {
        onFocusChange(menuDisplayed);
    }, [onFocusChange, menuDisplayed]);

    let contextMenu;
    if (menuDisplayed) {
        const MessageContextMenu = sdk.getComponent('context_menus.MessageContextMenu');

        const tile = getTile && getTile();
        const replyThread = getReplyThread && getReplyThread();

        const buttonRect = button.current.getBoundingClientRect();
        contextMenu = <MessageContextMenu
            {...aboveLeftOf(buttonRect)}
            mxEvent={mxEvent}
            permalinkCreator={permalinkCreator}
            eventTileOps={tile && tile.getEventTileOps ? tile.getEventTileOps() : undefined}
            collapseReplyThread={replyThread && replyThread.canCollapse() ? replyThread.collapse : undefined}
            onFinished={closeMenu}
        />;
    }

    return <React.Fragment>
        <ContextMenuTooltipButton
            className="mx_MessageHoverActionBar_maskButton mx_MessageHoverActionBar_optionsButton"
            title={_t("Options")}
            onClick={openMenu}
            isExpanded={menuDisplayed}
            inputRef={ref}
            onFocus={onFocus}
            tabIndex={isActive ? 0 : -1}
            alignment={3}
        />

        {contextMenu}
    </React.Fragment>;
};

const PresentButton = ({ mxEvent, setSentTipAmount, setIsShowConfirmation }) => {
    const wallets = useSelector((state) => state.wallet.wallets);
    const alert = useAlert();
    const [controller, ] = useMatrixContexts();
    const {
        notifyWebSocket,
    } = controller;

    const {solanaWallet, ethWallet} = useMemo(() => {
        let ethWallet = wallets?.find(wallet => wallet.type === "ethereum");
        let solanaWallet = wallets?.find(wallet => wallet.type === "solana");
        return {solanaWallet, ethWallet}
    }, [wallets])
    const web3 = useMemo(() => { 
        return ethWallet?.active ? new Web3(ethWallet.library.provider) : null;
    }, [ethWallet]);

    const cli = MatrixClientPeg.get();
    const destId = mxEvent.getSender();
    const [userData, ] = useLocalStorageState("userData", null);

    const getDestAddress = async () => {
        const username = getUserNameFromId(destId);
        console.log("username ", username);
        const { success, userDetail } = await getUserDetailByUserName(userData, username);
        if(!success) return null;
        if(!Array.isArray(userDetail.wallets)) return null;
        let destWallets = {};
        userDetail.wallets.forEach(wallet => {
            destWallets = {...destWallets, ...wallet};
        })
        console.log({destWallets});
        return destWallets;
    }

    const sendPoints = async (amount) => {
        const receiverId = mxEvent.getSender();
        const accessToken = await cli.getAccessToken();
        if (!accessToken) return;
        const time = new Date().getTime();
        amount = Math.round(amount);
        let { error } = await savePointsPresentTip(accessToken, mxEvent.getId(), amount, time);
        if(!error) {
            setSentTipAmount(amount);
            await sendTipSucessEvent(notifyWebSocket, receiverId, amount);
            alert.success(MESSAGES.TIPSUCCESS)
            dis.dispatch({ action: "message_sent" });
        }
        else {
            alert.error(error);
        }
    }

    const sendSol = async (amount, destWallets) => {
        console.log("destWallets: ", destWallets);
        console.log("amount:", amount);
        let owner = solanaWallet.publicKey.toBase58();
        console.log("dest:", destWallets.solana);
        try {
            const solInstruction = await getSolInstruction(owner, destWallets.solana, amount, solanaWallet.connection, solanaWallet);
            const transaction = new Transaction();
            transaction.add(solInstruction);

            const { result, error } = await sendSolTransaction(transaction, owner, solanaWallet, solanaWallet.connection, [], setIsShowConfirmation, mxEvent);
            if (result) {      
                const accessToken = MatrixClientPeg.get().getAccessToken();
                const time = new Date().getTime();
                await saveCryptoPresentTip(accessToken, mxEvent.getId(), "Solana", amount, time);
                alert.success("CONGRATULATIONS! YOUR CRYPTO TIP WAS SUCCESSFUL")
                document.querySelector("#transactionAudio").play();
            }
            else {
                if(error?.error) {
                    alert.error(error.error.message)
                }
                else if(typeof error === "string") {
                }
                // dis.dispatch({
                //     action: "sol_transaction_failed"
                // })
            }
        }
        catch (e) {
            console.warn(e);
            alert.error("YOUR CRYPTO TIP FAILED DUE TO A CONNECTION TIMEOUT. PLEASE TRY AGAIN LATER.")
        }
    }

    const sendSolanaSplToken = async (amount, selectedCurrency, destWallets) => {
        let amount1 = amount * (10 ** selectedCurrency.decimal)
        let owner = solanaWallet.publicKey.toBase58();
        const { result, error } = await sendSplToken(
            owner, 
            destWallets.solana, 
            owner, 
            selectedCurrency.mintAddress, 
            amount1, 
            solanaWallet.connection, 
            solanaWallet,
            setIsShowConfirmation,
            mxEvent
        )
        if(result) {
            const accessToken = MatrixClientPeg.get().getAccessToken();
            const time = new Date().getTime();
            await saveCryptoPresentTip(accessToken, mxEvent.getId(), selectedCurrency.name, amount, time);
            alert.success("CONGRATULATIONS! YOUR CRYPTO TIP WAS SUCCESSFUL")
            document.querySelector("#transactionAudio").play();
        }
        else {
            if(error?.error) {
                alert.error(error.error.message)
            }
            else if(typeof error === "string") {
                alert.error("YOUR CRYPTO TIP FAILED DUE TO A CONNECTION TIMEOUT. PLEASE TRY AGAIN LATER.")
            }
            else {
                console.log("====================", JSON.stringify(error));
            }
        }
    }

    const checkNetwork = async(protocol) => {
        let newNetwork;
        let success = false;
        switch(protocol) {
            case BLOCKCHAINNETWORKS.Ethereum: 
                if(ethWallet.chainId !== 1) {
                    newNetwork = {...METAMASKNETWORKS.ethereum};
                }
                break;
            case BLOCKCHAINNETWORKS.Polygon: 
                if(ethWallet.chainId !== 137) {
                    newNetwork = {...METAMASKNETWORKS.polygon};
                }
                break;
            case BLOCKCHAINNETWORKS.BSC: 
                if(ethWallet.chainId !== 56) {
                    newNetwork = {...METAMASKNETWORKS.bsc};
                }
                break;
        }
        console.log(newNetwork);
        if(!newNetwork) return true;
        if (!window.ethereum) return false;
        try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: newNetwork.chainId }],
            });
            success = true;
        } 
        catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask.
            if (switchError.code === 4902) {
              try {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    newNetwork
                  ],
                });
                success = true;
              } catch (addError) {
                console.error(addError);
              }
            }
        }
        return success;
    }

    const sendTokens = async (amount, currency, destWallets, protocol) => {
        const success = await checkNetwork(protocol);
        if(!success) {
            alert.error("Please change the Metamask network.");
            return;
        }
        console.log(amount);
        console.log(currency);
        try  {
            await web3.eth.sendTransaction({
                from:  ethWallet.account,
                to: destWallets.ethereum,
                value: (amount * (10 ** currency.decimal)),
            })
            const accessToken = MatrixClientPeg.get().getAccessToken();
            const time = new Date().getTime();
            await saveCryptoPresentTip(accessToken, mxEvent.getId(), currency.name, amount, time);
            alert.success("CONGRATULATIONS! YOUR CRYPTO TIP WAS SUCCESSFUL");
            document.querySelector("#transactionAudio").play();
        }
        catch(e) {
            console.warn(e);
            let error;
            switch(e.code) {
                case 4001:
                    error = "You Rejected Crypto Tip Transaction"
                    break;
                default:
                    error = "YOUR CRYPTO TIP FAILED DUE TO A CONNECTION TIMEOUT. PLEASE TRY AGAIN LATER.";
                    break;
            }
            alert.error(error);
        }
    }

    const showInputTokenDialog = async () => {
        const destWallets = await getDestAddress();
        const modal = Modal.createTrackedDialog(
            'Input token amount',
            '',
            InputTokenAmtDialog,
            {
                wallets,
                destId,
                destWallets
            }
        );
        const [proceed, amount, selectedCurrency] = await modal.finished;
        if (!proceed)
            return;
        let protocol = getProtocol(selectedCurrency.name);
        if(selectedCurrency.name === "Cafeteria Credits") {
            await sendPoints(amount);
        }
        else {
            switch(protocol) {
                case BLOCKCHAINNETWORKS.Solana: 
                    if(selectedCurrency.name === "Solana") {
                        await sendSol(amount, destWallets);
                    }        
                    else {
                        await sendSolanaSplToken(amount, selectedCurrency, destWallets)
                    }
                    break;
                case BLOCKCHAINNETWORKS.Ethereum:
                case BLOCKCHAINNETWORKS.Polygon:
                case BLOCKCHAINNETWORKS.BSC:
                    await sendTokens(amount, selectedCurrency, destWallets, protocol);
                    break;
            }
        }
    }
        
    return <React.Fragment>
        <ContextMenuTooltipButton
            className="mx_MessageHoverActionBar_maskButton mx_MessageHoverActionBar_presentButton"
            title={"Gift"}
            onClick={showInputTokenDialog}
            alignment={3}
        />

    </React.Fragment>;
}

const ReactButton = ({ mxEvent, reactions, onFocusChange }) => {
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();
    const [onFocus, isActive, ref] = useRovingTabIndex(button);
    useEffect(() => {
        onFocusChange(menuDisplayed);
    }, [onFocusChange, menuDisplayed]);

    let contextMenu;
    if (menuDisplayed) {
        const buttonRect = button.current.getBoundingClientRect();
        const ReactionPicker = sdk.getComponent('emojipicker.ReactionPicker');
        contextMenu = <ContextMenu {...aboveLeftOf(buttonRect)} onFinished={closeMenu} managed={false}>
            <ReactionPicker mxEvent={mxEvent} reactions={reactions} onFinished={closeMenu} />
        </ContextMenu>;
    }

    return <React.Fragment>
        <ContextMenuTooltipButton
            className="mx_MessageHoverActionBar_maskButton mx_MessageHoverActionBar_reactButton"
            title={_t("React")}
            onClick={openMenu}
            isExpanded={menuDisplayed}
            inputRef={ref}
            onFocus={onFocus}
            tabIndex={isActive ? 0 : -1}
            alignment={3}
        />

        {contextMenu}
    </React.Fragment>;
};

@replaceableComponent("views.messages.MessageHoverActionBar")
export default class MessageHoverActionBar extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    static propTypes = {
        mxEvent: PropTypes.object.isRequired,
        // The Relations model from the JS SDK for reactions to `mxEvent`
        reactions: PropTypes.object,
        permalinkCreator: PropTypes.object,
        getTile: PropTypes.func,
        getReplyThread: PropTypes.func,
        onFocusChange: PropTypes.func,
        setSentTipAmount: PropTypes.func,
    };    

    static contextType = RoomContext;

    componentDidMount() {
        if (this.props.mxEvent.status && this.props.mxEvent.status !== EventStatus.SENT) {
            this.props.mxEvent.on("Event.status", this.onSent);
        }

        const client = MatrixClientPeg.get();
        client.decryptEventIfNeeded(this.props.mxEvent);

        if (this.props.mxEvent.isBeingDecrypted()) {
            this.props.mxEvent.once("Event.decrypted", this.onDecrypted);
        }
        this.props.mxEvent.on("Event.beforeRedaction", this.onBeforeRedaction);
        document.addEventListener('click', this.handleOutsideClick);
    }

    componentWillUnmount() {
        this.props.mxEvent.off("Event.status", this.onSent);
        this.props.mxEvent.off("Event.decrypted", this.onDecrypted);
        this.props.mxEvent.off("Event.beforeRedaction", this.onBeforeRedaction);
        document.removeEventListener('click', this.handleOutsideClick);
    }

    onDecrypted = () => {
        // When an event decrypts, it is likely to change the set of available
        // actions, so we force an update to check again.
        this.forceUpdate();
    };

    onBeforeRedaction = () => {
        // When an event is redacted, we can't edit it so update the available actions.
        this.forceUpdate();
    };

    onSent = () => {
        // When an event is sent and echoed the possible actions change.
        this.forceUpdate();
    };

    onFocusChange = (focused) => {
        if (!this.props.onFocusChange) {
            return;
        }
        this.props.onFocusChange(focused);
    };

    onReplyClick = (ev) => {
        dis.dispatch({
            action: 'reply_to_event',
            event: this.props.mxEvent,
        });
    };

    onEditClick = (ev) => {
        dis.dispatch({
            action: 'edit_event',
            event: this.props.mxEvent,
        });
    };

    /**
     * Runs a given fn on the set of possible events to test. The first event
     * that passes the checkFn will have fn executed on it. Both functions take
     * a MatrixEvent object. If no particular conditions are needed, checkFn can
     * be null/undefined. If no functions pass the checkFn, no action will be
     * taken.
     * @param {Function} fn The execution function.
     * @param {Function} checkFn The test function.
     */
    runActionOnFailedEv(fn, checkFn) {
        if (!checkFn) checkFn = () => true;

        const mxEvent = this.props.mxEvent;
        const editEvent = mxEvent.replacingEvent();
        const redactEvent = mxEvent.localRedactionEvent();
        const tryOrder = [redactEvent, editEvent, mxEvent];
        for (const ev of tryOrder) {
            if (ev && checkFn(ev)) {
                fn(ev);
                break;
            }
        }
    }

    onResendClick = (ev) => {
        this.runActionOnFailedEv((tarEv) => Resend.resend(tarEv));
    };

    onCancelClick = (ev) => {
        this.runActionOnFailedEv(
            (tarEv) => Resend.removeFromQueue(tarEv),
            (testEv) => canCancel(testEv.status),
        );
    };

    render() {
        const toolbarOpts = [];
        if (canEditContent(this.props.mxEvent)) {
            toolbarOpts.push(<RovingAccessibleTooltipButton
                className="mx_MessageHoverActionBar_maskButton mx_MessageHoverActionBar_editButton"
                title={_t("Edit")}
                onClick={this.onEditClick}
                key="edit"
                alignment={3}
            />);
        }

        const cancelSendingButton = <RovingAccessibleTooltipButton
            className="mx_MessageHoverActionBar_maskButton mx_MessageHoverActionBar_cancelButton"
            title={_t("Delete")}
            onClick={this.onCancelClick}
            key="cancel"
            alignment={3}
        />;

        // We show a different toolbar for failed events, so detect that first.
        const mxEvent = this.props.mxEvent;
        const editStatus = mxEvent.replacingEvent() && mxEvent.replacingEvent().status;
        const redactStatus = mxEvent.localRedactionEvent() && mxEvent.localRedactionEvent().status;
        const allowCancel = canCancel(mxEvent.status) || canCancel(editStatus) || canCancel(redactStatus);
        const isFailed = [mxEvent.status, editStatus, redactStatus].includes("not_sent");
        if (allowCancel && isFailed) {
            // The resend button needs to appear ahead of the edit button, so insert to the
            // start of the opts
            toolbarOpts.splice(0, 0, <RovingAccessibleTooltipButton
                className="mx_MessageHoverActionBar_maskButton mx_MessageHoverActionBar_resendButton"
                title={_t("Retry")}
                onClick={this.onResendClick}
                key="resend"
                alignment={3}
            />);

            // The delete button should appear last, so we can just drop it at the end
            toolbarOpts.push(cancelSendingButton);
        } else {
            if (isContentActionable(this.props.mxEvent)) {
                // Like the resend button, the react and reply buttons need to appear before the edit.
                // The only catch is we do the reply button first so that we can make sure the react
                // button is the very first button without having to do length checks for `splice()`.
                if (this.context.canReply) {
                    toolbarOpts.splice(0, 0, <RovingAccessibleTooltipButton
                        className="mx_MessageHoverActionBar_maskButton mx_MessageHoverActionBar_replyButton"
                        title={_t("Reply")}
                        onClick={this.onReplyClick}
                        key="reply"
                        alignment={3}
                    />);
                }
                if (this.context.canReact) {
                    toolbarOpts.splice(0, 0, <ReactButton
                        mxEvent={this.props.mxEvent}
                        reactions={this.props.reactions}
                        onFocusChange={this.onFocusChange}
                        key="react"
                    />);
                }

                // XXX: Assuming that the underlying tile will be a media event if it is eligible media.
                if (MediaEventHelper.isEligible(this.props.mxEvent)) {
                    toolbarOpts.splice(0, 0, <DownloadActionButton
                        mxEvent={this.props.mxEvent}
                        mediaEventHelperGet={() => this.props.getTile?.().getMediaHelper?.()}
                        key="download"
                    />);
                }
                if(this.props.mxEvent.getSender() !== MatrixClientPeg.get().getUserId()) {
                    toolbarOpts.splice(0, 0, <PresentButton
                        mxEvent={this.props.mxEvent}
                        setSentTipAmount={this.props.setSentTipAmount}
                        key={"gift"}
                        setIsShowConfirmation={this.props.setIsShowConfirmation}
                    />);
                }
            }

            if (allowCancel) {
                toolbarOpts.push(cancelSendingButton);
            }

            // The menu button should be last, so dump it there.
            toolbarOpts.push(<OptionsButton
                mxEvent={this.props.mxEvent}
                getReplyThread={this.props.getReplyThread}
                getTile={this.props.getTile}
                permalinkCreator={this.props.permalinkCreator}
                onFocusChange={this.onFocusChange}
                key="menu"
            />);
        }
        const className = classNames("mx_MessageHoverActionBar")
        // aria-live=off to not have this read out automatically as navigating around timeline, gets repetitive.
        return (
            <Toolbar 
                className={className}                    
                aria-label={_t("Message Actions")} 
                aria-live="off"
            >
                {toolbarOpts}
            </Toolbar>
        )
    }
}
