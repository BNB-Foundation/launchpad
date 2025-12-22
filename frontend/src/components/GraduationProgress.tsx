'use client'

import { formatEther } from 'viem'
import { ProgressBar } from './ProgressBar'
import { useMarketCap, useIsGraduated } from '@/hooks/useBondingCurve'
import type { Address } from 'viem'

interface GraduationProgressProps {
  launchAddress: Address
  graduationThreshold: bigint
  className?: string
}

export function GraduationProgress({
  launchAddress,
  graduationThreshold,
  className = '',
}: GraduationProgressProps) {
  const { data: marketCap } = useMarketCap(launchAddress)
  const { data: graduated } = useIsGraduated(launchAddress)

  const cap = marketCap ?? 0n
  const progressPercentage =
    graduationThreshold > 0n ? Number((cap * 10000n) / graduationThreshold) / 100 : 0

  if (graduated) {
    return (
      <div className={`bg-green-500/10 border border-green-500/30 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-green-400 mb-1">Graduated to DEX!</h3>
            <p className="text-sm text-zinc-400">
              This token has successfully graduated and is now trading on PancakeSwap
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-2">Graduation Progress</h3>
        <p className="text-sm text-zinc-400">
          When market cap reaches {formatEther(graduationThreshold)} BNB, this token will
          automatically graduate to PancakeSwap DEX with locked liquidity.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Current Market Cap</span>
          <span className="font-medium text-orange-500">{formatEther(cap).slice(0, 10)} BNB</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Target Market Cap</span>
          <span className="font-medium">{formatEther(graduationThreshold)} BNB</span>
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar current={cap} target={graduationThreshold} />
      </div>

      {progressPercentage >= 80 && (
        <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <p className="text-sm text-orange-400 font-medium">
            Almost there! Only {formatEther(graduationThreshold - cap).slice(0, 8)} BNB more to
            graduation
          </p>
        </div>
      )}
    </div>
  )
}
