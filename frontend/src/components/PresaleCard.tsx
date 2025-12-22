'use client'

import Link from 'next/link'
import { formatEther } from 'viem'
import { ProgressBar } from './ProgressBar'
import { usePresaleParams, usePresaleState, useTotalRaised, useTokenInfo } from '@/hooks/usePresale'
import { PresaleState } from '@/lib/contracts'
import type { Address } from 'viem'

interface PresaleCardProps {
  address: Address
}

export function PresaleCard({ address }: PresaleCardProps) {
  const { data: params } = usePresaleParams(address)
  const { data: state } = usePresaleState(address)
  const { data: totalRaised } = useTotalRaised(address)
  const { symbol } = useTokenInfo(params?.[0] as Address | undefined)

  if (!params || state === undefined) {
    return (
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-zinc-700 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-zinc-700 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-zinc-700 rounded w-2/3"></div>
      </div>
    )
  }

  const [token, rate, softCap, hardCap, , , startTime, endTime] = params
  const raised = totalRaised ?? BigInt(0)

  const getStatusBadge = () => {
    const now = Math.floor(Date.now() / 1000)
    const start = Number(startTime)
    const end = Number(endTime)

    if (state === PresaleState.Cancelled) {
      return <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">Cancelled</span>
    }
    if (state === PresaleState.Finalized) {
      return <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Finalized</span>
    }
    if (now < start) {
      return <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">Upcoming</span>
    }
    if (now >= start && now < end) {
      return <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">Active</span>
    }
    return <span className="px-3 py-1 bg-zinc-500/20 text-zinc-400 rounded-full text-sm">Ended</span>
  }

  return (
    <Link href={`/presale/${address}`}>
      <div className="bg-zinc-800/50 border border-zinc-700 hover:border-orange-500/50 rounded-lg p-6 transition-all hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold">{symbol || 'Token'} Presale</h3>
          {getStatusBadge()}
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Soft Cap</span>
            <span className="font-medium">{formatEther(softCap)} BNB</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Hard Cap</span>
            <span className="font-medium">{formatEther(hardCap)} BNB</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Rate</span>
            <span className="font-medium">{formatEther(rate)} {symbol}/BNB</span>
          </div>
        </div>

        <ProgressBar current={raised} target={hardCap} />

        <div className="mt-4 text-center">
          <p className="text-sm text-zinc-400">
            {formatEther(raised).slice(0, 8)} / {formatEther(hardCap)} BNB
          </p>
        </div>
      </div>
    </Link>
  )
}
