import React, { useContext, useEffect, useState } from 'react'
import {
  createSetRealmConfig,
  Governance,
  ProgramAccount,
  serializeInstructionToBase64,
} from '@solana/spl-governance'
import { validateInstruction } from '../../../../../utils/vote/instructionTools'
import { UiInstruction } from '../../../../../utils/vote/uiTypes/proposalCreationTypes'

import useWalletStore from '../../../../../stores/vote/useWalletStore'

import { NewProposalContext } from '../NewProposal'
import useRealm from '../../../../../hooks/useRealm'
import { parseMintNaturalAmountFromDecimalAsBN } from '../../../../../tools/sdk/units'
import {
  GovernedMultiTypeAccount,
  parseMintSupplyFraction,
} from '../../../../../utils/vote/tokens'
import { PublicKey } from '@solana/web3.js'
import { getRealmCfgSchema } from '../../../../../utils/vote/validations'
import RealmConfigFormComponent from '../forms/RealmConfigFormComponent'
import useGovernedMultiTypeAccounts from '../../../../../hooks/useGovernedMultiTypeAccounts'

export interface RealmConfigForm {
  governedAccount: GovernedMultiTypeAccount | undefined
  minCommunityTokensToCreateGovernance: number
  communityVoterWeightAddin: string
  removeCouncil: boolean
  maxCommunityVoterWeightAddin: string
  communityMintSupplyFactor: number
}

const RealmConfig = ({
  index,
  governance,
}: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const { realm, mint, realmInfo } = useRealm()
  const wallet = useWalletStore((s) => s.current)
  const shouldBeGoverned = index !== 0 && governance
  const { governedMultiTypeAccounts } = useGovernedMultiTypeAccounts()
  const realmAuthority = governedMultiTypeAccounts.find(
    (x) =>
      x.governance.pubkey.toBase58() === realm?.account.authority?.toBase58()
  )
  const [form, setForm] = useState<RealmConfigForm>()
  const [formErrors, setFormErrors] = useState({})
  const { handleSetInstructions } = useContext(NewProposalContext)
  async function getInstruction(): Promise<UiInstruction> {
    const isValid = await validateInstruction({ schema, form, setFormErrors })
    let serializedInstruction = ''
    if (
      isValid &&
      form!.governedAccount?.governance?.account &&
      wallet?.publicKey &&
      realm
    ) {
      const mintAmount = parseMintNaturalAmountFromDecimalAsBN(
        form!.minCommunityTokensToCreateGovernance!,
        mint!.decimals!
      )
      const instruction = await createSetRealmConfig(
        realmInfo!.programId,
        realmInfo!.programVersion!,
        realm.pubkey,
        realm.account.authority!,
        form?.removeCouncil ? undefined : realm?.account.config.councilMint,
        parseMintSupplyFraction(form!.communityMintSupplyFactor.toString()),
        mintAmount,
        form!.communityVoterWeightAddin
          ? new PublicKey(form!.communityVoterWeightAddin)
          : undefined,
        form?.maxCommunityVoterWeightAddin
          ? new PublicKey(form.maxCommunityVoterWeightAddin)
          : undefined,
        wallet.publicKey
      )
      serializedInstruction = serializeInstructionToBase64(instruction)
    }
    const obj: UiInstruction = {
      serializedInstruction: serializedInstruction,
      isValid,
      governance: form!.governedAccount?.governance,
    }
    return obj
  }
  useEffect(() => {
    handleSetInstructions(
      { governedAccount: form?.governedAccount?.governance, getInstruction },
      index
    )
  }, [form])
  const schema = getRealmCfgSchema({ form })

  return (
    <>
      {realmAuthority && (
        <RealmConfigFormComponent
          setForm={setForm}
          setFormErrors={setFormErrors}
          formErrors={formErrors}
          shouldBeGoverned={!!shouldBeGoverned}
          governedAccount={realmAuthority}
          form={form}
        ></RealmConfigFormComponent>
      )}
    </>
  )
}

export default RealmConfig
