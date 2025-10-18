// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title StandardERC20
 * @notice Initializable ERC20 token used as template for minimal clones
 * @dev This contract is deployed once and cloned via EIP-1167 for each token launch
 *
 * Key Features:
 * - Initializable pattern for clone compatibility
 * - Fixed total supply minted at initialization
 * - No additional minting capability after deployment
 * - Standard OpenZeppelin ERC20 implementation
 */
contract StandardERC20 is Initializable, ERC20Upgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the token with name, symbol, and total supply
     * @param name_ Token name (e.g., "My Token")
     * @param symbol_ Token symbol (e.g., "MTK")
     * @param totalSupply_ Total supply to mint to the contract itself
     * @dev Can only be called once per clone. All tokens minted to msg.sender (factory)
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_
    ) external initializer {
        __ERC20_init(name_, symbol_);

        // Mint entire supply to the factory (msg.sender)
        // Factory will transfer tokens to the launch contract
        _mint(msg.sender, totalSupply_);
    }
}
