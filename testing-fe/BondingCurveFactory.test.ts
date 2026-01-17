import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  BondingCurveFactory,
  BondingCurveLaunch,
  MockERC20,
  MockPancakeRouter,
  MockPancakeFactory,
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("BondingCurveFactory", function () {
  // Test configuration constants
  const DEFAULT_PLATFORM_FEE_BPS = 100; // 1%
  const DEFAULT_CREATOR_FEE_BPS = 50; // 0.5%
  const INITIAL_PRICE = ethers.parseUnits("0.0001", 18);
  const PRICE_INCREMENT = ethers.parseUnits("0.000001", 18);
  const TOTAL_SUPPLY = ethers.parseEther("1000000");
  const GRADUATION_THRESHOLD = ethers.parseEther("50");

  async function deployFactoryFixture() {
    const [owner, feeRecipient, user1, user2, user3] = await ethers.getSigners();

    // Deploy mock PancakeSwap contracts
    const MockPancakeFactory = await ethers.getContractFactory("MockPancakeFactory");
    const mockPancakeFactory = await MockPancakeFactory.deploy();

    const MockPancakeRouter = await ethers.getContractFactory("MockPancakeRouter");
    const mockRouter = await MockPancakeRouter.deploy();

    // Deploy launch implementation
    const BondingCurveLaunch = await ethers.getContractFactory("BondingCurveLaunch");
    const launchImplementation = await BondingCurveLaunch.deploy();

    // Deploy token implementation (standard ERC20)
    const StandardERC20 = await ethers.getContractFactory("StandardERC20");
    const tokenImplementation = await StandardERC20.deploy();

    // Deploy mock WBNB
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockWBNB = await MockERC20.deploy("Wrapped BNB", "WBNB", 18);

    // Deploy factory as UUPS proxy
    const BondingCurveFactory = await ethers.getContractFactory("BondingCurveFactory");
    const factory = await upgrades.deployProxy(
      BondingCurveFactory,
      [
        await launchImplementation.getAddress(),
        await tokenImplementation.getAddress(),
        feeRecipient.address,
        await mockRouter.getAddress(),
        await mockPancakeFactory.getAddress(),
        await mockWBNB.getAddress(),
        DEFAULT_PLATFORM_FEE_BPS,
        DEFAULT_CREATOR_FEE_BPS,
      ],
      { kind: "uups" }
    );

    return {
      factory: factory as unknown as BondingCurveFactory,
      launchImplementation,
      tokenImplementation,
      mockRouter,
      mockPancakeFactory,
      mockWBNB,
      owner,
      feeRecipient,
      user1,
      user2,
      user3,
    };
  }

  describe("Deployment", function () {
    it("Should deploy proxy correctly", async function () {
      const { factory } = await loadFixture(deployFactoryFixture);
      expect(await factory.getAddress()).to.be.properAddress;
    });

    it("Should set owner correctly", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("Should set launch implementation correctly", async function () {
      const { factory, launchImplementation } = await loadFixture(deployFactoryFixture);
      expect(await factory.launchImplementation()).to.equal(
        await launchImplementation.getAddress()
      );
    });

    it("Should set token implementation correctly", async function () {
      const { factory, tokenImplementation } = await loadFixture(deployFactoryFixture);
      expect(await factory.tokenImplementation()).to.equal(
        await tokenImplementation.getAddress()
      );
    });

    it("Should set fee recipient correctly", async function () {
      const { factory, feeRecipient } = await loadFixture(deployFactoryFixture);
      expect(await factory.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should set default platform fee correctly", async function () {
      const { factory } = await loadFixture(deployFactoryFixture);
      expect(await factory.defaultPlatformFeeBps()).to.equal(DEFAULT_PLATFORM_FEE_BPS);
    });

    it("Should set default creator fee correctly", async function () {
      const { factory } = await loadFixture(deployFactoryFixture);
      expect(await factory.defaultCreatorFeeBps()).to.equal(DEFAULT_CREATOR_FEE_BPS);
    });

    it("Should revert with zero implementation address", async function () {
      const [owner, feeRecipient] = await ethers.getSigners();

      const MockPancakeFactory = await ethers.getContractFactory("MockPancakeFactory");
      const mockPancakeFactory = await MockPancakeFactory.deploy();
      const MockPancakeRouter = await ethers.getContractFactory("MockPancakeRouter");
      const mockRouter = await MockPancakeRouter.deploy();
      const StandardERC20 = await ethers.getContractFactory("StandardERC20");
      const tokenImpl = await StandardERC20.deploy();
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const mockWBNB = await MockERC20.deploy("Wrapped BNB", "WBNB", 18);

      const BondingCurveFactory = await ethers.getContractFactory("BondingCurveFactory");

      await expect(
        upgrades.deployProxy(
          BondingCurveFactory,
          [
            ethers.ZeroAddress,
            await tokenImpl.getAddress(),
            feeRecipient.address,
            await mockRouter.getAddress(),
            await mockPancakeFactory.getAddress(),
            await mockWBNB.getAddress(),
            100,
            50,
          ],
          { kind: "uups" }
        )
      ).to.be.revertedWithCustomError(BondingCurveFactory, "InvalidImplementation");
    });

    it("Should revert with zero fee recipient address", async function () {
      const [owner] = await ethers.getSigners();

      const BondingCurveLaunch = await ethers.getContractFactory("BondingCurveLaunch");
      const launchImpl = await BondingCurveLaunch.deploy();
      const StandardERC20 = await ethers.getContractFactory("StandardERC20");
      const tokenImpl = await StandardERC20.deploy();
      const MockPancakeFactory = await ethers.getContractFactory("MockPancakeFactory");
      const mockPancakeFactory = await MockPancakeFactory.deploy();
      const MockPancakeRouter = await ethers.getContractFactory("MockPancakeRouter");
      const mockRouter = await MockPancakeRouter.deploy();
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const mockWBNB = await MockERC20.deploy("Wrapped BNB", "WBNB", 18);

      const BondingCurveFactory = await ethers.getContractFactory("BondingCurveFactory");

      await expect(
        upgrades.deployProxy(
          BondingCurveFactory,
          [
            await launchImpl.getAddress(),
            await tokenImpl.getAddress(),
            ethers.ZeroAddress,
            await mockRouter.getAddress(),
            await mockPancakeFactory.getAddress(),
            await mockWBNB.getAddress(),
            100,
            50,
          ],
          { kind: "uups" }
        )
      ).to.be.revertedWithCustomError(BondingCurveFactory, "InvalidFeeRecipient");
    });

    it("Should revert with excessive platform fee", async function () {
      const [owner, feeRecipient] = await ethers.getSigners();

      const BondingCurveLaunch = await ethers.getContractFactory("BondingCurveLaunch");
      const launchImpl = await BondingCurveLaunch.deploy();
      const StandardERC20 = await ethers.getContractFactory("StandardERC20");
      const tokenImpl = await StandardERC20.deploy();
      const MockPancakeFactory = await ethers.getContractFactory("MockPancakeFactory");
      const mockPancakeFactory = await MockPancakeFactory.deploy();
      const MockPancakeRouter = await ethers.getContractFactory("MockPancakeRouter");
      const mockRouter = await MockPancakeRouter.deploy();
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const mockWBNB = await MockERC20.deploy("Wrapped BNB", "WBNB", 18);

      const BondingCurveFactory = await ethers.getContractFactory("BondingCurveFactory");

      await expect(
        upgrades.deployProxy(
          BondingCurveFactory,
          [
            await launchImpl.getAddress(),
            await tokenImpl.getAddress(),
            feeRecipient.address,
            await mockRouter.getAddress(),
            await mockPancakeFactory.getAddress(),
            await mockWBNB.getAddress(),
            1001, // > 10% (max is 1000 bps = 10%)
            50,
          ],
          { kind: "uups" }
        )
      ).to.be.revertedWithCustomError(BondingCurveFactory, "InvalidFeeBps");
    });
  });

  describe("createLaunch", function () {
    it("Should create launch successfully", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const tx = await factory.connect(user1).createLaunch(
        "My Token",
        "MTK",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true // enableSell
      );

      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;
    });

    it("Should emit LaunchCreated event", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(user1).createLaunch(
          "My Token",
          "MTK",
          TOTAL_SUPPLY,
          INITIAL_PRICE,
          PRICE_INCREMENT,
          GRADUATION_THRESHOLD,
          true
        )
      ).to.emit(factory, "LaunchCreated");
    });

    it("Should emit event with correct parameters", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const tx = await factory.connect(user1).createLaunch(
        "My Token",
        "MTK",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "LaunchCreated"
      );

      expect(event).to.not.be.undefined;
      const args = (event as any).args;
      expect(args.creator).to.equal(user1.address);
      expect(args.totalSupply).to.equal(TOTAL_SUPPLY);
      expect(args.initialPrice).to.equal(INITIAL_PRICE);
    });

    it("Should increment launch count", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      expect(await factory.launchCount()).to.equal(0);

      await factory.connect(user1).createLaunch(
        "Token 1",
        "TK1",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      expect(await factory.launchCount()).to.equal(1);

      await factory.connect(user1).createLaunch(
        "Token 2",
        "TK2",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      expect(await factory.launchCount()).to.equal(2);
    });

    it("Should track launch in allLaunches array", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const tx = await factory.connect(user1).createLaunch(
        "My Token",
        "MTK",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "LaunchCreated"
      );
      const launchAddress = (event as any).args.launch;

      const allLaunches = await factory.getAllLaunches();
      expect(allLaunches).to.include(launchAddress);
    });

    it("Should track launch by creator", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const tx = await factory.connect(user1).createLaunch(
        "My Token",
        "MTK",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "LaunchCreated"
      );
      const launchAddress = (event as any).args.launch;

      const creatorLaunches = await factory.getCreatorLaunches(user1.address);
      expect(creatorLaunches).to.include(launchAddress);
    });

    it("Should mark launch as valid in isLaunch mapping", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const tx = await factory.connect(user1).createLaunch(
        "My Token",
        "MTK",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "LaunchCreated"
      );
      const launchAddress = (event as any).args.launch;

      expect(await factory.isLaunch(launchAddress)).to.be.true;
    });

    it("Should deploy token with correct name and symbol", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const tx = await factory.connect(user1).createLaunch(
        "My Amazing Token",
        "MAT",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "LaunchCreated"
      );
      const tokenAddress = (event as any).args.token;

      const token = await ethers.getContractAt("MockERC20", tokenAddress);
      expect(await token.name()).to.equal("My Amazing Token");
      expect(await token.symbol()).to.equal("MAT");
    });

    it("Should transfer all tokens to launch contract", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const tx = await factory.connect(user1).createLaunch(
        "My Token",
        "MTK",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "LaunchCreated"
      );
      const launchAddress = (event as any).args.launch;
      const tokenAddress = (event as any).args.token;

      const token = await ethers.getContractAt("MockERC20", tokenAddress);
      const balance = await token.balanceOf(launchAddress);
      expect(balance).to.equal(TOTAL_SUPPLY);
    });

    it("Should use default fees", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const tx = await factory.connect(user1).createLaunch(
        "My Token",
        "MTK",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "LaunchCreated"
      );
      const launchAddress = (event as any).args.launch;

      const launch = await ethers.getContractAt("BondingCurveLaunch", launchAddress);
      const config = await launch.config();

      expect(config.platformFeeBps).to.equal(DEFAULT_PLATFORM_FEE_BPS);
      expect(config.creatorFeeBps).to.equal(DEFAULT_CREATOR_FEE_BPS);
    });

    it("Should create multiple launches from same creator", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await factory.connect(user1).createLaunch(
        "Token 1",
        "TK1",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      await factory.connect(user1).createLaunch(
        "Token 2",
        "TK2",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      const creatorLaunches = await factory.getCreatorLaunches(user1.address);
      expect(creatorLaunches.length).to.equal(2);
    });

    it("Should create launches from different creators", async function () {
      const { factory, user1, user2, user3 } = await loadFixture(deployFactoryFixture);

      await factory.connect(user1).createLaunch(
        "User1 Token",
        "U1T",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      await factory.connect(user2).createLaunch(
        "User2 Token",
        "U2T",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      await factory.connect(user3).createLaunch(
        "User3 Token",
        "U3T",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      expect(await factory.launchCount()).to.equal(3);
      expect((await factory.getCreatorLaunches(user1.address)).length).to.equal(1);
      expect((await factory.getCreatorLaunches(user2.address)).length).to.equal(1);
      expect((await factory.getCreatorLaunches(user3.address)).length).to.equal(1);
    });

    it("Should revert with empty name", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(user1).createLaunch(
          "",
          "MTK",
          TOTAL_SUPPLY,
          INITIAL_PRICE,
          PRICE_INCREMENT,
          GRADUATION_THRESHOLD,
          true
        )
      ).to.be.revertedWithCustomError(factory, "InvalidParameters");
    });

    it("Should revert with empty symbol", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(user1).createLaunch(
          "My Token",
          "",
          TOTAL_SUPPLY,
          INITIAL_PRICE,
          PRICE_INCREMENT,
          GRADUATION_THRESHOLD,
          true
        )
      ).to.be.revertedWithCustomError(factory, "InvalidParameters");
    });

    it("Should revert with zero total supply", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(user1).createLaunch(
          "My Token",
          "MTK",
          0,
          INITIAL_PRICE,
          PRICE_INCREMENT,
          GRADUATION_THRESHOLD,
          true
        )
      ).to.be.revertedWithCustomError(factory, "InvalidTotalSupply");
    });

    it("Should revert with zero initial price", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(user1).createLaunch(
          "My Token",
          "MTK",
          TOTAL_SUPPLY,
          0,
          PRICE_INCREMENT,
          GRADUATION_THRESHOLD,
          true
        )
      ).to.be.revertedWithCustomError(factory, "InvalidPrice");
    });

    it("Should allow zero price increment (fixed price)", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(user1).createLaunch(
          "My Token",
          "MTK",
          TOTAL_SUPPLY,
          INITIAL_PRICE,
          0, // Fixed price
          GRADUATION_THRESHOLD,
          true
        )
      ).to.not.be.reverted;
    });

    it("Should revert with zero graduation threshold", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(user1).createLaunch(
          "My Token",
          "MTK",
          TOTAL_SUPPLY,
          INITIAL_PRICE,
          PRICE_INCREMENT,
          0,
          true
        )
      ).to.be.revertedWithCustomError(factory, "InvalidGraduationThreshold");
    });

    it("Should allow disabling sell", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const tx = await factory.connect(user1).createLaunch(
        "My Token",
        "MTK",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        false // Disable sell
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "LaunchCreated"
      );
      const launchAddress = (event as any).args.launch;

      const launch = await ethers.getContractAt("BondingCurveLaunch", launchAddress);
      const config = await launch.config();
      expect(config.enableSell).to.be.false;
    });
  });

  describe("Fee Management", function () {
    it("Should allow owner to update platform fee", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      await factory.connect(owner).setPlatformFee(150);
      expect(await factory.defaultPlatformFeeBps()).to.equal(150);
    });

    it("Should emit PlatformFeeUpdated event", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      await expect(factory.connect(owner).setPlatformFee(150))
        .to.emit(factory, "PlatformFeeUpdated")
        .withArgs(150);
    });

    it("Should revert when fee exceeds 10000 bps", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      await expect(factory.connect(owner).setPlatformFee(10001)).to.be.revertedWithCustomError(
        factory,
        "InvalidFeeBps"
      );
    });

    it("Should allow fee of exactly 10000 bps (100%)", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      await factory.connect(owner).setPlatformFee(10000);
      expect(await factory.defaultPlatformFeeBps()).to.equal(10000);
    });

    it("Should revert when non-owner tries to update fee", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await expect(factory.connect(user1).setPlatformFee(150)).to.be.revertedWithCustomError(
        factory,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should allow owner to update creator fee", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      await factory.connect(owner).setCreatorFee(75);
      expect(await factory.defaultCreatorFeeBps()).to.equal(75);
    });

    it("Should emit CreatorFeeUpdated event", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      await expect(factory.connect(owner).setCreatorFee(75))
        .to.emit(factory, "CreatorFeeUpdated")
        .withArgs(75);
    });

    it("Should allow owner to update fee recipient", async function () {
      const { factory, owner, user1 } = await loadFixture(deployFactoryFixture);

      await factory.connect(owner).setFeeRecipient(user1.address);
      expect(await factory.feeRecipient()).to.equal(user1.address);
    });

    it("Should emit FeeRecipientUpdated event", async function () {
      const { factory, owner, user1 } = await loadFixture(deployFactoryFixture);

      await expect(factory.connect(owner).setFeeRecipient(user1.address))
        .to.emit(factory, "FeeRecipientUpdated")
        .withArgs(user1.address);
    });

    it("Should revert when setting zero address as fee recipient", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(owner).setFeeRecipient(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(factory, "InvalidFeeRecipient");
    });

    it("Should revert when non-owner tries to update fee recipient", async function () {
      const { factory, user1, user2 } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(user1).setFeeRecipient(user2.address)
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("Should use updated fees for new launches", async function () {
      const { factory, owner, user1 } = await loadFixture(deployFactoryFixture);

      // Update fees
      await factory.connect(owner).setPlatformFee(200);
      await factory.connect(owner).setCreatorFee(100);

      // Create launch
      const tx = await factory.connect(user1).createLaunch(
        "My Token",
        "MTK",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "LaunchCreated"
      );
      const launchAddress = (event as any).args.launch;

      const launch = await ethers.getContractAt("BondingCurveLaunch", launchAddress);
      const config = await launch.config();

      expect(config.platformFeeBps).to.equal(200);
      expect(config.creatorFeeBps).to.equal(100);
    });
  });

  describe("Implementation Management", function () {
    it("Should allow owner to update launch implementation", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      const BondingCurveLaunch = await ethers.getContractFactory("BondingCurveLaunch");
      const newImplementation = await BondingCurveLaunch.deploy();

      await factory.connect(owner).setLaunchImplementation(await newImplementation.getAddress());

      expect(await factory.launchImplementation()).to.equal(
        await newImplementation.getAddress()
      );
    });

    it("Should emit LaunchImplementationUpdated event", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      const BondingCurveLaunch = await ethers.getContractFactory("BondingCurveLaunch");
      const newImplementation = await BondingCurveLaunch.deploy();

      await expect(
        factory.connect(owner).setLaunchImplementation(await newImplementation.getAddress())
      )
        .to.emit(factory, "LaunchImplementationUpdated")
        .withArgs(await newImplementation.getAddress());
    });

    it("Should revert when setting zero address as implementation", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(owner).setLaunchImplementation(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(factory, "InvalidImplementation");
    });

    it("Should revert when non-owner tries to update implementation", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const BondingCurveLaunch = await ethers.getContractFactory("BondingCurveLaunch");
      const newImplementation = await BondingCurveLaunch.deploy();

      await expect(
        factory.connect(user1).setLaunchImplementation(await newImplementation.getAddress())
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to update token implementation", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const newTokenImplementation = await MockERC20.deploy("New Template", "NTPL", 18);

      await factory.connect(owner).setTokenImplementation(await newTokenImplementation.getAddress());

      expect(await factory.tokenImplementation()).to.equal(
        await newTokenImplementation.getAddress()
      );
    });

    it("Should emit TokenImplementationUpdated event", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const newTokenImplementation = await MockERC20.deploy("New Template", "NTPL", 18);

      await expect(
        factory.connect(owner).setTokenImplementation(await newTokenImplementation.getAddress())
      )
        .to.emit(factory, "TokenImplementationUpdated")
        .withArgs(await newTokenImplementation.getAddress());
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow owner to pause factory", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      await factory.connect(owner).pause();
      expect(await factory.paused()).to.be.true;
    });

    it("Should allow owner to unpause factory", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      await factory.connect(owner).pause();
      await factory.connect(owner).unpause();
      expect(await factory.paused()).to.be.false;
    });

    it("Should prevent creating launches when paused", async function () {
      const { factory, owner, user1 } = await loadFixture(deployFactoryFixture);

      await factory.connect(owner).pause();

      await expect(
        factory.connect(user1).createLaunch(
          "My Token",
          "MTK",
          TOTAL_SUPPLY,
          INITIAL_PRICE,
          PRICE_INCREMENT,
          GRADUATION_THRESHOLD,
          true
        )
      ).to.be.revertedWithCustomError(factory, "EnforcedPause");
    });

    it("Should allow creating launches after unpause", async function () {
      const { factory, owner, user1 } = await loadFixture(deployFactoryFixture);

      await factory.connect(owner).pause();
      await factory.connect(owner).unpause();

      await expect(
        factory.connect(user1).createLaunch(
          "My Token",
          "MTK",
          TOTAL_SUPPLY,
          INITIAL_PRICE,
          PRICE_INCREMENT,
          GRADUATION_THRESHOLD,
          true
        )
      ).to.not.be.reverted;
    });

    it("Should revert when non-owner tries to pause", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await expect(factory.connect(user1).pause()).to.be.revertedWithCustomError(
        factory,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  describe("UUPS Upgrade", function () {
    it("Should allow owner to upgrade contract", async function () {
      const { factory, owner, feeRecipient } = await loadFixture(deployFactoryFixture);

      const BondingCurveFactoryV2 = await ethers.getContractFactory("BondingCurveFactory");
      const upgraded = await upgrades.upgradeProxy(await factory.getAddress(), BondingCurveFactoryV2);

      expect(await upgraded.owner()).to.equal(owner.address);
      expect(await upgraded.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should revert when non-owner tries to upgrade", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const BondingCurveFactoryV2 = await ethers.getContractFactory(
        "BondingCurveFactory",
        user1
      );

      await expect(
        upgrades.upgradeProxy(await factory.getAddress(), BondingCurveFactoryV2)
      ).to.be.reverted;
    });

    it("Should preserve state after upgrade", async function () {
      const { factory, owner, user1 } = await loadFixture(deployFactoryFixture);

      // Create a launch before upgrade
      await factory.connect(user1).createLaunch(
        "My Token",
        "MTK",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      const countBefore = await factory.launchCount();
      const launchesBefore = await factory.getAllLaunches();

      // Upgrade
      const BondingCurveFactoryV2 = await ethers.getContractFactory("BondingCurveFactory");
      const upgraded = await upgrades.upgradeProxy(await factory.getAddress(), BondingCurveFactoryV2);

      // Verify state preserved
      expect(await upgraded.launchCount()).to.equal(countBefore);
      const launchesAfter = await upgraded.getAllLaunches();
      expect(launchesAfter[0]).to.equal(launchesBefore[0]);
      expect(await upgraded.defaultPlatformFeeBps()).to.equal(DEFAULT_PLATFORM_FEE_BPS);
    });
  });

  describe("View Functions", function () {
    it("Should return correct launch count", async function () {
      const { factory } = await loadFixture(deployFactoryFixture);
      expect(await factory.launchCount()).to.equal(0);
    });

    it("Should return all launches", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await factory.connect(user1).createLaunch(
        "Token 1",
        "TK1",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      await factory.connect(user1).createLaunch(
        "Token 2",
        "TK2",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      const allLaunches = await factory.getAllLaunches();
      expect(allLaunches.length).to.equal(2);
    });

    it("Should return launches by creator", async function () {
      const { factory, user1, user2 } = await loadFixture(deployFactoryFixture);

      await factory.connect(user1).createLaunch(
        "User1 Token 1",
        "U1T1",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      await factory.connect(user1).createLaunch(
        "User1 Token 2",
        "U1T2",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      await factory.connect(user2).createLaunch(
        "User2 Token",
        "U2T",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      const user1Launches = await factory.getCreatorLaunches(user1.address);
      const user2Launches = await factory.getCreatorLaunches(user2.address);

      expect(user1Launches.length).to.equal(2);
      expect(user2Launches.length).to.equal(1);
    });

    it("Should return empty array for creator with no launches", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const launches = await factory.getCreatorLaunches(user1.address);
      expect(launches.length).to.equal(0);
    });

    it("Should return correct isLaunch status", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const randomAddress = ethers.Wallet.createRandom().address;
      expect(await factory.isLaunch(randomAddress)).to.be.false;

      const tx = await factory.connect(user1).createLaunch(
        "My Token",
        "MTK",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "LaunchCreated"
      );
      const launchAddress = (event as any).args.launch;

      expect(await factory.isLaunch(launchAddress)).to.be.true;
    });

    it("Should return launch by index", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const tx = await factory.connect(user1).createLaunch(
        "My Token",
        "MTK",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "LaunchCreated"
      );
      const launchAddress = (event as any).args.launch;

      const launch = await factory.launches(0);
      expect(launch).to.equal(launchAddress);
    });
  });

  describe("Gas Efficiency", function () {
    it("Should create launch with reasonable gas cost", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const tx = await factory.connect(user1).createLaunch(
        "My Token",
        "MTK",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed;

      // Should be under 1M gas (using upgradeable ERC20 adds overhead)
      expect(gasUsed).to.be.lt(1000000);
    });
  });

  describe("Integration", function () {
    it("Should create functional launch that accepts buys", async function () {
      const { factory, user1, user2 } = await loadFixture(deployFactoryFixture);

      const tx = await factory.connect(user1).createLaunch(
        "My Token",
        "MTK",
        TOTAL_SUPPLY,
        INITIAL_PRICE,
        PRICE_INCREMENT,
        GRADUATION_THRESHOLD,
        true
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "LaunchCreated"
      );
      const launchAddress = (event as any).args.launch;

      const launch = await ethers.getContractAt("BondingCurveLaunch", launchAddress);

      // User2 should be able to buy from the created launch
      await expect(launch.connect(user2).buy(0, { value: ethers.parseEther("1") })).to.not.be
        .reverted;
    });
  });
});
