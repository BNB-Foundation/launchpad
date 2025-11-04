// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/IBondingCurveLaunch.sol";
import "./StandardERC20.sol";

/**
 * @title BondingCurveFactory
 * @notice UUPS upgradeable factory for deploying bonding curve token launches
 * @dev Replaces BnbFactory.sol with pump.fun-style bonding curve mechanics
 *
 * Key Features:
 * - Deploys minimal clones of BondingCurveLaunch and StandardERC20 (EIP-1167)
 * - UUPS upgradeable pattern for future improvements
 * - Configurable platform and creator fees
 * - Launch registry and tracking
 * - Emergency pause functionality
 * - Owner-controlled fee recipient and default parameters
 *
 * Gas Optimization:
 * - Uses Clones.clone() for ~90% gas savings vs new deployments
 * - Tight variable packing in structs
 * - Custom errors instead of require strings (~50 gas savings per revert)
 */
contract BondingCurveFactory is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable
{
    /// @notice Implementation contract for bonding curve launches (cloned via EIP-1167)
    address public launchImplementation;

    /// @notice Implementation contract for ERC20 tokens (cloned via EIP-1167)
    address public tokenImplementation;

    /// @notice Address that receives platform fees from all launches
    address public feeRecipient;

    /// @notice PancakeSwap V2 Router address
    address public pancakeRouter;

    /// @notice PancakeSwap V2 Factory address
    address public pancakeFactory;

    /// @notice Wrapped BNB address
    address public wbnb;

    /// @notice Default platform fee in basis points (100 = 1%)
    uint256 public defaultPlatformFeeBps;

    /// @notice Default creator fee in basis points (100 = 1%)
    uint256 public defaultCreatorFeeBps;

    /// @notice Array of all launch addresses (public for array access)
    address[] public allLaunches;

    /// @notice Mapping of creator address to their launch addresses
    mapping(address => address[]) public creatorLaunches;

    /// @notice Mapping to verify if address is a valid launch from this factory
    mapping(address => bool) public isLaunch;

    /// @notice Mapping from token address to launch address
    mapping(address => address) public tokenToLaunch;

    /*//////////////////////////////////////////////////////////////
                            CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/

    error InvalidImplementation();
    error InvalidFeeRecipient();
    error InvalidFeeBps();
    error InvalidParameters();
    error InvalidTotalSupply();
    error InvalidPrice();
    error InvalidGraduationThreshold();
    error InvalidAddress();
    error LaunchCreationFailed();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Emitted when a new launch is created
     * @param launch Address of the new launch contract
     * @param token Address of the token contract
     * @param creator Address of the launch creator
     * @param totalSupply Total supply of tokens
     * @param initialPrice Starting price per token
     * @param graduationThreshold Market cap threshold for DEX graduation
     */
    event LaunchCreated(
        address indexed launch,
        address indexed token,
        address indexed creator,
        uint256 totalSupply,
        uint256 initialPrice,
        uint256 graduationThreshold
    );

    /**
     * @notice Emitted when implementation contracts are updated
     * @param launchImpl New launch implementation address
     * @param tokenImpl New token implementation address
     */
    event ImplementationsUpdated(address launchImpl, address tokenImpl);

    /**
     * @notice Emitted when launch implementation is updated
     * @param implementation New launch implementation address
     */
    event LaunchImplementationUpdated(address indexed implementation);

    /**
     * @notice Emitted when token implementation is updated
     * @param implementation New token implementation address
     */
    event TokenImplementationUpdated(address indexed implementation);

    /**
     * @notice Emitted when fee recipient is updated
     * @param newRecipient New fee recipient
     */
    event FeeRecipientUpdated(address indexed newRecipient);

    /**
     * @notice Emitted when default fees are updated
     * @param platformFeeBps New platform fee in basis points
     * @param creatorFeeBps New creator fee in basis points
     */
    event DefaultFeesUpdated(uint256 platformFeeBps, uint256 creatorFeeBps);

    /**
     * @notice Emitted when platform fee is updated
     * @param platformFeeBps New platform fee in basis points
     */
    event PlatformFeeUpdated(uint256 platformFeeBps);

    /**
     * @notice Emitted when creator fee is updated
     * @param creatorFeeBps New creator fee in basis points
     */
    event CreatorFeeUpdated(uint256 creatorFeeBps);

    /*//////////////////////////////////////////////////////////////
                            INITIALIZATION
    //////////////////////////////////////////////////////////////*/

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the factory contract
     * @param launchImpl_ Address of BondingCurveLaunch implementation
     * @param tokenImpl_ Address of StandardERC20 implementation
     * @param feeRecipient_ Address to receive platform fees
     * @param pancakeRouter_ Address of PancakeSwap V2 Router
     * @param pancakeFactory_ Address of PancakeSwap V2 Factory
     * @param wbnb_ Address of Wrapped BNB
     * @param platformFeeBps_ Default platform fee (100 = 1%)
     * @param creatorFeeBps_ Default creator fee (50 = 0.5%)
     */
    function initialize(
        address launchImpl_,
        address tokenImpl_,
        address feeRecipient_,
        address pancakeRouter_,
        address pancakeFactory_,
        address wbnb_,
        uint256 platformFeeBps_,
        uint256 creatorFeeBps_
    ) external initializer {
        __Ownable_init(msg.sender);
        __Pausable_init();
        __UUPSUpgradeable_init();

        if (launchImpl_ == address(0) || tokenImpl_ == address(0)) {
            revert InvalidImplementation();
        }
        if (feeRecipient_ == address(0)) {
            revert InvalidFeeRecipient();
        }
        if (pancakeRouter_ == address(0) || pancakeFactory_ == address(0) || wbnb_ == address(0)) {
            revert InvalidAddress();
        }
        if (platformFeeBps_ > 1000 || creatorFeeBps_ > 1000) {
            revert InvalidFeeBps(); // Max 10% each
        }
        if (platformFeeBps_ + creatorFeeBps_ > 1500) {
            revert InvalidFeeBps(); // Max 15% combined
        }

        launchImplementation = launchImpl_;
        tokenImplementation = tokenImpl_;
        feeRecipient = feeRecipient_;
        pancakeRouter = pancakeRouter_;
        pancakeFactory = pancakeFactory_;
        wbnb = wbnb_;
        defaultPlatformFeeBps = platformFeeBps_;
        defaultCreatorFeeBps = creatorFeeBps_;
    }

    /*//////////////////////////////////////////////////////////////
                        LAUNCH CREATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Create a new bonding curve token launch
     * @param name Token name (e.g., "My Token")
     * @param symbol Token symbol (e.g., "MTK")
     * @param totalSupply Total supply of tokens (e.g., 1_000_000 * 1e18)
     * @param initialPrice Starting price per token in wei (e.g., 0.0001 BNB = 1e14)
     * @param priceIncrement Price increase per token sold in wei (e.g., 1e12)
     * @param graduationThreshold Market cap threshold for DEX graduation in BNB wei (e.g., 69 BNB = 69e18)
     * @param enableSell Allow users to sell tokens back to the curve
     * @return launch Address of the deployed launch contract
     * @return token Address of the deployed token contract
     *
     * @dev Uses EIP-1167 minimal proxy pattern for gas efficiency
     * Typical gas cost: ~450k gas (vs ~2.5M for full deployments)
     */
    function createLaunch(
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        uint256 initialPrice,
        uint256 priceIncrement,
        uint256 graduationThreshold,
        bool enableSell
    ) external whenNotPaused returns (address launch, address token) {
        // Input validation
        if (bytes(name).length == 0 || bytes(symbol).length == 0) revert InvalidParameters();
        if (totalSupply == 0) revert InvalidTotalSupply();
        if (initialPrice == 0) revert InvalidPrice();
        if (graduationThreshold == 0) revert InvalidGraduationThreshold();

        // Deploy token as minimal clone
        token = Clones.clone(tokenImplementation);

        // Initialize token with total supply
        StandardERC20(token).initialize(name, symbol, totalSupply);

        // Deploy launch contract as minimal clone
        launch = Clones.clone(launchImplementation);

        // Build launch configuration
        IBondingCurveLaunch.LaunchConfig memory config = IBondingCurveLaunch.LaunchConfig({
            creator: msg.sender,
            token: token,
            name: name,
            symbol: symbol,
            totalSupply: totalSupply,
            initialPrice: initialPrice,
            priceIncrement: priceIncrement,
            graduationThreshold: graduationThreshold,
            creatorFeeBps: defaultCreatorFeeBps,
            platformFeeBps: defaultPlatformFeeBps,
            enableSell: enableSell
        });

        // Initialize launch contract
        IBondingCurveLaunch(launch).initialize(
            config,
            address(this),
            feeRecipient,
            pancakeRouter,
            pancakeFactory,
            wbnb
        );

        // Transfer all tokens from this factory to launch contract
        // (StandardERC20 mints to factory during initialization)
        bool success = StandardERC20(token).transfer(launch, totalSupply);
        if (!success) revert LaunchCreationFailed();

        // Register launch in factory
        allLaunches.push(launch);
        creatorLaunches[msg.sender].push(launch);
        isLaunch[launch] = true;
        tokenToLaunch[token] = launch;

        emit LaunchCreated(
            launch,
            token,
            msg.sender,
            totalSupply,
            initialPrice,
            graduationThreshold
        );

        return (launch, token);
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get total number of launches created
     * @return Total launch count
     */
    function launchCount() external view returns (uint256) {
        return allLaunches.length;
    }

    /**
     * @notice Get all launches (paginated)
     * @param offset Starting index
     * @param limit Number of launches to return
     * @return result Array of launch addresses
     */
    function getAllLaunches(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory result)
    {
        uint256 total = allLaunches.length;
        if (offset >= total) {
            return new address[](0);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 size = end - offset;
        result = new address[](size);

        for (uint256 i = 0; i < size; i++) {
            result[i] = allLaunches[offset + i];
        }

        return result;
    }

    /**
     * @notice Get all launches (non-paginated)
     * @return Array of all launch addresses
     * @dev Warning: May consume excessive gas for large arrays. Use paginated version for production.
     */
    function getAllLaunches() external view returns (address[] memory) {
        return allLaunches;
    }

    /**
     * @notice Get launch by index (alias for public array accessor)
     * @param index Index in the launches array
     * @return Launch address at the specified index
     */
    function launches(uint256 index) external view returns (address) {
        return allLaunches[index];
    }

    /**
     * @notice Get all launches created by a specific address
     * @param creator Address of the creator
     * @return Array of launch addresses
     */
    function getCreatorLaunches(address creator) external view returns (address[] memory) {
        return creatorLaunches[creator];
    }

    /**
     * @notice Get launch address for a given token
     * @param token Token contract address
     * @return Launch contract address (zero address if not found)
     */
    function getLaunchForToken(address token) external view returns (address) {
        return tokenToLaunch[token];
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Update implementation contracts (owner only)
     * @param launchImpl_ New launch implementation address
     * @param tokenImpl_ New token implementation address
     * @dev Only affects future launches, existing launches unchanged
     */
    function updateImplementations(address launchImpl_, address tokenImpl_)
        external
        onlyOwner
    {
        if (launchImpl_ == address(0) || tokenImpl_ == address(0)) {
            revert InvalidImplementation();
        }

        launchImplementation = launchImpl_;
        tokenImplementation = tokenImpl_;

        emit ImplementationsUpdated(launchImpl_, tokenImpl_);
    }

    /**
     * @notice Update launch implementation (owner only)
     * @param launchImpl_ New launch implementation address
     * @dev Only affects future launches, existing launches unchanged
     */
    function setLaunchImplementation(address launchImpl_) external onlyOwner {
        if (launchImpl_ == address(0)) {
            revert InvalidImplementation();
        }

        launchImplementation = launchImpl_;

        emit LaunchImplementationUpdated(launchImpl_);
    }

    /**
     * @notice Update token implementation (owner only)
     * @param tokenImpl_ New token implementation address
     * @dev Only affects future launches, existing launches unchanged
     */
    function setTokenImplementation(address tokenImpl_) external onlyOwner {
        if (tokenImpl_ == address(0)) {
            revert InvalidImplementation();
        }

        tokenImplementation = tokenImpl_;

        emit TokenImplementationUpdated(tokenImpl_);
    }

    /**
     * @notice Update fee recipient address (owner only)
     * @param newRecipient New fee recipient address
     */
    function updateFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) {
            revert InvalidFeeRecipient();
        }

        feeRecipient = newRecipient;

        emit FeeRecipientUpdated(newRecipient);
    }

    /**
     * @notice Update fee recipient address (owner only) - alias for updateFeeRecipient
     * @param newRecipient New fee recipient address
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) {
            revert InvalidFeeRecipient();
        }

        feeRecipient = newRecipient;

        emit FeeRecipientUpdated(newRecipient);
    }

    /**
     * @notice Update default fee basis points (owner only)
     * @param platformFeeBps_ New platform fee (100 = 1%)
     * @param creatorFeeBps_ New creator fee (50 = 0.5%)
     * @dev Only affects future launches, existing launches unchanged
     */
    function updateDefaultFees(uint256 platformFeeBps_, uint256 creatorFeeBps_)
        external
        onlyOwner
    {
        if (platformFeeBps_ > 1000 || creatorFeeBps_ > 1000) {
            revert InvalidFeeBps(); // Max 10% each
        }
        if (platformFeeBps_ + creatorFeeBps_ > 1500) {
            revert InvalidFeeBps(); // Max 15% combined
        }

        defaultPlatformFeeBps = platformFeeBps_;
        defaultCreatorFeeBps = creatorFeeBps_;

        emit DefaultFeesUpdated(platformFeeBps_, creatorFeeBps_);
    }

    /**
     * @notice Update platform fee (owner only)
     * @param platformFeeBps_ New platform fee in basis points (100 = 1%)
     * @dev Only affects future launches, existing launches unchanged
     */
    function setPlatformFee(uint256 platformFeeBps_) external onlyOwner {
        if (platformFeeBps_ > 10000) {
            revert InvalidFeeBps(); // Max 100%
        }

        defaultPlatformFeeBps = platformFeeBps_;

        emit PlatformFeeUpdated(platformFeeBps_);
    }

    /**
     * @notice Update creator fee (owner only)
     * @param creatorFeeBps_ New creator fee in basis points (100 = 1%)
     * @dev Only affects future launches, existing launches unchanged
     */
    function setCreatorFee(uint256 creatorFeeBps_) external onlyOwner {
        if (creatorFeeBps_ > 10000) {
            revert InvalidFeeBps(); // Max 100%
        }

        defaultCreatorFeeBps = creatorFeeBps_;

        emit CreatorFeeUpdated(creatorFeeBps_);
    }

    /**
     * @notice Pause the factory (owner only)
     * @dev Prevents new launches, existing launches unaffected
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the factory (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /*//////////////////////////////////////////////////////////////
                        UPGRADE AUTHORIZATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Authorize upgrade to new implementation (UUPS pattern)
     * @param newImplementation Address of new implementation contract
     * @dev Only callable by owner
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /*//////////////////////////////////////////////////////////////
                        STORAGE GAP
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Storage gap for future upgrades
     * Reduces from 50 to 43 to account for 7 new storage slots:
     * - launchImplementation
     * - tokenImplementation
     * - feeRecipient
     * - defaultPlatformFeeBps
     * - defaultCreatorFeeBps
     * - allLaunches (dynamic array, 1 slot for length)
     * - creatorLaunches (mapping, 1 slot)
     * - isLaunch (mapping, 1 slot)
     * - tokenToLaunch (mapping, 1 slot)
     */
    uint256[43] private __gap;
}
