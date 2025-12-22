'use client'

import { type ReactNode } from 'react'

interface TxButtonProps {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  success?: boolean
  children: ReactNode
  className?: string
  variant?: 'primary' | 'secondary' | 'danger'
}

export function TxButton({
  onClick,
  disabled = false,
  loading = false,
  success = false,
  children,
  className = '',
  variant = 'primary',
}: TxButtonProps) {
  const baseStyles = 'px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles = {
    primary: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
    secondary: 'bg-zinc-700 hover:bg-zinc-600',
    danger: 'bg-red-500 hover:bg-red-600',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading || success}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Processing...
        </span>
      ) : success ? (
        <span className="flex items-center gap-2">
          <span>✓</span>
          Success!
        </span>
      ) : (
        children
      )}
    </button>
  )
}
