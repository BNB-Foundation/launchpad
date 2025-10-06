// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title BondingCurveMath
 * @notice Pure math library for linear bonding curve calculations (pump.fun model)
 * @dev Uses integral calculus for accurate batch purchase pricing
 *
 * Bonding Curve Formula:
 * price(x) = initialPrice + (priceIncrement × x)
 *
 * Cost to buy tokens from supply a to supply b:
 * cost = ∫[a→b] (initialPrice + priceIncrement × x) dx
 *      = initialPrice × (b - a) + priceIncrement × (b² - a²) / 2
 */
library BondingCurveMath {
    /// @notice Precision multiplier for calculations (10^18)
    uint256 private constant PRECISION = 1e18;

    /**
     * @notice Calculate the current price for the next token
     * @param tokensSold Number of tokens already sold
     * @param initialPrice Starting price in wei (e.g., 0.0001 BNB = 1e14)
     * @param priceIncrement Price increase per token in wei (e.g., 0.000001 BNB = 1e12)
     * @return Current price for next token in wei
     */
    function calculatePrice(
        uint256 tokensSold,
        uint256 initialPrice,
        uint256 priceIncrement
    ) internal pure returns (uint256) {
        // price = initialPrice + (priceIncrement * tokensSold) / PRECISION
        return initialPrice + (priceIncrement * tokensSold) / PRECISION;
    }

    /**
     * @notice Calculate how many tokens can be purchased with given BNB amount
     * @param bnbAmount Amount of BNB to spend (in wei)
     * @param currentSupply Current number of tokens sold
     * @param initialPrice Starting price per token
     * @param priceIncrement Price increase per token
     * @return tokensOut Number of tokens that will be received
     *
     * @dev Uses quadratic formula to solve for tokens:
     * bnbAmount = initialPrice * tokens + priceIncrement * (2*currentSupply*tokens + tokens²) / (2*PRECISION)
     *
     * Rearranged to standard form:
     * (priceIncrement/(2*PRECISION)) * tokens² + (initialPrice + priceIncrement*currentSupply/PRECISION) * tokens - bnbAmount = 0
     *
     * Using quadratic formula: tokens = (-b + sqrt(b² + 4ac)) / 2a
     * where:
     * a = priceIncrement / (2 * PRECISION)
     * b = initialPrice + (priceIncrement * currentSupply) / PRECISION
     * c = -bnbAmount
     */
    function calculatePurchaseReturn(
        uint256 bnbAmount,
        uint256 currentSupply,
        uint256 initialPrice,
        uint256 priceIncrement
    ) internal pure returns (uint256 tokensOut) {
        if (bnbAmount == 0) return 0;

        // For linear curve with small price increment, use simplified calculation
        // to avoid quadratic formula complexity and gas costs

        if (priceIncrement == 0) {
            // Fixed price: tokens = bnbAmount / initialPrice
            return (bnbAmount * PRECISION) / initialPrice;
        }

        // Calculate coefficients for quadratic formula
        // a = priceIncrement / (2 * PRECISION)
        // b = initialPrice + (priceIncrement * currentSupply) / PRECISION
        // c = bnbAmount (but negative in equation)

        uint256 b = initialPrice + (priceIncrement * currentSupply) / PRECISION;

        // Simplified approach: iterate to find tokens
        // Start with linear approximation
        uint256 avgPrice = b + (priceIncrement / 2);
        tokensOut = (bnbAmount * PRECISION) / avgPrice;

        // Refine with one iteration of Newton's method
        uint256 costEstimate = calculateCost(tokensOut, currentSupply, initialPrice, priceIncrement);

        if (costEstimate < bnbAmount) {
            // We can buy more tokens
            uint256 remaining = bnbAmount - costEstimate;
            uint256 newPrice = calculatePrice(currentSupply + tokensOut, initialPrice, priceIncrement);
            uint256 additionalTokens = (remaining * PRECISION) / newPrice;
            tokensOut += additionalTokens;
        } else if (costEstimate > bnbAmount) {
            // We need fewer tokens
            uint256 excess = costEstimate - bnbAmount;
            // Calculate average cost per token (keep precision to avoid division by zero)
            uint256 avgCost = (costEstimate * PRECISION) / tokensOut;
            uint256 tokensToRemove = (excess * PRECISION) / avgCost;
            tokensOut = tokensOut > tokensToRemove ? tokensOut - tokensToRemove : 0;
        }

        return tokensOut;
    }

    /**
     * @notice Calculate cost to purchase a specific number of tokens
     * @param tokenAmount Number of tokens to purchase
     * @param currentSupply Current tokens sold before purchase
     * @param initialPrice Starting price per token
     * @param priceIncrement Price increase per token
     * @return bnbCost Cost in BNB (wei)
     *
     * @dev Uses integral: cost = initialPrice * n + priceIncrement * (2*s*n + n²) / (2*PRECISION)
     * where n = tokenAmount, s = currentSupply
     */
    function calculateCost(
        uint256 tokenAmount,
        uint256 currentSupply,
        uint256 initialPrice,
        uint256 priceIncrement
    ) internal pure returns (uint256 bnbCost) {
        if (tokenAmount == 0) return 0;

        // cost = initialPrice * tokenAmount / PRECISION
        // (tokenAmount is in 18 decimals, so we divide by PRECISION to get correct BNB cost)
        bnbCost = (initialPrice * tokenAmount) / PRECISION;

        if (priceIncrement > 0) {
            // Add curve component: priceIncrement * (2*currentSupply*tokenAmount + tokenAmount²) / (2*PRECISION*PRECISION)
            // Need to divide by PRECISION twice because both tokenAmount and currentSupply are in 18 decimals
            uint256 curveComponent = priceIncrement * (2 * currentSupply * tokenAmount + tokenAmount * tokenAmount);
            bnbCost += curveComponent / (2 * PRECISION * PRECISION);
        }

        return bnbCost;
    }

    /**
     * @notice Calculate how much BNB is returned when selling tokens
     * @param tokenAmount Number of tokens to sell
     * @param currentSupply Current tokens sold (will decrease after sale)
     * @param initialPrice Starting price per token
     * @param priceIncrement Price increase per token
     * @return bnbOut Amount of BNB returned (in wei)
     *
     * @dev Selling moves backwards on the curve
     * Uses same integral but from (currentSupply - tokenAmount) to currentSupply
     */
    function calculateSaleReturn(
        uint256 tokenAmount,
        uint256 currentSupply,
        uint256 initialPrice,
        uint256 priceIncrement
    ) internal pure returns (uint256 bnbOut) {
        if (tokenAmount == 0 || tokenAmount > currentSupply) return 0;

        // Calculate the new supply after selling
        uint256 newSupply = currentSupply - tokenAmount;

        // Use the cost function: selling from newSupply to currentSupply
        bnbOut = calculateCost(tokenAmount, newSupply, initialPrice, priceIncrement);

        return bnbOut;
    }

    /**
     * @notice Calculate current market capitalization
     * @param tokensSold Number of tokens sold through the curve
     * @param initialPrice Starting price per token
     * @param priceIncrement Price increase per token
     * @return marketCap Total market cap in BNB (wei)
     *
     * @dev Market cap = currentPrice * tokensSold
     */
    function calculateMarketCap(
        uint256 tokensSold,
        uint256 initialPrice,
        uint256 priceIncrement
    ) internal pure returns (uint256 marketCap) {
        if (tokensSold == 0) return 0;

        uint256 currentPrice = calculatePrice(tokensSold, initialPrice, priceIncrement);
        marketCap = (currentPrice * tokensSold) / PRECISION;

        return marketCap;
    }

    /**
     * @notice Calculate average price for a batch of tokens
     * @param tokenAmount Number of tokens in batch
     * @param currentSupply Current supply before purchase
     * @param initialPrice Starting price
     * @param priceIncrement Price increment
     * @return avgPrice Average price per token in the batch
     */
    function calculateAveragePrice(
        uint256 tokenAmount,
        uint256 currentSupply,
        uint256 initialPrice,
        uint256 priceIncrement
    ) internal pure returns (uint256 avgPrice) {
        if (tokenAmount == 0) return 0;

        uint256 totalCost = calculateCost(tokenAmount, currentSupply, initialPrice, priceIncrement);
        avgPrice = (totalCost * PRECISION) / tokenAmount;

        return avgPrice;
    }
}
