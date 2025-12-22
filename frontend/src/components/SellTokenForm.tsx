'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import { TxButton } from './TxButton'
import { useSellTokens, useBnbForTokens, useUserTokenBalance } from '@/hooks/useBondingCurve'
import type { Address } from 'viem'

interface SellTokenFormProps {
  launchAddress: Address
  tokenAddress: Address
  tokenSymbol?: string
  enableSell: boolean
}

const SLIPPAGE_OPTIONS = [
  { label: '1%', value: 1 },
  { label: '5%', value: 5 },
  { label: '10%', value: 10 },
]

export function SellTokenForm({
  launchAddress,
  tokenAddress,
  tokenSymbol = 'TOKEN',
  enableSell,
}: SellTokenFormProps) {
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState(5) // Default 5%
  const { address } = useAccount()

  const { data: tokenBalance } = useUserTokenBalance(launchAddress, tokenAddress)
  const { sellTokens, isPending, isConfirming, isSuccess } = useSellTokens(launchAddress)

  // Calculate BNB out based on token amount
  const tokenAmountBigInt = amount && parseFloat(amount) > 0 ? parseEther(amount) : 0n
  const { data: bnbOut } = useBnbForTokens(launchAddress, tokenAmountBigInt)

  const handleMax = () => {
    if (!tokenBalance) return
    setAmount(formatEther(tokenBalance))
  }

  const handleSell = () => {
    if (!amount || !bnbOut) return

    // Calculate minimum BNB with slippage tolerance
    const minBnbOut = (bnbOut * BigInt(100 - slippage)) / 100n

    sellTokens(parseEther(amount), minBnbOut)
  }

  const isValidAmount = () => {
    if (!amount || !tokenBalance) return false
    try {
      const amountBigInt = parseEther(amount)
      if (amountBigInt <= 0n) return false
      if (amountBigInt > tokenBalance) return false
      return true
    } catch {
      return false
    }
  }

  // Reset form on success
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        setAmount('')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isSuccess])

  if (!address) {
    return (
      <div className="bg-zinc-800/50 rounded-lg p-6 text-center border border-zinc-700">
        <p className="text-zinc-400">Connect your wallet to sell tokens</p>
      </div>
    )
  }

  if (!enableSell) {
    return (
      <div className="bg-zinc-800/50 rounded-lg p-6 text-center border border-zinc-700">
        <p className="text-zinc-400">Selling is disabled for this launch</p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-800/50 rounded-lg p-6 space-y-4 border border-zinc-700">
      <h3 className="text-lg font-semibold">Sell {tokenSymbol}</h3>

      {/* Token Amount Input */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-zinc-300">Amount ({tokenSymbol})</label>
          <button
            onClick={handleMax}
            className="text-sm text-orange-500 hover:text-orange-400 transition-colors font-medium"
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
          min="0"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-orange-500 transition-colors"
        />
        <div className="flex justify-between mt-2 text-sm text-zinc-400">
          <span>Balance: {tokenBalance ? formatEther(tokenBalance).slice(0, 10) : '0'} {tokenSymbol}</span>
        </div>
      </div>

      {/* BNB Out Display */}
      {bnbOut && bnbOut > 0n && (
        <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">You will receive</span>
            <span className="text-lg font-bold text-orange-500">
              {formatEther(bnbOut).slice(0, 10)} BNB
            </span>
          </div>
          {slippage > 0 && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-zinc-500">Minimum received (with slippage)</span>
              <span className="text-sm text-zinc-400">
                {formatEther((bnbOut * BigInt(100 - slippage)) / 100n).slice(0, 10)} BNB
              </span>
            </div>
          )}
        </div>
      )}

      {/* Slippage Tolerance Selector */}
      <div>
        <label className="text-sm font-medium text-zinc-300 mb-2 block">Slippage Tolerance</label>
        <div className="flex gap-2">
          {SLIPPAGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSlippage(option.value)}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                slippage === option.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sell Button */}
      <TxButton
        onClick={handleSell}
        disabled={!isValidAmount() || !bnbOut}
        loading={isPending || isConfirming}
        success={isSuccess}
        className="w-full"
        variant="danger"
      >
        Sell {tokenSymbol}
      </TxButton>

      {/* Error Messages */}
      {!isValidAmount() && amount && (
        <p className="text-sm text-red-400 text-center">
          Invalid amount. Check your balance.
        </p>
      )}
    </div>
  )
}
