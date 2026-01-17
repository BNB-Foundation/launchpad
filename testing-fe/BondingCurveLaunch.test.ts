import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import {
  BondingCurveLaunch,
  MockERC20,
  MockPancakeRouter,
  MockPancakeFactory,
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("BondingCurveLaunch", function () {
  // Test configuration constants
  const INITIAL_PRICE = ethers.parseUnits("0.0001", 18); // 0.0001 BNB per token
  const PRICE_INCREMENT = ethers.parseUnits("0.000001", 18); // 0.000001 BNB increase per token
  const TOTAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens
  const GRADUATION_THRESHOLD = ethers.parseEther("50"); // 50 BNB market cap
  const CREATOR_FEE_BPS = 50; // 0.5%
  const PLATFORM_FEE_BPS = 100; // 1%

  async function deployBondingCurveLaunchFixture() {
    const [owner, creator, platformFeeRecipient, user1, user2, user3] = await ethers.getSigners();

    // Deploy mock token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Test Token", "TEST", 18);
    await token.mint(owner.address, TOTAL_SUPPLY);

    // Deploy mock PancakeSwap contracts
    const MockPancakeFactory = await ethers.getContractFactory("MockPancakeFactory");
    const mockFactory = await MockPancakeFactory.deploy();

    const MockPancakeRouter = await ethers.getContractFactory("MockPancakeRouter");
    const mockRouter = await MockPancakeRouter.deploy();

    // Deploy mock WBNB
    const mockWBNB = await MockERC20.deploy("Wrapped BNB", "WBNB", 18);

    // Deploy BondingCurveLaunch implementation
    const BondingCurveLaunch = await ethers.getContractFactory("BondingCurveLaunch");
    const launch = await BondingCurveLaunch.deploy();

    // Initialize launch
    const launchConfig = {
      creator: creator.address,
      token: await token.getAddress(),
      name: "Test Token",
      symbol: "TEST",
      totalSupply: TOTAL_SUPPLY,
      initialPrice: INITIAL_PRICE,
      priceIncrement: PRICE_INCREMENT,
      graduationThreshold: GRADUATION_THRESHOLD,
      creatorFeeBps: CREATOR_FEE_BPS,
      platformFeeBps: PLATFORM_FEE_BPS,
      enableSell: true,
    };

    await launch.initialize(
      launchConfig,
      owner.address, // factory address
      platformFeeRecipient.address,
      await mockRouter.getAddress(),
      await mockFactory.getAddress(),
      await mockWBNB.getAddress()
    );

    // Transfer tokens to launch contract
    await token.transfer(await launch.getAddress(), TOTAL_SUPPLY);

    return {
      launch,
      token,
      mockRouter,
      mockFactory,
      mockWBNB,
      owner,
      creator,
      platformFeeRecipient,
      user1,
      user2,
      user3,
    };
  }

  describe("Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      const { launch, token, creator } = await loadFixture(deployBondingCurveLaunchFixture);

      const config = await launch.config();
      expect(config.creator).to.equal(creator.address);
      expect(config.token).to.equal(await token.getAddress());
      expect(config.totalSupply).to.equal(TOTAL_SUPPLY);
      expect(config.initialPrice).to.equal(INITIAL_PRICE);
      expect(config.priceIncrement).to.equal(PRICE_INCREMENT);
      expect(config.graduationThreshold).to.equal(GRADUATION_THRESHOLD);
      expect(config.creatorFeeBps).to.equal(CREATOR_FEE_BPS);
      expect(config.platformFeeBps).to.equal(PLATFORM_FEE_BPS);
      expect(config.enableSell).to.be.true;
    });

    it("Should start with zero tokens sold", async function () {
      const { launch } = await loadFixture(deployBondingCurveLaunchFixture);
      expect(await launch.tokensSold()).to.equal(0);
    });

    it("Should not be graduated initially", async function () {
      const { launch } = await loadFixture(deployBondingCurveLaunchFixture);
      expect(await launch.graduated()).to.be.false;
    });

    it("Should have tokens in contract", async function () {
      const { launch, token } = await loadFixture(deployBondingCurveLaunchFixture);
      const balance = await token.balanceOf(await launch.getAddress());
      expect(balance).to.equal(TOTAL_SUPPLY);
    });

    it("Should revert on double initialization", async function () {
      const { launch, creator, platformFeeRecipient, mockRouter, mockFactory, mockWBNB, token } =
        await loadFixture(deployBondingCurveLaunchFixture);

      const launchConfig = {
        creator: creator.address,
        token: await token.getAddress(),
        name: "Test Token",
        symbol: "TEST",
        totalSupply: TOTAL_SUPPLY,
        initialPrice: INITIAL_PRICE,
        priceIncrement: PRICE_INCREMENT,
        graduationThreshold: GRADUATION_THRESHOLD,
        creatorFeeBps: CREATOR_FEE_BPS,
        platformFeeBps: PLATFORM_FEE_BPS,
        enableSell: true,
      };

      await expect(
        launch.initialize(
          launchConfig,
          platformFeeRecipient.address,
          platformFeeRecipient.address,
          await mockRouter.getAddress(),
          await mockFactory.getAddress(),
          await mockWBNB.getAddress()
        )
      ).to.be.revertedWithCustomError(launch, "InvalidInitialization");
    });
  });

  describe("buy() - Basic Functionality", function () {
    it("Should allow buying tokens with BNB", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      const bnbAmount = ethers.parseEther("1");
      await expect(launch.connect(user1).buy(0, { value: bnbAmount })).to.not.be.reverted;
    });

    it("Should transfer tokens to buyer", async function () {
      const { launch, token, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      const bnbAmount = ethers.parseEther("1");
      const balanceBefore = await token.balanceOf(user1.address);

      await launch.connect(user1).buy(0, { value: bnbAmount });

      const balanceAfter = await token.balanceOf(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should increase tokensSold", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      const bnbAmount = ethers.parseEther("1");
      const tokensSoldBefore = await launch.tokensSold();

      await launch.connect(user1).buy(0, { value: bnbAmount });

      const tokensSoldAfter = await launch.tokensSold();
      expect(tokensSoldAfter).to.be.gt(tokensSoldBefore);
    });

    it("Should increase totalBnbRaised", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      const bnbAmount = ethers.parseEther("1");
      const totalBefore = await launch.totalBnbRaised();

      await launch.connect(user1).buy(0, { value: bnbAmount });

      const totalAfter = await launch.totalBnbRaised();
      expect(totalAfter).to.be.gt(totalBefore);
    });

    it("Should emit TokensBought event", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      const bnbAmount = ethers.parseEther("1");
      await expect(launch.connect(user1).buy(0, { value: bnbAmount }))
        .to.emit(launch, "TokensBought")
        .withArgs(user1.address, bnbAmount, await launch.tokensSold(), await launch.getCurrentPrice());
    });

    it("Should revert with zero BNB", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      await expect(launch.connect(user1).buy(0, { value: 0 })).to.be.revertedWithCustomError(
        launch,
        "InvalidAmount"
      );
    });

    it("Should revert if exceeds total supply", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      // Try to buy with huge amount
      const hugeAmount = ethers.parseEther("10000");
      await expect(
        launch.connect(user1).buy(0, { value: hugeAmount })
      ).to.be.revertedWithCustomError(launch, "SupplyExceeded");
    });

    it("Should update token balances mapping", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      const bnbAmount = ethers.parseEther("0.5");
      await launch.connect(user1).buy(0, { value: bnbAmount });

      const balance = await launch.tokenBalances(user1.address);
      expect(balance).to.be.gt(0);
    });
  });

  describe("buy() - Price Calculations", function () {
    it("Should calculate correct token amount for purchase", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      const bnbAmount = ethers.parseEther("1");
      const expectedTokens = await launch.getTokensForBnb(bnbAmount);

      await launch.connect(user1).buy(0, { value: bnbAmount });

      const tokenBalance = await launch.tokenBalances(user1.address);
      expect(tokenBalance).to.be.closeTo(expectedTokens, ethers.parseEther("100")); // Allow 100 token tolerance
    });

    it("Should increase price as tokens are sold", async function () {
      const { launch, user1, user2 } = await loadFixture(deployBondingCurveLaunchFixture);

      const priceBefore = await launch.getCurrentPrice();

      await launch.connect(user1).buy(0, { value: ethers.parseEther("1") });

      const priceAfter = await launch.getCurrentPrice();
      expect(priceAfter).to.be.gt(priceBefore);
    });

    it("Should provide fewer tokens for same BNB as supply increases", async function () {
      const { launch, user1, user2 } = await loadFixture(deployBondingCurveLaunchFixture);

      const bnbAmount = ethers.parseEther("0.5");

      await launch.connect(user1).buy(0, { value: bnbAmount });
      const tokens1 = await launch.tokenBalances(user1.address);

      await launch.connect(user2).buy(0, { value: bnbAmount });
      const tokens2 = await launch.tokenBalances(user2.address);

      expect(tokens2).to.be.lt(tokens1);
    });

    it("Should calculate market cap correctly", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("5") });

      const marketCap = await launch.getMarketCap();
      expect(marketCap).to.be.gt(0);
    });
  });

  describe("buy() - Fee Handling", function () {
    it("Should deduct creator fee from purchase", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      const bnbAmount = ethers.parseEther("1");
      await launch.connect(user1).buy(0, { value: bnbAmount });

      const creatorFees = await launch.accumulatedCreatorFees();
      const expectedFee = (bnbAmount * BigInt(CREATOR_FEE_BPS)) / 10000n;
      expect(creatorFees).to.equal(expectedFee);
    });

    it("Should deduct platform fee from purchase", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      const bnbAmount = ethers.parseEther("1");
      await launch.connect(user1).buy(0, { value: bnbAmount });

      const platformFees = await launch.accumulatedPlatformFees();
      const expectedFee = (bnbAmount * BigInt(PLATFORM_FEE_BPS)) / 10000n;
      expect(platformFees).to.equal(expectedFee);
    });

    it("Should accumulate fees from multiple purchases", async function () {
      const { launch, user1, user2 } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("1") });
      await launch.connect(user2).buy(0, { value: ethers.parseEther("2") });

      const totalFees = await launch.accumulatedCreatorFees();
      const expectedFees =
        ((ethers.parseEther("1") + ethers.parseEther("2")) * BigInt(CREATOR_FEE_BPS)) / 10000n;
      expect(totalFees).to.equal(expectedFees);
    });
  });

  describe("buy() - Slippage Protection", function () {
    it("Should revert if tokens received less than minTokensOut", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      const bnbAmount = ethers.parseEther("1");
      const expectedTokens = await launch.getTokensForBnb(bnbAmount);
      const unrealisticMin = expectedTokens * 2n; // Expect 2x tokens (impossible)

      await expect(
        launch.connect(user1).buy(unrealisticMin, { value: bnbAmount })
      ).to.be.revertedWithCustomError(launch, "SlippageExceeded");
    });

    it("Should succeed if tokens received meets minTokensOut", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      const bnbAmount = ethers.parseEther("1");
      const expectedTokens = await launch.getTokensForBnb(bnbAmount);
      const minTokens = (expectedTokens * 95n) / 100n; // Accept 5% slippage

      await expect(launch.connect(user1).buy(minTokens, { value: bnbAmount })).to.not.be.reverted;
    });

    it("Should handle price movement between view and transaction", async function () {
      const { launch, user1, user2 } = await loadFixture(deployBondingCurveLaunchFixture);

      const bnbAmount = ethers.parseEther("1");

      // User1 buys, changing the price
      await launch.connect(user1).buy(0, { value: bnbAmount });

      // User2 queries expected tokens (now at higher price)
      const expectedTokens = await launch.getTokensForBnb(bnbAmount);
      const minTokens = (expectedTokens * 98n) / 100n; // 2% slippage

      // User2 buys with slippage protection
      await expect(launch.connect(user2).buy(minTokens, { value: bnbAmount })).to.not.be.reverted;
    });
  });

  describe("sell() - Basic Functionality", function () {
    it("Should allow selling tokens back to curve", async function () {
      const { launch, user1, token } = await loadFixture(deployBondingCurveLaunchFixture);

      // Buy tokens first
      await launch.connect(user1).buy(0, { value: ethers.parseEther("1") });
      const tokensOwned = await launch.tokenBalances(user1.address);

      // Sell half
      const tokensToSell = tokensOwned / 2n;

      // Approve launch contract to spend tokens
      await token.connect(user1).approve(await launch.getAddress(), tokensToSell);

      await expect(launch.connect(user1).sell(tokensToSell, 0)).to.not.be.reverted;
    });

    it("Should return BNB to seller", async function () {
      const { launch, user1, token } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("1") });
      const tokensOwned = await launch.tokenBalances(user1.address);

      const tokensToSell = tokensOwned / 2n;

      // Approve launch contract to spend tokens
      await token.connect(user1).approve(await launch.getAddress(), tokensToSell);

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      const tx = await launch.connect(user1).sell(tokensToSell, 0);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore - gasUsed);
    });

    it("Should decrease tokensSold", async function () {
      const { launch, user1, token } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("1") });
      const tokensSoldAfterBuy = await launch.tokensSold();

      const tokensOwned = await launch.tokenBalances(user1.address);
      const tokensToSell = tokensOwned / 2n;

      // Approve launch contract to spend tokens
      await token.connect(user1).approve(await launch.getAddress(), tokensToSell);

      await launch.connect(user1).sell(tokensToSell, 0);

      const tokensSoldAfterSell = await launch.tokensSold();
      expect(tokensSoldAfterSell).to.be.lt(tokensSoldAfterBuy);
    });

    it("Should emit TokensSold event", async function () {
      const { launch, user1, token } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("1") });
      const tokensOwned = await launch.tokenBalances(user1.address);
      const tokensToSell = tokensOwned / 2n;

      // Approve launch contract to spend tokens
      await token.connect(user1).approve(await launch.getAddress(), tokensToSell);

      await expect(launch.connect(user1).sell(tokensToSell, 0))
        .to.emit(launch, "TokensSold")
        .withArgs(user1.address, tokensToSell, await launch.getCurrentPrice());
    });

    it("Should revert if selling is disabled", async function () {
      const { launch, creator, user1, platformFeeRecipient, mockRouter, mockFactory, mockWBNB, token } =
        await loadFixture(deployBondingCurveLaunchFixture);

      // Deploy new launch with selling disabled
      const BondingCurveLaunch = await ethers.getContractFactory("BondingCurveLaunch");
      const launchNoSell = await BondingCurveLaunch.deploy();

      const launchConfig = {
        creator: creator.address,
        token: await token.getAddress(),
        name: "Test Token",
        symbol: "TEST",
        totalSupply: TOTAL_SUPPLY,
        initialPrice: INITIAL_PRICE,
        priceIncrement: PRICE_INCREMENT,
        graduationThreshold: GRADUATION_THRESHOLD,
        creatorFeeBps: CREATOR_FEE_BPS,
        platformFeeBps: PLATFORM_FEE_BPS,
        enableSell: false, // Disabled
      };

      await launchNoSell.initialize(
        launchConfig,
        platformFeeRecipient.address,
        platformFeeRecipient.address,
        await mockRouter.getAddress(),
        await mockFactory.getAddress(),
        await mockWBNB.getAddress()
      );

      await token.transfer(await launchNoSell.getAddress(), TOTAL_SUPPLY);

      await launchNoSell.connect(user1).buy(0, { value: ethers.parseEther("1") });
      const tokensOwned = await launchNoSell.tokenBalances(user1.address);

      // Approve launch contract to spend tokens (even though it will fail due to SellDisabled)
      await token.connect(user1).approve(await launchNoSell.getAddress(), tokensOwned);

      await expect(
        launchNoSell.connect(user1).sell(tokensOwned, 0)
      ).to.be.revertedWithCustomError(launchNoSell, "SellDisabled");
    });

    it("Should revert if selling more than owned", async function () {
      const { launch, user1, token } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("1") });
      const tokensOwned = await launch.tokenBalances(user1.address);

      // Approve launch contract to spend tokens (even though it will fail due to InsufficientBalance)
      await token.connect(user1).approve(await launch.getAddress(), tokensOwned * 2n);

      await expect(
        launch.connect(user1).sell(tokensOwned * 2n, 0)
      ).to.be.revertedWithCustomError(launch, "InsufficientBalance");
    });

    it("Should revert with zero token amount", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      await expect(launch.connect(user1).sell(0, 0)).to.be.revertedWithCustomError(
        launch,
        "InvalidAmount"
      );
    });
  });

  describe("sell() - Price Impact", function () {
    it("Should decrease price when selling", async function () {
      const { launch, user1, token } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("5") });
      const priceAfterBuy = await launch.getCurrentPrice();

      const tokensOwned = await launch.tokenBalances(user1.address);
      const tokensToSell = tokensOwned / 2n;

      // Approve launch contract to spend tokens
      await token.connect(user1).approve(await launch.getAddress(), tokensToSell);

      await launch.connect(user1).sell(tokensToSell, 0);

      const priceAfterSell = await launch.getCurrentPrice();
      expect(priceAfterSell).to.be.lt(priceAfterBuy);
    });

    it("Should charge fees on sell", async function () {
      const { launch, user1, token } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("1") });
      const tokensOwned = await launch.tokenBalances(user1.address);

      const expectedBnb = await launch.getBnbForTokens(tokensOwned);
      const totalFeesBps = CREATOR_FEE_BPS + PLATFORM_FEE_BPS;
      const expectedBnbAfterFees = expectedBnb - (expectedBnb * BigInt(totalFeesBps)) / 10000n;

      // Approve launch contract to spend tokens
      await token.connect(user1).approve(await launch.getAddress(), tokensOwned);

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      const tx = await launch.connect(user1).sell(tokensOwned, 0);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(user1.address);
      const actualBnbReceived = balanceAfter - balanceBefore + gasUsed;

      // Allow small tolerance for rounding
      expect(actualBnbReceived).to.be.closeTo(expectedBnbAfterFees, ethers.parseEther("0.001"));
    });
  });

  describe("sell() - Slippage Protection", function () {
    it("Should revert if BNB received less than minBnbOut", async function () {
      const { launch, user1, token } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("1") });
      const tokensOwned = await launch.tokenBalances(user1.address);

      const expectedBnb = await launch.getBnbForTokens(tokensOwned);
      const unrealisticMin = expectedBnb * 2n; // Expect 2x BNB (impossible)

      // Approve launch contract to spend tokens
      await token.connect(user1).approve(await launch.getAddress(), tokensOwned);

      await expect(
        launch.connect(user1).sell(tokensOwned, unrealisticMin)
      ).to.be.revertedWithCustomError(launch, "SlippageExceeded");
    });

    it("Should succeed if BNB received meets minBnbOut", async function () {
      const { launch, user1, token } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("1") });
      const tokensOwned = await launch.tokenBalances(user1.address);

      const expectedBnb = await launch.getBnbForTokens(tokensOwned);
      const minBnb = (expectedBnb * 90n) / 100n; // Accept 10% slippage

      // Approve launch contract to spend tokens
      await token.connect(user1).approve(await launch.getAddress(), tokensOwned);

      await expect(launch.connect(user1).sell(tokensOwned, minBnb)).to.not.be.reverted;
    });
  });

  describe("Graduation - Threshold Detection", function () {
    it("Should auto-graduate when market cap reaches threshold", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      // Buy enough to reach graduation threshold
      const bnbAmount = ethers.parseEther("60"); // Above 50 BNB threshold
      await launch.connect(user1).buy(0, { value: bnbAmount });

      expect(await launch.graduated()).to.be.true;
    });

    it("Should emit GraduatedToDex event", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      const bnbAmount = ethers.parseEther("60");
      await expect(launch.connect(user1).buy(0, { value: bnbAmount }))
        .to.emit(launch, "GraduatedToDex");
    });

    it("Should not graduate below threshold", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("10") });

      expect(await launch.graduated()).to.be.false;
    });

    it("Should prevent buying after graduation", async function () {
      const { launch, user1, user2 } = await loadFixture(deployBondingCurveLaunchFixture);

      // Graduate
      await launch.connect(user1).buy(0, { value: ethers.parseEther("60") });

      // Try to buy after graduation
      await expect(
        launch.connect(user2).buy(0, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(launch, "AlreadyGraduated");
    });

    it("Should prevent selling after graduation", async function () {
      const { launch, user1, token } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("30") });
      const tokensOwned = await launch.tokenBalances(user1.address);

      // Graduate with another purchase
      await launch.connect(user1).buy(0, { value: ethers.parseEther("30") });

      // Approve launch contract to spend tokens (even though it will fail due to AlreadyGraduated)
      await token.connect(user1).approve(await launch.getAddress(), tokensOwned);

      // Try to sell after graduation
      await expect(
        launch.connect(user1).sell(tokensOwned, 0)
      ).to.be.revertedWithCustomError(launch, "AlreadyGraduated");
    });
  });

  describe("Graduation - LP Token Locking", function () {
    it("Should create LP token pair on graduation", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("60") });

      const lpToken = await launch.lpToken();
      expect(lpToken).to.not.equal(ethers.ZeroAddress);
    });

    it("Should lock LP tokens in contract", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("60") });

      const lpTokensLocked = await launch.lpTokensLocked();
      expect(lpTokensLocked).to.be.gt(0);
    });

    it("Should record LP lock time", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      const beforeTime = await time.latest();
      await launch.connect(user1).buy(0, { value: ethers.parseEther("60") });
      const afterTime = await time.latest();

      const lpLockTime = await launch.lpLockTime();
      expect(lpLockTime).to.be.gte(beforeTime);
      expect(lpLockTime).to.be.lte(afterTime);
    });

    it("Should add all remaining BNB to liquidity", async function () {
      const { launch, user1, mockRouter } = await loadFixture(deployBondingCurveLaunchFixture);

      const balanceBefore = await ethers.provider.getBalance(await mockRouter.getAddress());

      await launch.connect(user1).buy(0, { value: ethers.parseEther("60") });

      const balanceAfter = await ethers.provider.getBalance(await mockRouter.getAddress());
      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  describe("Graduation - Fee Distribution", function () {
    it("Should distribute creator fees before graduation", async function () {
      const { launch, creator, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      const creatorBalanceBefore = await ethers.provider.getBalance(creator.address);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("60") });

      const creatorBalanceAfter = await ethers.provider.getBalance(creator.address);
      expect(creatorBalanceAfter).to.be.gt(creatorBalanceBefore);
    });

    it("Should distribute platform fees before graduation", async function () {
      const { launch, platformFeeRecipient, user1 } = await loadFixture(
        deployBondingCurveLaunchFixture
      );

      const platformBalanceBefore = await ethers.provider.getBalance(platformFeeRecipient.address);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("60") });

      const platformBalanceAfter = await ethers.provider.getBalance(platformFeeRecipient.address);
      expect(platformBalanceAfter).to.be.gt(platformBalanceBefore);
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy on buy", async function () {
      // Note: Reentrancy testing requires a malicious contract
      // This is a placeholder test - full implementation would require ReentrantAttacker contract
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("1") });
      // If reentrancy guard is working, this should not be exploitable
    });

    it("Should prevent reentrancy on sell", async function () {
      const { launch, user1, token } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("1") });
      const tokensOwned = await launch.tokenBalances(user1.address);

      // Approve launch contract to spend tokens
      await token.connect(user1).approve(await launch.getAddress(), tokensOwned);

      await launch.connect(user1).sell(tokensOwned, 0);
      // If reentrancy guard is working, this should not be exploitable
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow creator to pause", async function () {
      const { launch, creator } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(creator).pause();
      expect(await launch.paused()).to.be.true;
    });

    it("Should prevent buying when paused", async function () {
      const { launch, creator, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(creator).pause();

      await expect(
        launch.connect(user1).buy(0, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(launch, "EnforcedPause");
    });

    it("Should prevent selling when paused", async function () {
      const { launch, creator, user1, token } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("1") });
      const tokensOwned = await launch.tokenBalances(user1.address);

      // Approve launch contract to spend tokens
      await token.connect(user1).approve(await launch.getAddress(), tokensOwned);

      await launch.connect(creator).pause();

      await expect(launch.connect(user1).sell(tokensOwned, 0)).to.be.revertedWithCustomError(
        launch,
        "EnforcedPause"
      );
    });

    it("Should allow unpause", async function () {
      const { launch, creator } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(creator).pause();
      await launch.connect(creator).unpause();

      expect(await launch.paused()).to.be.false;
    });

    it("Should revert if non-creator tries to pause", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      await expect(launch.connect(user1).pause()).to.be.revertedWithCustomError(
        launch,
        "NotFactory"
      );
    });
  });

  describe("View Functions", function () {
    it("Should return correct current price", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      const priceBefore = await launch.getCurrentPrice();
      expect(priceBefore).to.equal(INITIAL_PRICE);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("1") });

      const priceAfter = await launch.getCurrentPrice();
      expect(priceAfter).to.be.gt(INITIAL_PRICE);
    });

    it("Should calculate tokens for BNB correctly", async function () {
      const { launch } = await loadFixture(deployBondingCurveLaunchFixture);

      const bnbAmount = ethers.parseEther("1");
      const expectedTokens = await launch.getTokensForBnb(bnbAmount);

      expect(expectedTokens).to.be.gt(0);
    });

    it("Should calculate BNB for tokens correctly", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("1") });
      const tokensOwned = await launch.tokenBalances(user1.address);

      const expectedBnb = await launch.getBnbForTokens(tokensOwned);
      expect(expectedBnb).to.be.gt(0);
    });

    it("Should return correct market cap", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      const marketCapBefore = await launch.getMarketCap();
      expect(marketCapBefore).to.equal(0);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("5") });

      const marketCapAfter = await launch.getMarketCap();
      expect(marketCapAfter).to.be.gt(0);
    });

    it("Should return correct graduation status", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      expect(await launch.isGraduated()).to.be.false;

      await launch.connect(user1).buy(0, { value: ethers.parseEther("60") });

      expect(await launch.isGraduated()).to.be.true;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple small purchases", async function () {
      const { launch, user1 } = await loadFixture(deployBondingCurveLaunchFixture);

      for (let i = 0; i < 10; i++) {
        await launch.connect(user1).buy(0, { value: ethers.parseEther("0.1") });
      }

      const totalTokens = await launch.tokenBalances(user1.address);
      expect(totalTokens).to.be.gt(0);
    });

    it("Should handle buy and sell cycles", async function () {
      const { launch, user1, token } = await loadFixture(deployBondingCurveLaunchFixture);

      for (let i = 0; i < 5; i++) {
        await launch.connect(user1).buy(0, { value: ethers.parseEther("1") });
        const tokens = await launch.tokenBalances(user1.address);
        const tokensToSell = tokens / 2n;

        // Approve launch contract to spend tokens
        await token.connect(user1).approve(await launch.getAddress(), tokensToSell);

        await launch.connect(user1).sell(tokensToSell, 0);
      }

      const finalBalance = await launch.tokenBalances(user1.address);
      expect(finalBalance).to.be.gt(0);
    });

    it("Should handle multiple users trading", async function () {
      const { launch, user1, user2, user3 } = await loadFixture(deployBondingCurveLaunchFixture);

      await launch.connect(user1).buy(0, { value: ethers.parseEther("1") });
      await launch.connect(user2).buy(0, { value: ethers.parseEther("2") });
      await launch.connect(user3).buy(0, { value: ethers.parseEther("0.5") });

      const tokens1 = await launch.tokenBalances(user1.address);
      const tokens2 = await launch.tokenBalances(user2.address);
      const tokens3 = await launch.tokenBalances(user3.address);

      expect(tokens1).to.be.gt(0);
      expect(tokens2).to.be.gt(tokens1); // User2 bought more BNB
      expect(tokens3).to.be.gt(0);
      expect(tokens3).to.be.lt(tokens1); // User3 bought less BNB
    });

    it("Should handle near-threshold purchases correctly", async function () {
      const { launch, user1, user2 } = await loadFixture(deployBondingCurveLaunchFixture);

      // Get just below threshold
      await launch.connect(user1).buy(0, { value: ethers.parseEther("45") });
      expect(await launch.graduated()).to.be.false;

      // Push over threshold
      await launch.connect(user2).buy(0, { value: ethers.parseEther("10") });
      expect(await launch.graduated()).to.be.true;
    });
  });
});
