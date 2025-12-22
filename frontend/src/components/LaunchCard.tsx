'use client'

import Link from 'next/link'
import { formatEther } from 'viem'
import { ProgressBar } from './ProgressBar'
import {
  useLaunchConfig,
  useBondingCurvePrice,
  useMarketCap,
  useTokensSold,
  useIsGraduated,
} from '@/hooks/useBondingCurve'
import type { Address } from 'viem'

interface LaunchCardProps {
  address: Address
}

export function LaunchCard({ address }: LaunchCardProps) {
  const { data: config } = useLaunchConfig(address)
  const { data: currentPrice } = useBondingCurvePrice(address)
  const { data: marketCap } = useMarketCap(address)
  const { data: tokensSold } = useTokensSold(address)
  const { data: graduated } = useIsGraduated(address)

  if (!config) {
    return (
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-zinc-700 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-zinc-700 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-zinc-700 rounded w-2/3"></div>
      </div>
    )
  }

  const [
    creator,
    token,
    name,
    symbol,
    totalSupply,
    initialPrice,
    priceIncrement,
    graduationThreshold,
    creatorFeeBps,
    platformFeeBps,
    enableSell,
  ] = config

  const sold = tokensSold ?? 0n
  const cap = marketCap ?? 0n
  const price = currentPrice ?? initialPrice

  const getStatusBadge = () => {
    if (graduated) {
      return (
        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
          Graduated
        </span>
      )
    }
    return (
      <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm font-medium">
        Active
      </span>
    )
  }

  const progressPercentage =
    graduationThreshold > 0n ? Number((cap * 10000n) / graduationThreshold) / 100 : 0

  return (
    <Link href={`/token/${address}`}>
      <div className="bg-zinc-800/50 border border-zinc-700 hover:border-orange-500/50 rounded-lg p-6 transition-all hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer group">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold group-hover:text-orange-500 transition-colors">
              {symbol}
            </h3>
            <p className="text-sm text-zinc-400 mt-1">{name}</p>
          </div>
          {getStatusBadge()}
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Current Price</span>
            <span className="font-medium text-orange-500">
              {formatEther(price).slice(0, 10)} BNB
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Market Cap</span>
            <span className="font-medium">{formatEther(cap).slice(0, 10)} BNB</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Tokens Sold</span>
            <span className="font-medium">
              {formatEther(sold).slice(0, 10)} / {formatEther(totalSupply).slice(0, 10)}
            </span>
          </div>
        </div>

        {/* Progress to Graduation */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Progress to DEX</span>
            <span>{progressPercentage.toFixed(1)}%</span>
          </div>
          <ProgressBar current={cap} target={graduationThreshold} />
          <div className="text-center text-xs text-zinc-500">
            {formatEther(cap).slice(0, 8)} / {formatEther(graduationThreshold)} BNB
          </div>
        </div>

        {/* Trade Info */}
        <div className="mt-4 pt-4 border-t border-zinc-700 flex justify-between text-xs text-zinc-400">
          <span>Creator Fee: {Number(creatorFeeBps) / 100}%</span>
          <span>Platform Fee: {Number(platformFeeBps) / 100}%</span>
          {enableSell && <span className="text-green-400">Selling Enabled</span>}
        </div>

        {/* Buy Button Hint */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-orange-500 group-hover:text-orange-400 transition-colors">
            <span>Buy Now</span>
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  )
}
