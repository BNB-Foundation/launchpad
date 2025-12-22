'use client'

import { formatEther } from 'viem'
import { TxButton } from './TxButton'
import { useClaim, useRefund } from '@/hooks/usePresale'
import { PresaleState } from '@/lib/contracts'
import type { Address } from 'viem'

interface ClaimButtonProps {
  presaleAddress: Address
  userContribution: bigint
  hasClaimed: boolean
  presaleState: number
  rate: bigint
}

export function ClaimButton({
  presaleAddress,
  userContribution,
  hasClaimed,
  presaleState,
  rate,
}: ClaimButtonProps) {
  const { claim, isPending: isClaimPending, isConfirming: isClaimConfirming, isSuccess: isClaimSuccess } = useClaim(presaleAddress)
  const { refund, isPending: isRefundPending, isConfirming: isRefundConfirming, isSuccess: isRefundSuccess } = useRefund(presaleAddress)

  if (userContribution === BigInt(0)) {
    return null
  }

  const tokenAmount = (userContribution * rate) / BigInt(1e18)

  if (presaleState === PresaleState.Finalized && !hasClaimed) {
    return (
      <div className="bg-zinc-800/50 rounded-lg p-6 space-y-4">
        <div className="text-center">
          <p className="text-sm text-zinc-400 mb-1">Your claimable amount</p>
          <p className="text-2xl font-bold text-orange-500">
            {formatEther(tokenAmount)} Tokens
          </p>
        </div>
        <TxButton
          onClick={claim}
          loading={isClaimPending || isClaimConfirming}
          success={isClaimSuccess}
          className="w-full"
        >
          Claim Tokens
        </TxButton>
      </div>
    )
  }

  if (presaleState === PresaleState.Cancelled ||
      (presaleState === PresaleState.Pending && userContribution > BigInt(0))) {
    return (
      <div className="bg-zinc-800/50 rounded-lg p-6 space-y-4">
        <div className="text-center">
          <p className="text-sm text-zinc-400 mb-1">Your refundable amount</p>
          <p className="text-2xl font-bold text-orange-500">
            {formatEther(userContribution)} BNB
          </p>
        </div>
        <TxButton
          onClick={refund}
          loading={isRefundPending || isRefundConfirming}
          success={isRefundSuccess}
          variant="secondary"
          className="w-full"
        >
          Claim Refund
        </TxButton>
      </div>
    )
  }

  if (hasClaimed) {
    return (
      <div className="bg-zinc-800/50 rounded-lg p-6 text-center">
        <p className="text-zinc-400">
          ✓ You have already claimed your tokens
        </p>
      </div>
    )
  }

  return null
}
