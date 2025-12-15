export const CONTRACT_ADDRESSES = {
  97: {
    // BSC Testnet
    factory: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    bondingCurveFactory: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
  56: {
    // BSC Mainnet
    factory: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    bondingCurveFactory: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
} as const

export const FACTORY_ABI = [
  {
    inputs: [],
    name: 'getAllPresales',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'presaleCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'index', type: 'uint256' }],
    name: 'presales',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'rate', type: 'uint256' },
      { internalType: 'uint256', name: 'softCap', type: 'uint256' },
      { internalType: 'uint256', name: 'hardCap', type: 'uint256' },
      { internalType: 'uint256', name: 'minContribution', type: 'uint256' },
      { internalType: 'uint256', name: 'maxContribution', type: 'uint256' },
      { internalType: 'uint256', name: 'startTime', type: 'uint256' },
      { internalType: 'uint256', name: 'endTime', type: 'uint256' },
      { internalType: 'uint256', name: 'liquidityBps', type: 'uint256' },
      { internalType: 'uint256', name: 'lockDuration', type: 'uint256' },
    ],
    name: 'createPresale',
    outputs: [{ internalType: 'address', name: 'presale', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'presale', type: 'address' },
      { indexed: true, internalType: 'address', name: 'token', type: 'address' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
    ],
    name: 'PresaleCreated',
    type: 'event',
  },
] as const

export const PRESALE_ABI = [
  {
    inputs: [],
    name: 'params',
    outputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'rate', type: 'uint256' },
      { internalType: 'uint256', name: 'softCap', type: 'uint256' },
      { internalType: 'uint256', name: 'hardCap', type: 'uint256' },
      { internalType: 'uint256', name: 'minContribution', type: 'uint256' },
      { internalType: 'uint256', name: 'maxContribution', type: 'uint256' },
      { internalType: 'uint256', name: 'startTime', type: 'uint256' },
      { internalType: 'uint256', name: 'endTime', type: 'uint256' },
      { internalType: 'uint256', name: 'liquidityBps', type: 'uint256' },
      { internalType: 'uint256', name: 'lockDuration', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalRaised',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'state',
    outputs: [{ internalType: 'enum IBnbPresale.PresaleState', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'contributions',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'hasClaimed',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'creator',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'contribute',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'refund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'finalize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'contributor', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'tokenAmount', type: 'uint256' },
    ],
    name: 'Contributed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'contributor', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'Claimed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'contributor', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'Refunded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256', name: 'totalRaised', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'liquidityAdded', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'lpTokensLocked', type: 'uint256' },
    ],
    name: 'Finalized',
    type: 'event',
  },
] as const

export const ERC20_ABI = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export enum PresaleState {
  Pending = 0,
  Active = 1,
  Finalized = 2,
  Cancelled = 3,
}

// Bonding Curve Factory ABI
export const BONDING_CURVE_FACTORY_ABI = [
  {
    inputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'symbol', type: 'string' },
      { internalType: 'uint256', name: 'totalSupply', type: 'uint256' },
      { internalType: 'uint256', name: 'initialPrice', type: 'uint256' },
      { internalType: 'uint256', name: 'priceIncrement', type: 'uint256' },
      { internalType: 'uint256', name: 'graduationThreshold', type: 'uint256' },
      { internalType: 'bool', name: 'enableSell', type: 'bool' },
    ],
    name: 'createLaunch',
    outputs: [
      { internalType: 'address', name: 'launch', type: 'address' },
      { internalType: 'address', name: 'token', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'allLaunches',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'allLaunches',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'launch', type: 'address' },
      { indexed: true, internalType: 'address', name: 'token', type: 'address' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'totalSupply', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'initialPrice', type: 'uint256' },
    ],
    name: 'LaunchCreated',
    type: 'event',
  },
] as const

// Bonding Curve Launch ABI
export const BONDING_CURVE_LAUNCH_ABI = [
  {
    inputs: [],
    name: 'config',
    outputs: [
      { internalType: 'address', name: 'creator', type: 'address' },
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'symbol', type: 'string' },
      { internalType: 'uint256', name: 'totalSupply', type: 'uint256' },
      { internalType: 'uint256', name: 'initialPrice', type: 'uint256' },
      { internalType: 'uint256', name: 'priceIncrement', type: 'uint256' },
      { internalType: 'uint256', name: 'graduationThreshold', type: 'uint256' },
      { internalType: 'uint256', name: 'creatorFeeBps', type: 'uint256' },
      { internalType: 'uint256', name: 'platformFeeBps', type: 'uint256' },
      { internalType: 'bool', name: 'enableSell', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tokensSold',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalBnbRaised',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'graduated',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getMarketCap',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'bnbAmount', type: 'uint256' }],
    name: 'getTokensForBnb',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenAmount', type: 'uint256' }],
    name: 'getBnbForTokens',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'minTokensOut', type: 'uint256' }],
    name: 'buy',
    outputs: [{ internalType: 'uint256', name: 'tokensOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'minBnbOut', type: 'uint256' },
    ],
    name: 'sell',
    outputs: [{ internalType: 'uint256', name: 'bnbOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'buyer', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'bnbIn', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'tokensOut', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'newPrice', type: 'uint256' },
    ],
    name: 'TokensBought',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'seller', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'tokensIn', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'bnbOut', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'newPrice', type: 'uint256' },
    ],
    name: 'TokensSold',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256', name: 'liquidityAdded', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'lpTokensLocked', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'lpToken', type: 'address' },
    ],
    name: 'GraduatedToDex',
    type: 'event',
  },
] as const
