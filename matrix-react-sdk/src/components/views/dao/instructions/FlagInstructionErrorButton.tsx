import React from 'react'
import { flagInstructionError } from '../../../../actions/flagInstructionError'
import {
  InstructionExecutionStatus,
  Proposal,
  ProposalTransaction,
  TokenOwnerRecord,
} from '@solana/spl-governance'
import { ProgramAccount } from '@solana/spl-governance'
import { RpcContext } from '@solana/spl-governance'
import useRealm from '../../../../hooks/useRealm'
import useWalletStore from '../../../../stores/vote/useWalletStore'
import { PlayState } from './ExecuteInstructionButton'
import { ExclamationCircleIcon } from '@heroicons/react/solid'
import { notify } from '../../../../utils/vote/notifications'
import { PublicKey } from '@solana/web3.js'
import { getProgramVersionForRealm } from '../../../../apis/registry/api'
import AccessibleTooltipButton from '../../elements/AccessibleTooltipButton'

export function FlagInstructionErrorButton({
  proposal,
  proposalInstruction,
  playState,
  proposalAuthority,
}: {
  proposal: ProgramAccount<Proposal>
  proposalInstruction: ProgramAccount<ProposalTransaction>
  playState: PlayState
  proposalAuthority: ProgramAccount<TokenOwnerRecord> | undefined
}) {
  const { realmInfo } = useRealm()
  const wallet = useWalletStore((s) => s.current)
  const connection = useWalletStore((s) => s.connection)

  if (
    playState !== PlayState.Error ||
    proposalInstruction.account.executionStatus !==
      InstructionExecutionStatus.Error ||
    !proposalAuthority
  ) {
    return null
  }

  const onFlagError = async () => {
    try {
      const rpcContext = new RpcContext(
        new PublicKey(proposal.owner.toString()),
        getProgramVersionForRealm(realmInfo!),
        wallet!,
        connection.current,
        connection.endpoint
      )

      await flagInstructionError(
        rpcContext,
        proposal,
        proposalInstruction.pubkey
      )
    } catch (error) {
      notify({
        type: 'error',
        message: 'could not flag as broken',
        description: `${error}`,
      })
    }
  }

  return (
    <AccessibleTooltipButton 
        title="Flag instruction as broken"
        className="mx_FlagInstructionErrorButton"
        onClick={onFlagError}
    >
        <ExclamationCircleIcon className='mx_FlagInstructionErrorButton_icon' />
    </AccessibleTooltipButton>
  )
}
