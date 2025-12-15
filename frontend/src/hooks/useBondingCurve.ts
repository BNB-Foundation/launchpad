import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { BONDING_CURVE_LAUNCH_ABI, ERC20_ABI } from '@/lib/contracts'
import type { Address } from 'viem'
import { parseEther } from 'viem'

/**
 * Hook to get the current price for the next token in the bonding curve
 */
export function useBondingCurvePrice(launchAddress: Address) {
  return useReadContract({
    address: launchAddress,
    abi: BONDING_CURVE_LAUNCH_ABI,
    functionName: 'getCurrentPrice',
    query: {
      enabled: !!launchAddress,
      refetchInterval: 3000, // Update every 3s for real-time pricing
    },
  })
}

/**
 * Hook to get the current market cap of the token
 */
export function useMarketCap(launchAddress: Address) {
  return useReadContract({
    address: launchAddress,
    abi: BONDING_CURVE_LAUNCH_ABI,
    functionName: 'getMarketCap',
    query: {
      enabled: !!launchAddress,
      refetchInterval: 3000,
    },
  })
}

/**
 * Hook to calculate how many tokens will be received for a given BNB amount
 */
export function useTokensForBnb(launchAddress: Address, bnbAmount: bigint) {
  return useReadContract({
    address: launchAddress,
    abi: BONDING_CURVE_LAUNCH_ABI,
    functionName: 'getTokensForBnb',
    args: [bnbAmount],
    query: {
      enabled: !!launchAddress && bnbAmount > 0n,
      refetchInterval: 2000,
    },
  })
}

/**
 * Hook to calculate how much BNB will be received for selling tokens
 */
export function useBnbForTokens(launchAddress: Address, tokenAmount: bigint) {
  return useReadContract({
    address: launchAddress,
    abi: BONDING_CURVE_LAUNCH_ABI,
    functionName: 'getBnbForTokens',
    args: [tokenAmount],
    query: {
      enabled: !!launchAddress && tokenAmount > 0n,
      refetchInterval: 2000,
    },
  })
}

/**
 * Hook to get the total tokens sold through the bonding curve
 */
export function useTokensSold(launchAddress: Address) {
  return useReadContract({
    address: launchAddress,
    abi: BONDING_CURVE_LAUNCH_ABI,
    functionName: 'tokensSold',
    query: {
      enabled: !!launchAddress,
      refetchInterval: 3000,
    },
  })
}

/**
 * Hook to check if the launch has graduated to DEX
 */
export function useIsGraduated(launchAddress: Address) {
  return useReadContract({
    address: launchAddress,
    abi: BONDING_CURVE_LAUNCH_ABI,
    functionName: 'graduated',
    query: {
      enabled: !!launchAddress,
      refetchInterval: 5000,
    },
  })
}

/**
 * Hook to get launch configuration
 */
export function useLaunchConfig(launchAddress: Address) {
  return useReadContract({
    address: launchAddress,
    abi: BONDING_CURVE_LAUNCH_ABI,
    functionName: 'config',
    query: {
      enabled: !!launchAddress,
    },
  })
}

/**
 * Hook to buy tokens with BNB
 */
export function useBuyTokens(launchAddress: Address) {
  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const buyTokens = (bnbAmount: string, minTokensOut: bigint) => {
    if (!bnbAmount || parseFloat(bnbAmount) <= 0) return

    writeContract({
      address: launchAddress,
      abi: BONDING_CURVE_LAUNCH_ABI,
      functionName: 'buy',
      args: [minTokensOut],
      value: parseEther(bnbAmount),
    })
  }

  return {
    buyTokens,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

/**
 * Hook to sell tokens back to the bonding curve
 */
export function useSellTokens(launchAddress: Address) {
  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const sellTokens = (tokenAmount: bigint, minBnbOut: bigint) => {
    if (!tokenAmount || tokenAmount <= 0n) return

    writeContract({
      address: launchAddress,
      abi: BONDING_CURVE_LAUNCH_ABI,
      functionName: 'sell',
      args: [tokenAmount, minBnbOut],
    })
  }

  return {
    sellTokens,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

/**
 * Hook to get user's token balance for a launch
 */
export function useUserTokenBalance(launchAddress: Address, tokenAddress: Address | undefined) {
  const { address } = useAccount()

  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!tokenAddress,
      refetchInterval: 5000,
    },
  })
}

/**
 * Hook to get total BNB raised through the bonding curve
 */
export function useTotalBnbRaised(launchAddress: Address) {
  return useReadContract({
    address: launchAddress,
    abi: BONDING_CURVE_LAUNCH_ABI,
    functionName: 'totalBnbRaised',
    query: {
      enabled: !!launchAddress,
      refetchInterval: 5000,
    },
  })
}
