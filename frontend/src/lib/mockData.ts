import { Address } from 'viem'
import { PresaleState } from './contracts'

// Mock presale addresses
export const MOCK_PRESALES: Address[] = [
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222',
  '0x3333333333333333333333333333333333333333',
]

// Mock presale data
export const MOCK_PRESALE_DATA: Record<Address, any> = {
  '0x1111111111111111111111111111111111111111': {
    token: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1',
    rate: 1000n,
    softCap: BigInt(10 * 1e18),
    hardCap: BigInt(50 * 1e18),
    minContribution: BigInt(0.1 * 1e18),
    maxContribution: BigInt(5 * 1e18),
    startTime: BigInt(Math.floor(Date.now() / 1000) - 3600), // Started 1 hour ago
    endTime: BigInt(Math.floor(Date.now() / 1000) + 86400 * 7), // Ends in 7 days
    liquidityBps: 7000n,
    lockDuration: BigInt(365 * 24 * 60 * 60),
    state: PresaleState.Active,
    totalRaised: BigInt(25 * 1e18),
    creator: '0xCreator1111111111111111111111111111111111',
  },
  '0x2222222222222222222222222222222222222222': {
    token: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2',
    rate: 2000n,
    softCap: BigInt(20 * 1e18),
    hardCap: BigInt(100 * 1e18),
    minContribution: BigInt(0.5 * 1e18),
    maxContribution: BigInt(10 * 1e18),
    startTime: BigInt(Math.floor(Date.now() / 1000) + 86400), // Starts in 1 day
    endTime: BigInt(Math.floor(Date.now() / 1000) + 86400 * 8),
    liquidityBps: 8000n,
    lockDuration: BigInt(180 * 24 * 60 * 60),
    state: PresaleState.Pending,
    totalRaised: 0n,
    creator: '0xCreator2222222222222222222222222222222222',
  },
  '0x3333333333333333333333333333333333333333': {
    token: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa3',
    rate: 500n,
    softCap: BigInt(5 * 1e18),
    hardCap: BigInt(25 * 1e18),
    minContribution: BigInt(0.05 * 1e18),
    maxContribution: BigInt(2 * 1e18),
    startTime: BigInt(Math.floor(Date.now() / 1000) - 86400 * 10), // Started 10 days ago
    endTime: BigInt(Math.floor(Date.now() / 1000) - 86400), // Ended 1 day ago
    liquidityBps: 6000n,
    lockDuration: BigInt(365 * 24 * 60 * 60),
    state: PresaleState.Finalized,
    totalRaised: BigInt(25 * 1e18),
    creator: '0xCreator3333333333333333333333333333333333',
  },
}

// Mock token data
export const MOCK_TOKEN_DATA: Record<Address, any> = {
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1': {
    name: 'DeFi Token',
    symbol: 'DEFI',
    decimals: 18,
  },
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2': {
    name: 'Metaverse Coin',
    symbol: 'META',
    decimals: 18,
  },
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa3': {
    name: 'Gaming Token',
    symbol: 'GAME',
    decimals: 18,
  },
}

// Check if we're in mock mode (no factory address set)
export const isMockMode = (factoryAddress?: Address) => {
  return !factoryAddress || factoryAddress === '0x0000000000000000000000000000000000000000'
}
