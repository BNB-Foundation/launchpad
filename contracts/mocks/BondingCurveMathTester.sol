// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../BondingCurveMath.sol";

/**
 * @title BondingCurveMathTester
 * @notice Test wrapper to expose BondingCurveMath library functions
 * @dev This contract is only used for testing the math library
 */
contract BondingCurveMathTester {
    using BondingCurveMath for uint256;

    function calculatePrice(
        uint256 tokensSold,
        uint256 initialPrice,
        uint256 priceIncrement
    ) external pure returns (uint256) {
        return BondingCurveMath.calculatePrice(tokensSold, initialPrice, priceIncrement);
    }

    function calculatePurchaseReturn(
        uint256 bnbAmount,
        uint256 currentSupply,
        uint256 initialPrice,
        uint256 priceIncrement
    ) external pure returns (uint256) {
        return BondingCurveMath.calculatePurchaseReturn(bnbAmount, currentSupply, initialPrice, priceIncrement);
    }

    function calculateCost(
        uint256 tokenAmount,
        uint256 currentSupply,
        uint256 initialPrice,
        uint256 priceIncrement
    ) external pure returns (uint256) {
        return BondingCurveMath.calculateCost(tokenAmount, currentSupply, initialPrice, priceIncrement);
    }

    function calculateSaleReturn(
        uint256 tokenAmount,
        uint256 currentSupply,
        uint256 initialPrice,
        uint256 priceIncrement
    ) external pure returns (uint256) {
        return BondingCurveMath.calculateSaleReturn(tokenAmount, currentSupply, initialPrice, priceIncrement);
    }

    function calculateMarketCap(
        uint256 tokensSold,
        uint256 initialPrice,
        uint256 priceIncrement
    ) external pure returns (uint256) {
        return BondingCurveMath.calculateMarketCap(tokensSold, initialPrice, priceIncrement);
    }

    function calculateAveragePrice(
        uint256 tokenAmount,
        uint256 currentSupply,
        uint256 initialPrice,
        uint256 priceIncrement
    ) external pure returns (uint256) {
        return BondingCurveMath.calculateAveragePrice(tokenAmount, currentSupply, initialPrice, priceIncrement);
    }
}
