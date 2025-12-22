'use client'

interface ProgressBarProps {
  current: bigint
  target: bigint
  className?: string
}

export function ProgressBar({ current, target, className = '' }: ProgressBarProps) {
  const percentage = target > BigInt(0)
    ? Number((current * BigInt(10000)) / target) / 100
    : 0

  const displayPercentage = Math.min(percentage, 100)

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-zinc-400">Progress</span>
        <span className="text-sm font-medium text-orange-500">
          {displayPercentage.toFixed(2)}%
        </span>
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500 ease-out rounded-full"
          style={{ width: `${displayPercentage}%` }}
        />
      </div>
    </div>
  )
}
