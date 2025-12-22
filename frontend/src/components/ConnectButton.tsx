'use client'

import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function ConnectButton() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  const isWrongNetwork = chain && chain.id !== 97 && chain.id !== 56

  useEffect(() => {
    const injected = connectors.find((c) => c.id === 'injected')
    if (!isConnected && injected) {
      connect({ connector: injected })
    }
  }, [isConnected, connectors, connect])

  const handleConnect = () => {
    const injected = connectors.find((c) => c.id === 'injected')
    if (injected) {
      connect({ connector: injected })
    }
  }

  const portal =
    typeof window !== 'undefined'
      ? document.getElementById('connect-button-portal')
      : null

  const content = (
    <>
      {!isConnected ? (
        <button
          onClick={handleConnect}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg font-medium transition-all"
        >
          Connect Wallet
        </button>
      ) : isWrongNetwork ? (
        <button
          onClick={() => switchChain({ chainId: 97 })}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-all"
        >
          Switch to BSC
        </button>
      ) : (
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-all"
        >
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </button>
      )}
    </>
  )

  return portal ? createPortal(content, portal) : content
}
