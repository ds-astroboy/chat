import { useWallet } from "@solana/wallet-adapter-react";
import React, { FC, useEffect } from "react";
import handleGovernanceAssetsStore from "../../../hooks/handleGovernanceAssetsStore";
import useGovernanceAssets from "../../../hooks/useGovernanceAssets";
import { usePrevious } from "../../../hooks/usePrevious";
import useRealm from "../../../hooks/useRealm";
import { useVotingPlugins, vsrPluginsPks } from "../../../hooks/useVotingPlugins";
import useTreasuryAccountStore from "../../../stores/vote/useTreasuryAccountStore";
import useVotePluginsClientStore from "../../../stores/vote/useVotePluginsClientStore";
import useWalletStore from "../../../stores/vote/useWalletStore";
import useMarketStore from "../../../Strategies/store/marketStore";
import tokenService from "../../../utils/vote/services/token";
import useDepositStore from "../../../VoteStakeRegistry/stores/useDepositStore";
import { useLocalStorageState } from "../../../hooks/useLocalStorageState";
import { useDispatch } from "react-redux";
import { useWeb3React } from "@web3-react/core";
import { Connection } from "@solana/web3.js";
import allActions from "../../../redux/actions";
import { connectors } from "../../../blockchain/ethereum/connectors";
interface IProps {
    children: any;
}
const WalletProvider: FC<IProps> = (props) => {
    const wallet = useWallet();
    useVotingPlugins();
    const {set: setUseWalletStore, actions} = useWalletStore(state => state);
    handleGovernanceAssetsStore();
    const { nftsGovernedTokenAccounts } = useGovernanceAssets();
    const { getNfts } = useTreasuryAccountStore();
    const { realm, realmInfo, symbol, ownTokenRecord, config } = useRealm();
    const { getOwnedDeposits, resetDepositState } = useDepositStore()
    const prevStringifyNftsGovernedTokenAccounts = usePrevious(
        JSON.stringify(nftsGovernedTokenAccounts)
    )
    const connection = useWalletStore((s) => s.connection)
    const client = useVotePluginsClientStore((s) => s.state.vsrClient)
    const { loadMarket } = useMarketStore()

    const [provider,] = useLocalStorageState("provider", null);
    const reduxDispatch = useDispatch();

    const {
        library,
        chainId,
        account,
        activate,
        deactivate,
        active,
    } = useWeb3React();

    useEffect(() => {
        let wallets = [];
        if (wallet.connected) {
            let solanaWallet = {
                type: "solana",
                connection: new Connection("https://rpc.helius.xyz/?api-key=f0d1b5da-e7dd-48a0-994b-0ec919294917"),
                ...wallet
            }
            wallets.push(solanaWallet);
        }
        if (active) {
            let ethWallet = {
                type: "ethereum",
                library,
                chainId,
                account,
                activate,
                deactivate,
                active
            }
            wallets.push(ethWallet);
        }
        reduxDispatch(allActions.walletActions.setWallets(wallets));
    }, [wallet.connected, active, chainId])

    useEffect(() => {
        if (provider) {
            (async() => {
                const connector = connectors[provider];
                try {
                    if (typeof connector?.isAuthorized === 'function') {
                      await connector.isAuthorized()
                      .then(async(isAuthorized) => {
                        if(isAuthorized) {
                          await activate(connector)
                        }
                      })
                    }
                    else {
                      await activate(connector)
                    }
                } catch (error) {
                    console.error(error)
                }
            })();
        }
    }, [activate])

    React.useEffect(() => {
      if(wallet.connected) {
        setUseWalletStore((state) => {
              state.connected = true
          })
          fetchWalletState();
      }
      else {
        setUseWalletStore((state) => {
              state.connected = false
              state.tokenAccounts = []
          })
      }
    }, [wallet]);

    const fetchWalletState = async() => {
      await actions.fetchWalletTokenAccounts()
      await actions.fetchOwnVoteRecords()
    }

    useEffect(() => {
        if (realm?.pubkey) {
          loadMarket(connection, connection.cluster)
        }
    }, [connection.cluster, realm?.pubkey.toBase58()])

    useEffect(() => {
        tokenService.fetchSolanaTokenList();
    }, [])

    useEffect(() => {
        if (
          realm &&
          config?.account.communityVoterWeightAddin &&
          vsrPluginsPks.includes(
            config.account.communityVoterWeightAddin.toBase58()
          ) &&
          realm.pubkey &&
          wallet?.connected &&
          client
        ) {
          getOwnedDeposits({
            realmPk: realm!.pubkey,
            communityMintPk: realm!.account.communityMint,
            walletPk: wallet!.publicKey!,
            client: client!,
            connection: connection.current,
          })
        } else if (!wallet?.connected) {
          resetDepositState()
        }
      }, [
        realm?.pubkey.toBase58(),
        ownTokenRecord?.pubkey.toBase58(),
        wallet?.connected,
        client,
      ])

    useEffect(() => {
        if (
          prevStringifyNftsGovernedTokenAccounts !==
            JSON.stringify(nftsGovernedTokenAccounts) &&
          realm?.pubkey
        ) {
          getNfts(nftsGovernedTokenAccounts, connection.current)
        }
    }, [JSON.stringify(nftsGovernedTokenAccounts), realm?.pubkey.toBase58()])

    useEffect(() => {
        if(wallet && wallet.publicKey) {
            setUseWalletStore((s) => {
                s.current = wallet;
                s.connected = true;
            })
        }
        else {
            setUseWalletStore((s) => {
                s.current = null;
                s.connected = false;
            })
        }
    }, [wallet]);

    return (
        props.children
    )
}

export default WalletProvider;