import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { PRESALE_ABI, ERC20_ABI } from '@/lib/contracts'
import type { Address } from 'viem'
import { parseEther } from 'viem'
import { MOCK_PRESALES, MOCK_PRESALE_DATA, MOCK_TOKEN_DATA } from '@/lib/mockData'

const isMockAddress = (address: Address) => MOCK_PRESALES.includes(address)

export function usePresaleParams(address: Address) {
  if (isMockAddress(address)) {
    const mockData = MOCK_PRESALE_DATA[address]
    return {
      data: mockData ? [
        mockData.token,
        mockData.rate,
        mockData.softCap,
        mockData.hardCap,
        mockData.minContribution,
        mockData.maxContribution,
        mockData.startTime,
        mockData.endTime,
        mockData.liquidityBps,
        mockData.lockDuration,
      ] : undefined,
      isLoading: false,
      isError: false,
      error: null,
    }
  }

  return useReadContract({
    address,
    abi: PRESALE_ABI,
    functionName: 'params',
    query: {
      enabled: !!address,
    },
  })
}

export function usePresaleState(address: Address) {
  if (isMockAddress(address)) {
    const mockData = MOCK_PRESALE_DATA[address]
    return {
      data: mockData?.state,
      isLoading: false,
      isError: false,
      error: null,
    }
  }

  return useReadContract({
    address,
    abi: PRESALE_ABI,
    functionName: 'state',
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  })
}

export function useTotalRaised(address: Address) {
  if (isMockAddress(address)) {
    const mockData = MOCK_PRESALE_DATA[address]
    return {
      data: mockData?.totalRaised,
      isLoading: false,
      isError: false,
      error: null,
    }
  }

  return useReadContract({
    address,
    abi: PRESALE_ABI,
    functionName: 'totalRaised',
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  })
}

export function usePresaleCreator(address: Address) {
  if (isMockAddress(address)) {
    const mockData = MOCK_PRESALE_DATA[address]
    return {
      data: mockData?.creator,
      isLoading: false,
      isError: false,
      error: null,
    }
  }

  return useReadContract({
    address,
    abi: PRESALE_ABI,
    functionName: 'creator',
    query: {
      enabled: !!address,
    },
  })
}

export function useTokenInfo(tokenAddress: Address | undefined) {
  if (tokenAddress && MOCK_TOKEN_DATA[tokenAddress]) {
    const mockToken = MOCK_TOKEN_DATA[tokenAddress]
    return {
      name: mockToken.name,
      symbol: mockToken.symbol,
      decimals: mockToken.decimals,
    }
  }

  const { data: name } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'name',
    query: {
      enabled: !!tokenAddress,
    },
  })

  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: {
      enabled: !!tokenAddress,
    },
  })

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: {
      enabled: !!tokenAddress,
    },
  })

  return { name, symbol, decimals }
}

export function useContribute(presaleAddress: Address) {
  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const contribute = (amount: string) => {
    writeContract({
      address: presaleAddress,
      abi: PRESALE_ABI,
      functionName: 'contribute',
      value: parseEther(amount),
    })
  }

  return {
    contribute,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

export function useClaim(presaleAddress: Address) {
  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const claim = () => {
    writeContract({
      address: presaleAddress,
      abi: PRESALE_ABI,
      functionName: 'claim',
    })
  }

  return {
    claim,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

export function useRefund(presaleAddress: Address) {
  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const refund = () => {
    writeContract({
      address: presaleAddress,
      abi: PRESALE_ABI,
      functionName: 'refund',
    })
  }

  return {
    refund,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

export function useFinalize(presaleAddress: Address) {
  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const finalize = () => {
    writeContract({
      address: presaleAddress,
      abi: PRESALE_ABI,
      functionName: 'finalize',
    })
  }

  return {
    finalize,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}
