'use client'

import { useMemo } from 'react'
import { formatEther } from 'viem'
import { useTokensSold } from '@/hooks/useBondingCurve'
import type { Address } from 'viem'

interface BondingCurveChartProps {
  launchAddress: Address
  initialPrice: bigint
  priceIncrement: bigint
  totalSupply: bigint
  className?: string
}

export function BondingCurveChart({
  launchAddress,
  initialPrice,
  priceIncrement,
  totalSupply,
  className = '',
}: BondingCurveChartProps) {
  const { data: tokensSold } = useTokensSold(launchAddress)

  // Generate chart data points
  const chartData = useMemo(() => {
    const points = 50 // Number of points to plot
    const step = totalSupply / BigInt(points)
    const data: { x: number; y: number; isCurrent: boolean }[] = []

    for (let i = 0; i <= points; i++) {
      const supply = step * BigInt(i)
      const price = initialPrice + (priceIncrement * supply) / BigInt(1e18)
      const isCurrent = tokensSold ? supply >= tokensSold && supply <= tokensSold + step : false

      data.push({
        x: Number(supply) / 1e18,
        y: Number(price) / 1e18,
        isCurrent,
      })
    }

    return data
  }, [initialPrice, priceIncrement, totalSupply, tokensSold])

  const maxPrice = chartData[chartData.length - 1]?.y ?? 0
  const currentSold = tokensSold ? Number(tokensSold) / 1e18 : 0
  const currentIndex = Math.floor((currentSold / (Number(totalSupply) / 1e18)) * chartData.length)

  return (
    <div className={`bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-bold mb-4">Bonding Curve</h3>

      <div className="relative h-64 bg-zinc-900/50 rounded-lg p-4">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-zinc-400">
          <span>{maxPrice.toFixed(6)}</span>
          <span>{(maxPrice / 2).toFixed(6)}</span>
          <span>0 BNB</span>
        </div>

        {/* Chart area */}
        <div className="ml-16 mr-4 h-full relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="w-full border-t border-zinc-800" />
            ))}
          </div>

          {/* Chart line */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.1" />
                <stop offset={`${(currentIndex / chartData.length) * 100}%`} stopColor="#f97316" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Draw the bonding curve line */}
            <polyline
              fill="none"
              stroke="#f97316"
              strokeWidth="2"
              points={chartData
                .map((point, i) => {
                  const x = (i / (chartData.length - 1)) * 100
                  const y = 100 - (point.y / maxPrice) * 100
                  return `${x}%,${y}%`
                })
                .join(' ')}
            />

            {/* Fill under the curve */}
            <polygon
              fill="url(#curveGradient)"
              points={[
                ...chartData.map((point, i) => {
                  const x = (i / (chartData.length - 1)) * 100
                  const y = 100 - (point.y / maxPrice) * 100
                  return `${x}%,${y}%`
                }),
                '100%,100%',
                '0%,100%',
              ].join(' ')}
            />

            {/* Current position marker */}
            {currentIndex > 0 && currentIndex < chartData.length && (
              <circle
                cx={`${(currentIndex / (chartData.length - 1)) * 100}%`}
                cy={`${100 - (chartData[currentIndex].y / maxPrice) * 100}%`}
                r="4"
                fill="#f97316"
                className="animate-pulse"
              />
            )}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="ml-16 mr-4 mt-2 flex justify-between text-xs text-zinc-400">
          <span>0</span>
          <span className="text-orange-500 font-medium">
            Current: {currentSold.toFixed(0)}
          </span>
          <span>{(Number(totalSupply) / 1e18).toFixed(0)} tokens</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-sm text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>Current Position</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-orange-500"></div>
          <span>Price Curve</span>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 rounded-lg p-3">
          <div className="text-xs text-zinc-400 mb-1">Initial Price</div>
          <div className="font-medium">{formatEther(initialPrice).slice(0, 10)} BNB</div>
        </div>
        <div className="bg-zinc-900/50 rounded-lg p-3">
          <div className="text-xs text-zinc-400 mb-1">Final Price</div>
          <div className="font-medium">{maxPrice.toFixed(10)} BNB</div>
        </div>
      </div>
    </div>
  )
}
