'use client'

import { useState } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'viem'
import { TxButton } from './TxButton'
import { useContribute } from '@/hooks/usePresale'
import type { Address } from 'viem'

interface ContributionFormProps {
  presaleAddress: Address
  minContribution: bigint
  maxContribution: bigint
  userContribution: bigint
}

export function ContributionForm({
  presaleAddress,
  minContribution,
  maxContribution,
  userContribution,
}: ContributionFormProps) {
  const [amount, setAmount] = useState('')
  const { address } = useAccount()
  const { data: balance } = useBalance({ address })

  const { contribute, isPending, isConfirming, isSuccess } = useContribute(presaleAddress)

  const handleMax = () => {
    if (!balance) return
    const remaining = maxContribution - userContribution
    const maxAmount = balance.value < remaining ? balance.value : remaining
    setAmount(formatEther(maxAmount))
  }

  const handleContribute = () => {
    if (!amount) return
    contribute(amount)
  }

  const isValidAmount = () => {
    if (!amount || !balance) return false
    try {
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1e18))
      const newTotal = userContribution + amountBigInt

      if (amountBigInt < minContribution) return false
      if (newTotal > maxContribution) return false
      if (amountBigInt > balance.value) return false

      return true
    } catch {
      return false
    }
  }

  if (!address) {
    return (
      <div className="bg-zinc-800/50 rounded-lg p-6 text-center">
        <p className="text-zinc-400">Connect your wallet to contribute</p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-800/50 rounded-lg p-6 space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium">Amount (BNB)</label>
          <button
            onClick={handleMax}
            className="text-sm text-orange-500 hover:text-orange-400 transition-colors"
          >
            MAX
          </button>
        </div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          step="0.01"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-orange-500 transition-colors"
        />
        <div className="flex justify-between mt-2 text-sm text-zinc-400">
          <span>Balance: {balance ? formatEther(balance.value).slice(0, 8) : '0'} BNB</span>
          <span>
            Your contribution: {formatEther(userContribution).slice(0, 8)} BNB
          </span>
        </div>
      </div>

      <TxButton
        onClick={handleContribute}
        disabled={!isValidAmount()}
        loading={isPending || isConfirming}
        success={isSuccess}
        className="w-full"
      >
        Contribute
      </TxButton>

      {!isValidAmount() && amount && (
        <p className="text-sm text-red-400 text-center">
          Invalid amount. Check min/max contribution limits.
        </p>
      )}
    </div>
  )
}
