'use client'

import { useChainId } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/contracts'
import { isMockMode } from '@/lib/mockData'

export function DemoBanner() {
  const chainId = useChainId()
  const factoryAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.factory

  if (!isMockMode(factoryAddress)) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-b border-orange-500/30">
      <div className="container mx-auto px-4 py-3 text-center">
        <p className="text-orange-200 text-sm font-medium">
          🎭 <strong>Demo Mode</strong> - Showing sample data. Deploy contracts to enable live functionality.
        </p>
      </div>
    </div>
  )
}
