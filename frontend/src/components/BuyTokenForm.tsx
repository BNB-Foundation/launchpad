'use client'

import { useState, useEffect } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import { TxButton } from './TxButton'
import { useBuyTokens, useTokensForBnb } from '@/hooks/useBondingCurve'
import type { Address } from 'viem'

interface BuyTokenFormProps {
  launchAddress: Address
  tokenSymbol?: string
}

const SLIPPAGE_OPTIONS = [
  { label: '1%', value: 1 },
  { label: '5%', value: 5 },
  { label: '10%', value: 10 },
]

export function BuyTokenForm({ launchAddress, tokenSymbol = 'TOKEN' }: BuyTokenFormProps) {
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState(5) // Default 5%
  const { address } = useAccount()
  const { data: balance } = useBalance({ address })

  const { buyTokens, isPending, isConfirming, isSuccess } = useBuyTokens(launchAddress)

  // Calculate tokens out based on BNB amount
  const bnbAmountBigInt = amount && parseFloat(amount) > 0 ? parseEther(amount) : 0n
  const { data: tokensOut } = useTokensForBnb(launchAddress, bnbAmountBigInt)

  const handleMax = () => {
    if (!balance) return
    // Leave a small amount for gas
    const maxAmount = balance.value > parseEther('0.01')
      ? balance.value - parseEther('0.01')
      : balance.value
    setAmount(formatEther(maxAmount))
  }

  const handleBuy = () => {
    if (!amount || !tokensOut) return

    // Calculate minimum tokens with slippage tolerance
    const minTokensOut = (tokensOut * BigInt(100 - slippage)) / 100n

    buyTokens(amount, minTokensOut)
  }

  const isValidAmount = () => {
    if (!amount || !balance) return false
    try {
      const amountBigInt = parseEther(amount)
      if (amountBigInt <= 0n) return false
      if (amountBigInt > balance.value) return false
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
        <p className="text-zinc-400">Connect your wallet to buy tokens</p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-800/50 rounded-lg p-6 space-y-4 border border-zinc-700">
      <h3 className="text-lg font-semibold">Buy {tokenSymbol}</h3>

      {/* BNB Amount Input */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-zinc-300">Amount (BNB)</label>
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
          <span>Balance: {balance ? formatEther(balance.value).slice(0, 10) : '0'} BNB</span>
        </div>
      </div>

      {/* Tokens Out Display */}
      {tokensOut && tokensOut > 0n && (
        <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">You will receive</span>
            <span className="text-lg font-bold text-orange-500">
              {formatEther(tokensOut).slice(0, 10)} {tokenSymbol}
            </span>
          </div>
          {slippage > 0 && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-zinc-500">Minimum received (with slippage)</span>
              <span className="text-sm text-zinc-400">
                {formatEther((tokensOut * BigInt(100 - slippage)) / 100n).slice(0, 10)} {tokenSymbol}
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

      {/* Buy Button */}
      <TxButton
        onClick={handleBuy}
        disabled={!isValidAmount() || !tokensOut}
        loading={isPending || isConfirming}
        success={isSuccess}
        className="w-full"
      >
        Buy {tokenSymbol}
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
