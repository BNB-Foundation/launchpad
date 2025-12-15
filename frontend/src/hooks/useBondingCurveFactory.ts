import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { BONDING_CURVE_FACTORY_ABI, CONTRACT_ADDRESSES } from '@/lib/contracts'
import type { Address } from 'viem'
import { parseEther } from 'viem'

/**
 * Get the bonding curve factory address for current chain
 */
export function useBondingCurveFactoryAddress() {
  const chainId = useChainId()
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]
  return addresses?.bondingCurveFactory as Address
}

/**
 * Hook to get all bonding curve launches from the factory
 */
export function useAllLaunches() {
  const factoryAddress = useBondingCurveFactoryAddress()

  return useReadContract({
    address: factoryAddress,
    abi: BONDING_CURVE_FACTORY_ABI,
    functionName: 'allLaunches',
    query: {
      enabled: !!factoryAddress && factoryAddress !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 10000, // Refresh every 10s
    },
  })
}

/**
 * Hook to create a new bonding curve launch
 */
export function useCreateLaunch() {
  const factoryAddress = useBondingCurveFactoryAddress()
  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const createLaunch = (params: {
    name: string
    symbol: string
    totalSupply: string
    initialPrice: string
    priceIncrement: string
    graduationThreshold: string
    enableSell: boolean
  }) => {
    if (!factoryAddress) return

    writeContract({
      address: factoryAddress,
      abi: BONDING_CURVE_FACTORY_ABI,
      functionName: 'createLaunch',
      args: [
        params.name,
        params.symbol,
        parseEther(params.totalSupply),
        parseEther(params.initialPrice),
        parseEther(params.priceIncrement),
        parseEther(params.graduationThreshold),
        params.enableSell,
      ],
    })
  }

  return {
    createLaunch,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}
