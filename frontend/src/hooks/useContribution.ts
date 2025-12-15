import { useReadContract, useAccount } from 'wagmi'
import { PRESALE_ABI } from '@/lib/contracts'
import type { Address } from 'viem'

export function useContribution(presaleAddress: Address) {
  const { address } = useAccount()

  const { data: contribution, refetch } = useReadContract({
    address: presaleAddress,
    abi: PRESALE_ABI,
    functionName: 'contributions',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!presaleAddress,
      refetchInterval: 5000,
    },
  })

  const { data: hasClaimed } = useReadContract({
    address: presaleAddress,
    abi: PRESALE_ABI,
    functionName: 'hasClaimed',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!presaleAddress,
      refetchInterval: 5000,
    },
  })

  return {
    contribution: contribution ?? BigInt(0),
    hasClaimed: hasClaimed ?? false,
    refetch,
  }
}
