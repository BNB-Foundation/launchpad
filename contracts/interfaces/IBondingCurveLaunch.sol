// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IBondingCurveLaunch
 * @notice Interface for bonding curve token launch contracts
 * @dev Implements pump.fun-style linear bonding curve with automatic DEX graduation
 */
interface IBondingCurveLaunch {
    /**
     * @notice Launch configuration parameters
     */
    struct LaunchConfig {
        address creator;             // Launch creator address
        address token;               // Token contract address
        string name;                 // Token name
        string symbol;               // Token symbol
        uint256 totalSupply;         // Total tokens to sell through curve
        uint256 initialPrice;        // Starting price in wei per token
        uint256 priceIncrement;      // Price increase per token sold (in wei)
        uint256 graduationThreshold; // Market cap threshold for auto-graduation (in BNB wei)
        uint256 creatorFeeBps;       // Creator fee in basis points (100 = 1%)
        uint256 platformFeeBps;      // Platform fee in basis points (100 = 1%)
        bool enableSell;             // Allow selling tokens back to curve
    }

    /**
     * @notice Emitted when tokens are purchased
     * @param buyer Address of the buyer
     * @param bnbIn Amount of BNB spent
     * @param tokensOut Amount of tokens received
     * @param newPrice New current price after purchase
     */
    event TokensBought(
        address indexed buyer,
        uint256 bnbIn,
        uint256 tokensOut,
        uint256 newPrice
    );

    /**
     * @notice Emitted when tokens are sold back to curve
     * @param seller Address of the seller
     * @param tokensIn Amount of tokens sold
     * @param bnbOut Amount of BNB received
     * @param newPrice New current price after sale
     */
    event TokensSold(
        address indexed seller,
        uint256 tokensIn,
        uint256 bnbOut,
        uint256 newPrice
    );

    /**
     * @notice Emitted when launch graduates to DEX
     * @param liquidityBnb Amount of BNB added to liquidity
     * @param liquidityTokens Amount of tokens added to liquidity
     * @param lpTokensLocked Amount of LP tokens locked
     * @param lpToken Address of the LP token pair
     */
    event GraduatedToDex(
        uint256 liquidityBnb,
        uint256 liquidityTokens,
        uint256 lpTokensLocked,
        address indexed lpToken
    );

    /**
     * @notice Emitted when fees are collected
     * @param recipient Address receiving the fees
     * @param amount Amount of fees collected
     * @param isCreator True if creator fee, false if platform fee
     */
    event FeesCollected(
        address indexed recipient,
        uint256 amount,
        bool isCreator
    );

    /**
     * @notice Initialize the launch contract (called by factory)
     * @param config Launch configuration parameters
     * @param factory Address of the factory contract
     * @param feeRecipient Address to receive platform fees
     * @param pancakeRouter PancakeSwap V2 Router address
     * @param pancakeFactory PancakeSwap V2 Factory address
     * @param wbnb Wrapped BNB address
     */
    function initialize(
        LaunchConfig calldata config,
        address factory,
        address feeRecipient,
        address pancakeRouter,
        address pancakeFactory,
        address wbnb
    ) external;

    /**
     * @notice Buy tokens with BNB (with slippage protection)
     * @param minTokensOut Minimum tokens expected (reverts if less)
     * @return tokensOut Amount of tokens received
     */
    function buy(uint256 minTokensOut) external payable returns (uint256 tokensOut);

    /**
     * @notice Sell tokens back to the curve (if enabled)
     * @param tokenAmount Amount of tokens to sell
     * @param minBnbOut Minimum BNB expected (reverts if less)
     * @return bnbOut Amount of BNB received
     */
    function sell(uint256 tokenAmount, uint256 minBnbOut) external returns (uint256 bnbOut);

    /**
     * @notice Get current price for next token
     * @return Current price in wei per token
     */
    function getCurrentPrice() external view returns (uint256);

    /**
     * @notice Get current market capitalization
     * @return Market cap in BNB (wei)
     */
    function getMarketCap() external view returns (uint256);

    /**
     * @notice Calculate how many tokens can be purchased with given BNB
     * @param bnbAmount Amount of BNB to spend (in wei)
     * @return tokenAmount Number of tokens that would be received
     */
    function getTokensForBnb(uint256 bnbAmount) external view returns (uint256 tokenAmount);

    /**
     * @notice Calculate how much BNB would be received for selling tokens
     * @param tokenAmount Amount of tokens to sell
     * @return bnbAmount Amount of BNB that would be received (after fees)
     */
    function getBnbForTokens(uint256 tokenAmount) external view returns (uint256 bnbAmount);

    /**
     * @notice Manually trigger graduation to DEX (if threshold met)
     * @param minLpTokens Minimum LP tokens expected (slippage protection)
     * @return lpAmount Amount of LP tokens locked
     */
    function graduateToDex(uint256 minLpTokens) external returns (uint256 lpAmount);

    /**
     * @notice Check if launch has graduated to DEX
     * @return True if graduated
     */
    function isGraduated() external view returns (bool);

    /**
     * @notice Get total tokens sold through the curve
     * @return Number of tokens sold
     */
    function tokensSold() external view returns (uint256);

    /**
     * @notice Get total BNB raised (excluding fees)
     * @return Total BNB raised in wei
     */
    function totalBnbRaised() external view returns (uint256);

    /**
     * @notice Get token balance for a specific address
     * @param account Address to query
     * @return Token balance
     */
    function tokenBalances(address account) external view returns (uint256);

    /**
     * @notice Pause the contract (factory owner or creator only)
     */
    function pause() external;

    /**
     * @notice Unpause the contract (factory owner or creator only)
     */
    function unpause() external;

    /**
     * @notice Check if contract is paused
     * @return True if paused
     */
    function paused() external view returns (bool);

    /**
     * @notice Withdraw LP tokens after lock period (creator only)
     */
    function withdrawLPTokens() external;

    /**
     * @notice Collect accumulated creator fees
     */
    function collectCreatorFees() external;

    /**
     * @notice Collect accumulated platform fees (factory owner only)
     */
    function collectPlatformFees() external;
}
