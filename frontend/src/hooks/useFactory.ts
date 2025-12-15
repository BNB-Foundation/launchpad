import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES, FACTORY_ABI } from '@/lib/contracts'
import { useChainId } from 'wagmi'
import type { Address } from 'viem'
import { MOCK_PRESALES, isMockMode } from '@/lib/mockData'

export function useAllPresales() {
  const chainId = useChainId()
  const factoryAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.factory

  // Return mock data if in demo mode
  if (isMockMode(factoryAddress)) {
    return {
      data: MOCK_PRESALES,
      isLoading: false,
      isError: false,
      error: null,
    }
  }

  return useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'getAllPresales',
    query: {
      enabled: !!factoryAddress && factoryAddress !== '0x0000000000000000000000000000000000000000',
    },
  })
}

export function usePresaleCount() {
  const chainId = useChainId()
  const factoryAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.factory

  return useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'presaleCount',
    query: {
      enabled: !!factoryAddress && factoryAddress !== '0x0000000000000000000000000000000000000000',
    },
  })
}

export function useCreatePresale() {
  const chainId = useChainId()
  const factoryAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.factory

  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const createPresale = (params: {
    token: Address
    rate: bigint
    softCap: bigint
    hardCap: bigint
    minContribution: bigint
    maxContribution: bigint
    startTime: bigint
    endTime: bigint
    liquidityBps: bigint
    lockDuration: bigint
  }) => {
    if (!factoryAddress) return

    writeContract({
      address: factoryAddress,
      abi: FACTORY_ABI,
      functionName: 'createPresale',
      args: [
        params.token,
        params.rate,
        params.softCap,
        params.hardCap,
        params.minContribution,
        params.maxContribution,
        params.startTime,
        params.endTime,
        params.liquidityBps,
        params.lockDuration,
      ],
    })
  }

  return {
    createPresale,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}
