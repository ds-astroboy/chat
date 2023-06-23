/*
Copyright 2017 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2020, 2021 The Matrix.org Foundation C.I.C.

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

import React, { useState, useEffect, FunctionComponent, useMemo } from "react";

import { _t } from "../../../languageHandler";
import BaseDialog from "./BaseDialog";
import dis from "../../../dispatcher/dispatcher";
import Lottie from "lottie-react";
import {
    getParsedNftAccountsByOwner,
    isValidSolanaAddress,
} from "@nfteyez/sol-rayz";
import classNames from "classnames";
import { sendSolTransaction } from "./SolInstruction/sendSolTransaction";
import {
    SystemProgram,
    Transaction,
    PublicKey,
    LAMPORTS_PER_SOL,
    Connection,
} from "@solana/web3.js";
import { ErrorType } from "../../../@types/error-type";
import { getUserPoints, sendPointsToCreator } from "../../../apis";
import { currenciesInfo, solanaCurrencyList, ethCurrencyList, maticCurrencyList } from "../../../@variables/currencies";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { solTransfer } from "../../../blockchain/solana/solTransfer.js";
import { sendSplToken } from "../../../blockchain/solana/spl-token-transfer"
import { titleString } from "../../../utils/strings";
import Moralis  from 'moralis';
import { EvmChain } from '@moralisweb3/evm-utils';
import Web3 from 'web3';
import { ENSDOMAINCONTRACTADDRESS, PROVIDERNAMES } from "../../../@variables/common";
import AccessibleButton from "../elements/AccessibleButton";
import { useLocalStorageState } from "../../../hooks/useLocalStorageState";

interface IProps {
  roomId: string;
  userId: string;
  wallet: any;
  connection: Connection | null;
  barrierInfo: any;
  accessToken: string;
  joinClick(): void;
  onFinished(): void;
  setIsLoading: (isLoading: boolean) => void;
  setShowConfirmation?: (value: boolean) => void;
}

const BarrierCheckDialog: FunctionComponent<IProps> = (props: IProps) => {
  const [barrierType, setBarrierType] = useState("");
  const [publicKey, setPublicKey] = useState(null);
  const [notAllowCheck, setNotAllowCheck] = useState(false);
  const [currencyList, setCurrencyList] = useState(solanaCurrencyList);
  // const [provider, setProvider] = useLocalStorageState("provider", null);
  const wallet = props.wallet;
  const connection = props.connection;
  const web3 = useMemo(() => { 
    return props.wallet?.active ? new Web3(props.wallet?.library.provider) : null;
  }, [props.wallet]);

  useEffect(() => {
    if(props.barrierInfo.type === "nft.check" && !props.barrierInfo["hard_barrier"]) {
      props.onFinished();
      console.log({
        barrier: props.barrierInfo
      })
      props.joinClick();
    }
  }, [props.barrierInfo])

  useEffect(() => {
    setBarrierType(props.barrierInfo.type);
    setPublicKey(wallet?.publicKey);
    let walletResult =
      (props.barrierInfo.type === ErrorType.NftCheck ||
        props.barrierInfo.type === ErrorType.WalletCheck ||
        barrierType === ErrorType.WalletPay) &&
      (!wallet?.publicKey && !wallet?.active);
    setNotAllowCheck(walletResult);
    // if(provider === "solana") {
      setCurrencyList(solanaCurrencyList);
    // }
    // else {
    //   setCurrencyList([...ethCurrencyList, ...maticCurrencyList]);
    // }
  }, []);

  useEffect(() => {
    if (wallet?.publicKey) {
      setPublicKey(wallet.publicKey);
      let walletResult =
        (props.barrierInfo.type === props.barrierInfo.type.NftCheck ||
          props.barrierInfo.type === ErrorType.WalletCheck ||
          barrierType === ErrorType.WalletPay) &&
        (!wallet?.publicKey && !wallet?.active);
      setNotAllowCheck(walletResult);
    }
  }, [wallet, connection]);

  const fetchNFTsFromWallet = async(address: string) => {
    let nfts  = [];
    try {
        const chain = EvmChain.ETHEREUM;
        await Moralis.start({
            apiKey: 'pUgcpsAH4jAR8Jq5Fkx9pjHLTxf1MwD6gn7qQmkyRUqZD70hxyksgajX2EZJ0kP3',
        });
        let response = await Moralis.EvmApi.nft.getWalletNFTs({
            address,
            chain,
        });
        let nftData = response.toJSON();
        if(nftData.length) {
            nftData.forEach((item) => {
                if(item && item?.tokenAddress !== ENSDOMAINCONTRACTADDRESS) {
                    let metadata = item.metadata;
                    metadata.tokenAddress = item.tokenAddress;
                    nfts.push(metadata);
                }
            })
        }
    }
    catch(e) {
        console.error(e);
    }
    return nfts
  }

  const showHomePage = (): void => {
    dis.dispatch({ action: "view_home_page" });
    props.onFinished();
  };

  const showErrorModal = (type): void => {
    dis.dispatch({
      action: "view_common_error_dialog",
      type,
    });
  };

  const getAllNftData = async () => {
    try {
      let ownerToken = wallet.publicKey.toBase58();
      const result = isValidSolanaAddress(ownerToken);
      if(result) {
          const nfts = await getParsedNftAccountsByOwner({
            publicAddress: ownerToken,
            connection,
          });
          return nfts;
      }
      else return []
    } catch (error) {
      console.warn(error);
      return [];
    }
  };

  // TODO Get Aptos NFT Data
  const getAptosNftData = async () => {
    try {
      let ownerToken = wallet.publicKey.toBase58();
      const result = isValidSolanaAddress(ownerToken);
      if(result) {
          const nfts = await getParsedNftAccountsByOwner({
            publicAddress: ownerToken,
            connection,
          });
          return nfts;
      }
      else return []
    } catch (error) {
      console.warn(error);
      return [];
    }
  };

  const checkSolanaNFT = async() => {
    let isExist = false;
    try {
      const nftsData = await getAllNftData();
      if (nftsData?.length) {
        nftsData.map((item) => {
          if (item.updateAuthority === props.barrierInfo.nft_update_auth_addr) {
            isExist = true;
          }
        });
      }
    } catch (e) {
      console.warn(e);
    }
    return isExist;
  }

  // TODO Add CheckAptosNFT
  const checkAptosNFT = async() => {
    let isExist = false;
    try {
      const nftsData = await getAptosNFTData();
      if (nftsData?.length) {
        nftsData.map((item) => {
          if (item.updateAuthority === props.barrierInfo.nft_update_auth_addr) {
            isExist = true;
          }
        });
      }
    } catch (e) {
      console.warn(e);
    }
    return isExist;
  }

  const checkEthNFT = async() => {
    let isExist = false;
    try {
      const nftsData = await fetchNFTsFromWallet(wallet.account);
      nftsData.map((item) => {
        if (item.tokenAddress === props.barrierInfo.nft_update_auth_addr) {
          isExist = true;
        }
      });
    }
    catch(e) {
      console.warn(e);
    }
    return isExist;
  }

  const checkNftInWallet = async () => {
    let result = false;
    // if(provider === PROVIDERNAMES.SOLANA) {
      result = await checkSolanaNFT()
    // }
    // else {
    //   result = await checkEthNFT();
    // }
    return result    
  };

  const checkSolInWallet = async() => {
    try {
      let balance = await connection.getBalance(publicKey);
      let totalSol = balance / LAMPORTS_PER_SOL;
      if (props.barrierInfo.amount <= totalSol) {
        return true;
      } else return false;
    } catch (e) {
      console.warn(e);
      return false;
    }
  }

  const getAllSplTokens = async() => {
    try {
      const accounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
        programId: TOKEN_PROGRAM_ID
      })
      if(accounts && accounts.value) {
        return accounts.value;
      }
      else {
        return null
      }       
    }
    catch(e) {
      return null
    }
  }

  const checkSplTokenInWallet = async() => {
    let result = false;
    try {
      const splTokenAccounts = await getAllSplTokens();
      let mintAddress = currenciesInfo[props.barrierInfo.currency_type].mintAddress;
      if(splTokenAccounts && splTokenAccounts.length) {
        splTokenAccounts.map((account) => {
          if(account.account.data.parsed?.info?.mint === mintAddress && account.account.data.parsed?.info?.tokenAmount?.uiAmount >= props.barrierInfo.amount) {
            result = true;
          }
        })
      }
    } catch (e) {
      console.warn(e);
    }
    return result;
  }

  const checkEthInWallet = async(chain) => {
    let result = false;
    try {
      await Moralis.start({
        apiKey: 'pUgcpsAH4jAR8Jq5Fkx9pjHLTxf1MwD6gn7qQmkyRUqZD70hxyksgajX2EZJ0kP3',
      });
      const response = await Moralis.EvmApi.balance.getNativeBalance({
        address: wallet?.account,
        chain,
      })
      const balance = parseInt(response?.data.balance) / 10**18;
      console.log("balance==================", balance);
      if (props.barrierInfo.amount <= balance) {
        result = true;
      } 
    }
    catch(e) {
      console.warn(e);
    }
    return result;
  }

  // const checkEthCurrencies = async() => {
  //   console.log("wallet===============", wallet);
  //   await Moralis.start({
  //     apiKey: 'pUgcpsAH4jAR8Jq5Fkx9pjHLTxf1MwD6gn7qQmkyRUqZD70hxyksgajX2EZJ0kP3',
  //   });
  //   const balances = await Moralis.EvmApi.token.getWalletTokenBalances({
  //     address: wallet?.account,
  //     chain,
  //   });
  //   console.log("balances==================", balances);
  // }

  const checkCryptoInWallet = async () => {
    // if(props.barrierInfo.r_protocol === PROVIDERNAMES.SOLANA) {
      if(props.barrierInfo.currency_type === currencyList[0]) {
        return await checkSolInWallet();
      }
      else {
        return await checkSplTokenInWallet();
      }    
    // }
    // else {
    //   let chain = EvmChain.ETHEREUM
    //   if(props.barrierInfo.currency_type === "Matic") {
    //     chain = EvmChain.MUMBAI;
    //   }
    //   return await checkEthInWallet(chain);
    // }
  };
  
  const erc20Transfer = async () => {
    try  {
      await web3.eth.sendTransaction({
        from: props.wallet?.account,
        to: props.barrierInfo?.creator,
        value: (props.barrierInfo.amount * 10**18),
      })
      return true
    }
    catch(e) {
      console.warn(e);
      return false
    }
  }

  const sendCryptoToCreator = async () => {
    let payResult = false;
    // if(props.barrierInfo.r_protocol === PROVIDERNAMES.SOLANA) {
      if(props.barrierInfo.currency_type === PROVIDERNAMES.SOLANA) {
        payResult = await solTransfer(
          wallet.publicKey, 
          props.barrierInfo.creator, 
          props.barrierInfo.amount,
          wallet,
          connection,
          null,
          null,
          props.setShowConfirmation
        )
      }
      else {
        const { result, error } = await sendSplToken(
          wallet.publicKey,
          props.barrierInfo.creator,
          wallet.publicKey,
          currenciesInfo[props.barrierInfo.currency_type].mintAddress,
          props.barrierInfo.amount,
          connection,
          wallet,
          null,
          null,
          props.setShowConfirmation
        )
        payResult = result;
      }
    // }
    // else {
    //   payResult = await erc20Transfer();
    // }
    return payResult
  };

  const payCryptoInWallet = async () => {
    try {
      let isValidAmount = await checkCryptoInWallet();
      if (!isValidAmount) return false;
      let sendResult = await sendCryptoToCreator();
      if (sendResult) return true;
      else return false;
    } catch (e) {
      console.warn(e);
      return false;
    }
  };

  const checkPointsAmount = async () => {
    let result = false;
    try {
      if (props.accessToken) {
        let userPoints = await getUserPoints(props.accessToken, props.userId);
        if (userPoints >= props.barrierInfo.amount) result = true;
      }
    } catch (e) {
      console.warn(e);
    }
    return result;
  };

  const sendPoints = async () => {
    let result = sendPointsToCreator(
      props.userId,
      props.roomId,
      props.barrierInfo.amount,
      props.accessToken
    );
    return result;
  };

  const payPointsAmount = async () => {
    try {
      let isValidAmount = await checkPointsAmount();
      if (!isValidAmount) return false;
      let sendResult = await sendPoints();
      return sendResult;
    } catch (e) {
      console.warn(e);
      return false;
    }
  };

  const walletCheck = async () => {
    if (notAllowCheck) {
      showErrorModal(ErrorType.WalletConnect);
      return;
    }
    let result = false;
    props.onFinished();
    props.setIsLoading(true);
    switch (barrierType) {
      case "nft.check":
        result = await checkNftInWallet();
        break;
      case "wallet.check":
        result = await checkCryptoInWallet();
        break;
      case "wallet.pay":
        result = await payCryptoInWallet();
        break;
      case "points.check":
        result = await checkPointsAmount();
        break;
      case "points.pay":
        result = await payPointsAmount();
        break;
    }
    props.setIsLoading(false);
    if (result) {
      props.joinClick();
    } else {
      showErrorModal(barrierType);
    }
  };

  let lottieBackground = (
    <div className="mx_CurrencyBarrierWalletCheck_bg">
      <Lottie animationData={require("../../../../res/img/data_v_2.json")} />
    </div>
  );

  let statement;
  let barrierContainer;
  let enterButtonContent;
  switch (barrierType) {
    case "wallet.check":
      statement = (
        <div className="mx_CurrencyBarrierWalletCheck_statement">
          <div className="mx_CurrencyBarrierWalletCheck_statement1">
            <span>{currenciesInfo[props.barrierInfo.currency_type]?.symbol?.toUpperCase()}</span> balance check required
          </div>
        </div>
      );
      enterButtonContent = `Check Balance`;
    case "wallet.pay":
      if (barrierType == "wallet.pay") {
        statement = (
          <div className="mx_CurrencyBarrierWalletCheck_statement">
            <div className="mx_CurrencyBarrierWalletCheck_statement1">
              <span>{currenciesInfo[props.barrierInfo.currency_type]?.symbol?.toUpperCase()}</span> pay required
            </div>
          </div>
        );
        enterButtonContent = `Pay to Enter`;
      }
      barrierContainer = (
        <div className="mx_CurrencyBarrierWalletCheck_currencyBarrier">
          <div className="mx_CurrencyBarrierWalletCheck_barrierInfo">
            <div className="mx_CurrencyBarrierWalletCheck_requireSol">
              {props.barrierInfo.amount}
            </div>
            <div className="mx_CurrencyBarrierWalletCheck_CurrencyInfo">
              <div className="mx_CurrencyBarrierWalletCheck_currency_Logo">
                <img src={currenciesInfo[props.barrierInfo.currency_type]?.logo} />
              </div>
              <div className="mx_CurrencyBarrierWalletCheck_currency_NameAndSymbol">
                {`${titleString(currenciesInfo[props.barrierInfo.currency_type]?.symbol)}`}
              </div>
            </div>
            
          </div>
        </div>
      );
      break;
    case "points.check":
      statement = (
        <div className="mx_CurrencyBarrierWalletCheck_statement">
          <div className="mx_CurrencyBarrierWalletCheck_statement1">
            <span>Cafeteria Credits</span> balance check required
          </div>
        </div>
      );
      enterButtonContent = `Check Balance`;
    case "points.pay":
      if (barrierType == "points.pay") {
        statement = (
          <div className="mx_CurrencyBarrierWalletCheck_statement">
            <div className="mx_CurrencyBarrierWalletCheck_statement1">
              <span>Cafeteria Credits</span> pay required
            </div>
          </div>
        );
        enterButtonContent = `Pay to Enter`;
      }
      barrierContainer = (
        <div className="mx_CurrencyBarrierWalletCheck_currencyBarrier">
          <div className="mx_CurrencyBarrierWalletCheck_barrierInfo">
            <div className="mx_CurrencyBarrierWalletCheck_requireSol">
              {props.barrierInfo.amount}
            </div>
            <div className="mx_CurrencyBarrierWalletCheck_CurrencyInfo">
              <div className="mx_CurrencyBarrierWalletCheck_currency_Logo">
                <img src={require("../../../../res/img/cafeteria-point.png")} />
              </div>
              <div className="mx_CurrencyBarrierWalletCheck_currency_NameAndSymbol">
                {`Cafeteria Credits`}
              </div>
            </div>
          </div>
        </div>
      );
      break;
    case "nft.check":
      statement = (
        <div className="mx_CurrencyBarrierWalletCheck_statement">
          <div className="mx_CurrencyBarrierWalletCheck_statement1">
            <span>NFT</span> ownership verification required
          </div>
        </div>
      );
      barrierContainer = (
        <div className="mx_CurrencyBarrierWalletCheck_currencyBarrier">
          <div className="mx_CurrencyBarrierWalletCheck_barrierInfo nft_barrier">
            <div className="mx_CurrencyBarrierWalletCheck_barrierInfo_item">
              <img src={props.barrierInfo.uri} />
            </div>
          </div>
        </div>
      );
      enterButtonContent = `Verify Ownership`;
      break;
    case "domain.check":
      statement = (
        <div className="mx_CurrencyBarrierWalletCheck_statement">
          <div className="mx_CurrencyBarrierWalletCheck_statement1">
            {`This room requires chatters to hodl a bonfida .SOL Domain to enter`}
          </div>
          <div className="mx_CurrencyBarrierWalletCheck_statement2">
            To learn more about .SOL domains, check out <a href="https://naming.bonfida.org/">https://naming.bonfida.org/</a>
          </div>
        </div>
      );
      enterButtonContent = `Verify Ownership`;
      break;
  }

  const barrierCheckButtonClassName = classNames(
    "mx_CurrencyBarrierWalletCheck_bt",
    "wallet_check_button",
    "common-btn",
    "bg-green",
    "btn-hover-purple",
    "px-4"
  );

  let buttonGroup = (
    <div className="mx_CurrencyBarrierWalletCheck_button_group">
      <AccessibleButton 
        className="mx_CurrencyBarrierWalletCheck_bt preview_button common-btn bg-grey disabled px-4"
        disabled
        onClick={null}
      >
        Preview Room
      </AccessibleButton>
      <AccessibleButton 
        className={barrierCheckButtonClassName}
        onClick={walletCheck}
      >
        {enterButtonContent}
      </AccessibleButton>
    </div>
  );

  const dialogClassName = classNames("mx_CurrencyBarrierWalletCheck");
  
  return (
    <BaseDialog
      className={dialogClassName}
      title="Exclusive Group"
      onFinished={showHomePage}
    >
      {lottieBackground}
      {statement}
      {barrierContainer}
      {buttonGroup}
    </BaseDialog>
  );
};
export default BarrierCheckDialog;
