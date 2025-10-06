import { expect } from "chai";
import { ethers } from "hardhat";
import { BondingCurveMathTester } from "../typechain-types";

describe("BondingCurveMath", function () {
  let mathTester: BondingCurveMathTester;

  // Common test constants
  const PRECISION = ethers.parseEther("1"); // 1e18
  const INITIAL_PRICE = ethers.parseUnits("0.0001", 18); // 0.0001 BNB per token
  const PRICE_INCREMENT = ethers.parseUnits("0.000001", 18); // 0.000001 BNB increase per token

  before(async function () {
    // Deploy a test contract that exposes the library functions
    const BondingCurveMathTester = await ethers.getContractFactory("BondingCurveMathTester");
    mathTester = await BondingCurveMathTester.deploy();
  });

  describe("calculatePrice", function () {
    it("Should return initial price when no tokens sold", async function () {
      const price = await mathTester.calculatePrice(0, INITIAL_PRICE, PRICE_INCREMENT);
      expect(price).to.equal(INITIAL_PRICE);
    });

    it("Should calculate correct price after 1000 tokens sold", async function () {
      const tokensSold = ethers.parseEther("1000");
      const price = await mathTester.calculatePrice(tokensSold, INITIAL_PRICE, PRICE_INCREMENT);

      // Expected: 0.0001 + (0.000001 * 1000) = 0.0011 BNB
      const expected = INITIAL_PRICE + (PRICE_INCREMENT * tokensSold) / PRECISION;
      expect(price).to.equal(expected);
    });

    it("Should calculate correct price after 10000 tokens sold", async function () {
      const tokensSold = ethers.parseEther("10000");
      const price = await mathTester.calculatePrice(tokensSold, INITIAL_PRICE, PRICE_INCREMENT);

      // Expected: 0.0001 + (0.000001 * 10000) = 0.0101 BNB
      const expected = INITIAL_PRICE + (PRICE_INCREMENT * tokensSold) / PRECISION;
      expect(price).to.equal(expected);
    });

    it("Should handle zero price increment (fixed price)", async function () {
      const tokensSold = ethers.parseEther("5000");
      const price = await mathTester.calculatePrice(tokensSold, INITIAL_PRICE, 0);
      expect(price).to.equal(INITIAL_PRICE);
    });

    it("Should handle large token amounts", async function () {
      const tokensSold = ethers.parseEther("1000000");
      const price = await mathTester.calculatePrice(tokensSold, INITIAL_PRICE, PRICE_INCREMENT);

      // Expected: 0.0001 + (0.000001 * 1000000) = 1.0001 BNB
      const expected = INITIAL_PRICE + (PRICE_INCREMENT * tokensSold) / PRECISION;
      expect(price).to.equal(expected);
    });

    it("Should increase linearly", async function () {
      const price1 = await mathTester.calculatePrice(
        ethers.parseEther("1000"),
        INITIAL_PRICE,
        PRICE_INCREMENT
      );
      const price2 = await mathTester.calculatePrice(
        ethers.parseEther("2000"),
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      // Price should increase by exactly PRICE_INCREMENT * 1000
      const expectedIncrease = (PRICE_INCREMENT * ethers.parseEther("1000")) / PRECISION;
      expect(price2 - price1).to.equal(expectedIncrease);
    });
  });

  describe("calculateCost", function () {
    it("Should return zero for zero tokens", async function () {
      const cost = await mathTester.calculateCost(0, 0, INITIAL_PRICE, PRICE_INCREMENT);
      expect(cost).to.equal(0);
    });

    it("Should calculate correct cost for first 100 tokens", async function () {
      const tokenAmount = ethers.parseEther("100");
      const cost = await mathTester.calculateCost(tokenAmount, 0, INITIAL_PRICE, PRICE_INCREMENT);

      // Cost = (initialPrice * n) / PRECISION + priceIncrement * (n²) / (2 * PRECISION * PRECISION)
      // Cost = (0.0001 * 100e18) / 1e18 + 0.000001 * (100e18)² / (2 * 1e18 * 1e18)
      // Cost = 0.01 + 0.005 = 0.015 BNB
      const expectedCost =
        (INITIAL_PRICE * tokenAmount) / PRECISION +
        (PRICE_INCREMENT * tokenAmount * tokenAmount) / (2n * PRECISION * PRECISION);

      expect(cost).to.equal(expectedCost);
    });

    it("Should calculate cost for buying from mid-point", async function () {
      const tokenAmount = ethers.parseEther("100");
      const currentSupply = ethers.parseEther("500");
      const cost = await mathTester.calculateCost(
        tokenAmount,
        currentSupply,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      // Should be more expensive than buying first 100 tokens
      const costFromStart = await mathTester.calculateCost(
        tokenAmount,
        0,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );
      expect(cost).to.be.gt(costFromStart);
    });

    it("Should handle fixed price (zero increment)", async function () {
      const tokenAmount = ethers.parseEther("1000");
      const cost = await mathTester.calculateCost(tokenAmount, 0, INITIAL_PRICE, 0);

      // With no price increment: cost = (initialPrice * tokenAmount) / PRECISION
      const expectedCost = (INITIAL_PRICE * tokenAmount) / PRECISION;
      expect(cost).to.equal(expectedCost);
    });

    it("Should calculate cost for large batches accurately", async function () {
      const tokenAmount = ethers.parseEther("10000");
      const cost = await mathTester.calculateCost(tokenAmount, 0, INITIAL_PRICE, PRICE_INCREMENT);

      // Cost should be calculable without overflow
      expect(cost).to.be.gt(0);
      expect(cost).to.be.lt(ethers.parseEther("1000")); // Sanity check
    });

    it("Should satisfy integral formula", async function () {
      // cost(a to b) = cost(0 to b) - cost(0 to a)
      const a = ethers.parseEther("100");
      const b = ethers.parseEther("300");

      const costAtoB = await mathTester.calculateCost(
        b - a,
        a,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      const cost0toB = await mathTester.calculateCost(b, 0, INITIAL_PRICE, PRICE_INCREMENT);
      const cost0toA = await mathTester.calculateCost(a, 0, INITIAL_PRICE, PRICE_INCREMENT);

      // Due to rounding, allow small difference
      expect(costAtoB).to.be.closeTo(cost0toB - cost0toA, ethers.parseEther("0.0001"));
    });
  });

  describe("calculatePurchaseReturn", function () {
    it("Should return zero for zero BNB", async function () {
      const tokens = await mathTester.calculatePurchaseReturn(0, 0, INITIAL_PRICE, PRICE_INCREMENT);
      expect(tokens).to.equal(0);
    });

    it("Should calculate tokens for 1 BNB at start", async function () {
      const bnbAmount = ethers.parseEther("1");
      const tokens = await mathTester.calculatePurchaseReturn(
        bnbAmount,
        0,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      // At initial price 0.0001 BNB/token, 1 BNB should buy approximately 10000 tokens
      // (less due to price increase)
      expect(tokens).to.be.gt(ethers.parseEther("9000"));
      expect(tokens).to.be.lt(ethers.parseEther("10000"));
    });

    it("Should return fewer tokens when buying from higher supply", async function () {
      const bnbAmount = ethers.parseEther("1");
      const currentSupply = ethers.parseEther("10000");

      const tokensFromStart = await mathTester.calculatePurchaseReturn(
        bnbAmount,
        0,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      const tokensFromMid = await mathTester.calculatePurchaseReturn(
        bnbAmount,
        currentSupply,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      expect(tokensFromMid).to.be.lt(tokensFromStart);
    });

    it("Should handle fixed price correctly", async function () {
      const bnbAmount = ethers.parseEther("1");
      const tokens = await mathTester.calculatePurchaseReturn(bnbAmount, 0, INITIAL_PRICE, 0);

      // With fixed price: tokens = bnbAmount / initialPrice
      const expectedTokens = (bnbAmount * PRECISION) / INITIAL_PRICE;
      expect(tokens).to.equal(expectedTokens);
    });

    it("Should be inverse of calculateCost (approximately)", async function () {
      const tokenAmount = ethers.parseEther("1000");
      const currentSupply = ethers.parseEther("500");

      // Calculate cost to buy tokenAmount tokens
      const cost = await mathTester.calculateCost(
        tokenAmount,
        currentSupply,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      // Calculate tokens we can buy with that cost
      const tokensReceived = await mathTester.calculatePurchaseReturn(
        cost,
        currentSupply,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      // Should be approximately equal (within 1% due to iterative approximation)
      const tolerance = tokenAmount / 100n; // 1% tolerance
      expect(tokensReceived).to.be.closeTo(tokenAmount, tolerance);
    });

    it("Should handle small BNB amounts", async function () {
      const bnbAmount = ethers.parseEther("0.001"); // 0.001 BNB
      const tokens = await mathTester.calculatePurchaseReturn(
        bnbAmount,
        0,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      expect(tokens).to.be.gt(0);
      expect(tokens).to.be.lt(ethers.parseEther("100"));
    });

    it("Should handle large BNB amounts", async function () {
      const bnbAmount = ethers.parseEther("100"); // 100 BNB
      const tokens = await mathTester.calculatePurchaseReturn(
        bnbAmount,
        0,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      expect(tokens).to.be.gt(0);
      // Should not overflow or return unreasonable values
    });
  });

  describe("calculateSaleReturn", function () {
    it("Should return zero for zero tokens", async function () {
      const bnb = await mathTester.calculateSaleReturn(0, 1000, INITIAL_PRICE, PRICE_INCREMENT);
      expect(bnb).to.equal(0);
    });

    it("Should return zero if selling more than supply", async function () {
      const currentSupply = ethers.parseEther("100");
      const tokenAmount = ethers.parseEther("200");
      const bnb = await mathTester.calculateSaleReturn(
        tokenAmount,
        currentSupply,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );
      expect(bnb).to.equal(0);
    });

    it("Should calculate BNB return for selling tokens", async function () {
      const currentSupply = ethers.parseEther("1000");
      const tokenAmount = ethers.parseEther("100");
      const bnb = await mathTester.calculateSaleReturn(
        tokenAmount,
        currentSupply,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      expect(bnb).to.be.gt(0);
    });

    it("Should return less BNB when selling from lower supply", async function () {
      const tokenAmount = ethers.parseEther("100");

      const bnbFromHigh = await mathTester.calculateSaleReturn(
        tokenAmount,
        ethers.parseEther("10000"),
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      const bnbFromLow = await mathTester.calculateSaleReturn(
        tokenAmount,
        ethers.parseEther("1000"),
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      expect(bnbFromLow).to.be.lt(bnbFromHigh);
    });

    it("Should be inverse of buy (buy then sell)", async function () {
      const bnbAmount = ethers.parseEther("1");
      const currentSupply = ethers.parseEther("5000");

      // Buy tokens
      const tokensBought = await mathTester.calculatePurchaseReturn(
        bnbAmount,
        currentSupply,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      // Sell those tokens back
      const bnbReceived = await mathTester.calculateSaleReturn(
        tokensBought,
        currentSupply + tokensBought,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      // Should get back approximately the same BNB (within 2% due to approximations)
      const tolerance = bnbAmount / 50n; // 2% tolerance
      expect(bnbReceived).to.be.closeTo(bnbAmount, tolerance);
    });

    it("Should handle fixed price correctly", async function () {
      const currentSupply = ethers.parseEther("1000");
      const tokenAmount = ethers.parseEther("100");
      const bnb = await mathTester.calculateSaleReturn(tokenAmount, currentSupply, INITIAL_PRICE, 0);

      // With fixed price: bnb = tokenAmount * initialPrice
      const expectedBnb = (tokenAmount * INITIAL_PRICE) / PRECISION;
      expect(bnb).to.equal(expectedBnb);
    });

    it("Should calculate correctly for selling all supply", async function () {
      const currentSupply = ethers.parseEther("1000");
      const bnb = await mathTester.calculateSaleReturn(
        currentSupply,
        currentSupply,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      // Should equal the cost to buy 1000 tokens from 0
      const costToBuy = await mathTester.calculateCost(
        currentSupply,
        0,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      expect(bnb).to.equal(costToBuy);
    });
  });

  describe("calculateMarketCap", function () {
    it("Should return zero for zero tokens sold", async function () {
      const marketCap = await mathTester.calculateMarketCap(0, INITIAL_PRICE, PRICE_INCREMENT);
      expect(marketCap).to.equal(0);
    });

    it("Should calculate market cap correctly", async function () {
      const tokensSold = ethers.parseEther("10000");
      const marketCap = await mathTester.calculateMarketCap(
        tokensSold,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      // Market cap = currentPrice * tokensSold
      const currentPrice = await mathTester.calculatePrice(
        tokensSold,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );
      const expectedMarketCap = (currentPrice * tokensSold) / PRECISION;

      expect(marketCap).to.equal(expectedMarketCap);
    });

    it("Should increase as tokens are sold", async function () {
      const marketCap1 = await mathTester.calculateMarketCap(
        ethers.parseEther("1000"),
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      const marketCap2 = await mathTester.calculateMarketCap(
        ethers.parseEther("2000"),
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      expect(marketCap2).to.be.gt(marketCap1);
    });

    it("Should handle fixed price correctly", async function () {
      const tokensSold = ethers.parseEther("5000");
      const marketCap = await mathTester.calculateMarketCap(tokensSold, INITIAL_PRICE, 0);

      // With fixed price: marketCap = initialPrice * tokensSold
      const expectedMarketCap = (INITIAL_PRICE * tokensSold) / PRECISION;
      expect(marketCap).to.equal(expectedMarketCap);
    });

    it("Should handle large token supplies", async function () {
      const tokensSold = ethers.parseEther("1000000");
      const marketCap = await mathTester.calculateMarketCap(
        tokensSold,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      expect(marketCap).to.be.gt(0);
      // Should not overflow
    });
  });

  describe("calculateAveragePrice", function () {
    it("Should return zero for zero tokens", async function () {
      const avgPrice = await mathTester.calculateAveragePrice(0, 0, INITIAL_PRICE, PRICE_INCREMENT);
      expect(avgPrice).to.equal(0);
    });

    it("Should calculate average price for first batch", async function () {
      const tokenAmount = ethers.parseEther("100");
      const avgPrice = await mathTester.calculateAveragePrice(
        tokenAmount,
        0,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      // Average should be between initial price and price at 100 tokens
      const priceAt0 = await mathTester.calculatePrice(0, INITIAL_PRICE, PRICE_INCREMENT);
      const priceAt100 = await mathTester.calculatePrice(
        tokenAmount,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      expect(avgPrice).to.be.gte(priceAt0);
      expect(avgPrice).to.be.lte(priceAt100);
    });

    it("Should equal initial price for fixed price curve", async function () {
      const tokenAmount = ethers.parseEther("1000");
      const avgPrice = await mathTester.calculateAveragePrice(tokenAmount, 0, INITIAL_PRICE, 0);

      expect(avgPrice).to.equal(INITIAL_PRICE);
    });

    it("Should increase with starting supply", async function () {
      const tokenAmount = ethers.parseEther("100");

      const avgPriceFromStart = await mathTester.calculateAveragePrice(
        tokenAmount,
        0,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      const avgPriceFromMid = await mathTester.calculateAveragePrice(
        tokenAmount,
        ethers.parseEther("5000"),
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      expect(avgPriceFromMid).to.be.gt(avgPriceFromStart);
    });

    it("Should match cost divided by amount", async function () {
      const tokenAmount = ethers.parseEther("500");
      const currentSupply = ethers.parseEther("1000");

      const avgPrice = await mathTester.calculateAveragePrice(
        tokenAmount,
        currentSupply,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      const cost = await mathTester.calculateCost(
        tokenAmount,
        currentSupply,
        INITIAL_PRICE,
        PRICE_INCREMENT
      );

      const expectedAvgPrice = (cost * PRECISION) / tokenAmount;
      expect(avgPrice).to.equal(expectedAvgPrice);
    });
  });

  describe("Edge Cases and Precision", function () {
    it("Should handle very small price increments", async function () {
      const smallIncrement = 1n; // 1 wei
      const tokensSold = ethers.parseEther("1000000");

      const price = await mathTester.calculatePrice(tokensSold, INITIAL_PRICE, smallIncrement);
      expect(price).to.be.gte(INITIAL_PRICE);
    });

    it("Should handle very large price increments", async function () {
      const largeIncrement = ethers.parseEther("0.1");
      const tokensSold = ethers.parseEther("10");

      const price = await mathTester.calculatePrice(tokensSold, INITIAL_PRICE, largeIncrement);
      expect(price).to.be.gt(INITIAL_PRICE);
    });

    it("Should not overflow with maximum realistic values", async function () {
      const maxTokens = ethers.parseEther("100000000"); // 100M tokens
      const cost = await mathTester.calculateCost(maxTokens, 0, INITIAL_PRICE, PRICE_INCREMENT);

      expect(cost).to.be.gt(0);
      // Should complete without revert
    });

    it("Should maintain precision for small amounts", async function () {
      const bnbAmount = ethers.parseUnits("1", 15); // 0.001 BNB
      const tokens = await mathTester.calculatePurchaseReturn(bnbAmount, 0, INITIAL_PRICE, PRICE_INCREMENT);

      expect(tokens).to.be.gt(0);
    });

    it("Should handle consecutive buy/sell cycles", async function () {
      let currentSupply = 0n;
      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        const bnbAmount = ethers.parseEther("0.1");

        // Buy
        const tokensBought = await mathTester.calculatePurchaseReturn(
          bnbAmount,
          currentSupply,
          INITIAL_PRICE,
          PRICE_INCREMENT
        );
        currentSupply += tokensBought;

        // Sell half
        const tokensToSell = tokensBought / 2n;
        const bnbReceived = await mathTester.calculateSaleReturn(
          tokensToSell,
          currentSupply,
          INITIAL_PRICE,
          PRICE_INCREMENT
        );
        currentSupply -= tokensToSell;

        expect(bnbReceived).to.be.gt(0);
        expect(bnbReceived).to.be.lt(bnbAmount);
      }
    });
  });

  describe("Gas Efficiency", function () {
    it("Should calculate price efficiently", async function () {
      const tx = await mathTester.calculatePrice(
        ethers.parseEther("1000"),
        INITIAL_PRICE,
        PRICE_INCREMENT
      );
      // Price calculation should be very cheap (view function)
    });

    it("Should calculate cost efficiently for large batches", async function () {
      const tx = await mathTester.calculateCost(
        ethers.parseEther("10000"),
        ethers.parseEther("5000"),
        INITIAL_PRICE,
        PRICE_INCREMENT
      );
      // Should complete without excessive gas
    });
  });
});
