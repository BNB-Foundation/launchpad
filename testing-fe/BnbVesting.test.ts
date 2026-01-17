import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { BnbVesting, MockERC20 } from "../typechain-types";

describe("BnbVesting", function () {
  async function deployVestingFixture() {
    const [owner, beneficiary1, beneficiary2, beneficiary3] = await ethers.getSigners();

    // Deploy mock token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Test Token", "TEST", 18);

    // Deploy vesting contract
    const BnbVesting = await ethers.getContractFactory("BnbVesting");
    const vesting = await BnbVesting.deploy(await token.getAddress());

    // Mint tokens to vesting contract
    await token.mint(await vesting.getAddress(), ethers.parseEther("1000000"));

    return {
      vesting,
      token,
      owner,
      beneficiary1,
      beneficiary2,
      beneficiary3,
    };
  }

  describe("Deployment", function () {
    it("Should deploy with correct token", async function () {
      const { vesting, token } = await loadFixture(deployVestingFixture);
      expect(await vesting.token()).to.equal(await token.getAddress());
    });

    it("Should set owner correctly", async function () {
      const { vesting, owner } = await loadFixture(deployVestingFixture);
      expect(await vesting.owner()).to.equal(owner.address);
    });

    it("Should revert with zero token address", async function () {
      const BnbVesting = await ethers.getContractFactory("BnbVesting");
      await expect(BnbVesting.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        BnbVesting,
        "InvalidBeneficiary"
      );
    });
  });

  describe("addVestingSchedule", function () {
    it("Should add vesting schedule successfully", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60; // 1 year
      const cliffDuration = 30 * 24 * 60 * 60; // 30 days

      await expect(
        vesting
          .connect(owner)
          .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration)
      ).to.not.be.reverted;
    });

    it("Should emit VestingScheduleAdded event", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 30 * 24 * 60 * 60;

      await expect(
        vesting
          .connect(owner)
          .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration)
      )
        .to.emit(vesting, "VestingScheduleAdded")
        .withArgs(beneficiary1.address, totalAmount, now, duration, cliffDuration);
    });

    it("Should store schedule correctly", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 30 * 24 * 60 * 60;

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      const schedule = await vesting.getVestingSchedule(beneficiary1.address);
      expect(schedule.totalAmount).to.equal(totalAmount);
      expect(schedule.releasedAmount).to.equal(0);
      expect(schedule.startTime).to.equal(now);
      expect(schedule.duration).to.equal(duration);
      expect(schedule.cliffDuration).to.equal(cliffDuration);
    });

    it("Should use current timestamp if startTime is 0", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 30 * 24 * 60 * 60;

      const tx = await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, 0, duration, cliffDuration);

      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const schedule = await vesting.getVestingSchedule(beneficiary1.address);

      expect(schedule.startTime).to.equal(block!.timestamp);
    });

    it("Should revert with zero beneficiary address", async function () {
      const { vesting, owner } = await loadFixture(deployVestingFixture);

      const now = await time.latest();

      await expect(
        vesting
          .connect(owner)
          .addVestingSchedule(
            ethers.ZeroAddress,
            ethers.parseEther("10000"),
            now,
            365 * 24 * 60 * 60,
            30 * 24 * 60 * 60
          )
      ).to.be.revertedWithCustomError(vesting, "InvalidBeneficiary");
    });

    it("Should revert with zero total amount", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();

      await expect(
        vesting
          .connect(owner)
          .addVestingSchedule(beneficiary1.address, 0, now, 365 * 24 * 60 * 60, 30 * 24 * 60 * 60)
      ).to.be.revertedWithCustomError(vesting, "InvalidParameters");
    });

    it("Should revert with zero duration", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();

      await expect(
        vesting
          .connect(owner)
          .addVestingSchedule(
            beneficiary1.address,
            ethers.parseEther("10000"),
            now,
            0,
            30 * 24 * 60 * 60
          )
      ).to.be.revertedWithCustomError(vesting, "InvalidParameters");
    });

    it("Should revert when cliff duration exceeds total duration", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();

      await expect(
        vesting
          .connect(owner)
          .addVestingSchedule(
            beneficiary1.address,
            ethers.parseEther("10000"),
            now,
            365 * 24 * 60 * 60,
            400 * 24 * 60 * 60 // cliff > duration
          )
      ).to.be.revertedWithCustomError(vesting, "InvalidParameters");
    });

    it("Should revert when called by non-owner", async function () {
      const { vesting, beneficiary1, beneficiary2 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();

      await expect(
        vesting
          .connect(beneficiary1)
          .addVestingSchedule(
            beneficiary2.address,
            ethers.parseEther("10000"),
            now,
            365 * 24 * 60 * 60,
            30 * 24 * 60 * 60
          )
      ).to.be.revertedWithCustomError(vesting, "OwnableUnauthorizedAccount");
    });

    it("Should allow updating existing schedule", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();

      // Add initial schedule
      await vesting
        .connect(owner)
        .addVestingSchedule(
          beneficiary1.address,
          ethers.parseEther("10000"),
          now,
          365 * 24 * 60 * 60,
          30 * 24 * 60 * 60
        );

      // Update schedule
      await vesting
        .connect(owner)
        .addVestingSchedule(
          beneficiary1.address,
          ethers.parseEther("20000"),
          now,
          730 * 24 * 60 * 60,
          60 * 24 * 60 * 60
        );

      const schedule = await vesting.getVestingSchedule(beneficiary1.address);
      expect(schedule.totalAmount).to.equal(ethers.parseEther("20000"));
      expect(schedule.duration).to.equal(730 * 24 * 60 * 60);
    });
  });

  describe("vestedAmount", function () {
    it("Should return 0 before cliff", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 30 * 24 * 60 * 60;

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      // Check before cliff
      await time.increase(15 * 24 * 60 * 60); // 15 days

      expect(await vesting.vestedAmount(beneficiary1.address)).to.equal(0);
    });

    it("Should return 0 exactly at start time with cliff", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 30 * 24 * 60 * 60;

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      expect(await vesting.vestedAmount(beneficiary1.address)).to.equal(0);
    });

    it("Should return correct amount after cliff", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60; // 1 year
      const cliffDuration = 30 * 24 * 60 * 60; // 30 days

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      // Move past cliff (to 60 days)
      await time.increase(60 * 24 * 60 * 60);

      const vested = await vesting.vestedAmount(beneficiary1.address);

      // After 60 days: (10000 * 60) / 365 ≈ 1643.8 tokens
      const expected = (totalAmount * BigInt(60 * 24 * 60 * 60)) / BigInt(duration);
      expect(vested).to.be.closeTo(expected, ethers.parseEther("1")); // Allow small rounding error
    });

    it("Should return linear vesting amount at 50% duration", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 0; // No cliff

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      // Move to 50% of duration
      await time.increase((duration / 2));

      const vested = await vesting.vestedAmount(beneficiary1.address);
      const expected = totalAmount / 2n;

      expect(vested).to.be.closeTo(expected, ethers.parseEther("1"));
    });

    it("Should return total amount after vesting period", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 30 * 24 * 60 * 60;

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      // Move past end of vesting
      await time.increase(duration + 1);

      expect(await vesting.vestedAmount(beneficiary1.address)).to.equal(totalAmount);
    });

    it("Should return 0 for non-existent beneficiary", async function () {
      const { vesting, beneficiary1 } = await loadFixture(deployVestingFixture);

      expect(await vesting.vestedAmount(beneficiary1.address)).to.equal(0);
    });

    it("Should handle vesting with no cliff correctly", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 0; // No cliff

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      // Even 1 second in, tokens should be vesting
      await time.increase(1);

      const vested = await vesting.vestedAmount(beneficiary1.address);
      expect(vested).to.be.greaterThan(0);
    });
  });

  describe("releasableAmount", function () {
    it("Should return correct releasable amount", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 30 * 24 * 60 * 60;

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      await time.increase(60 * 24 * 60 * 60); // 60 days

      const vested = await vesting.vestedAmount(beneficiary1.address);
      const releasable = await vesting.releasableAmount(beneficiary1.address);

      expect(releasable).to.equal(vested); // No releases yet, so releasable = vested
    });

    it("Should return 0 if all vested tokens released", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 30 * 24 * 60 * 60;

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      await time.increase(60 * 24 * 60 * 60);

      await vesting.connect(beneficiary1).release();

      expect(await vesting.releasableAmount(beneficiary1.address)).to.equal(0);
    });
  });

  describe("release", function () {
    it("Should release vested tokens", async function () {
      const { vesting, token, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 30 * 24 * 60 * 60;

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      await time.increase(60 * 24 * 60 * 60);

      await expect(vesting.connect(beneficiary1).release()).to.not.be.reverted;
    });

    it("Should transfer correct amount to beneficiary", async function () {
      const { vesting, token, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 30 * 24 * 60 * 60;

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      await time.increase(60 * 24 * 60 * 60);

      const balanceBefore = await token.balanceOf(beneficiary1.address);

      await vesting.connect(beneficiary1).release();

      const balanceAfter = await token.balanceOf(beneficiary1.address);

      // After 60 days of 365 days: approximately 1643 tokens (10000 * 60 / 365)
      const expectedAmount = (totalAmount * BigInt(60 * 24 * 60 * 60)) / BigInt(duration);
      expect(balanceAfter - balanceBefore).to.be.closeTo(expectedAmount, ethers.parseEther("1"));
    });

    it("Should emit TokensReleased event", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 30 * 24 * 60 * 60;

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      await time.increase(60 * 24 * 60 * 60);

      const tx = await vesting.connect(beneficiary1).release();
      const receipt = await tx.wait();

      // Check event was emitted
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = vesting.interface.parseLog(log as any);
          return parsed?.name === "TokensReleased";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
    });

    it("Should update released amount correctly", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 30 * 24 * 60 * 60;

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      await time.increase(60 * 24 * 60 * 60);

      await vesting.connect(beneficiary1).release();

      const schedule = await vesting.getVestingSchedule(beneficiary1.address);
      const expectedAmount = (totalAmount * BigInt(60 * 24 * 60 * 60)) / BigInt(duration);
      expect(schedule.releasedAmount).to.be.closeTo(expectedAmount, ethers.parseEther("1"));
    });

    it("Should revert if no tokens to release", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 30 * 24 * 60 * 60;

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      // Still in cliff period
      await time.increase(15 * 24 * 60 * 60);

      await expect(vesting.connect(beneficiary1).release()).to.be.revertedWithCustomError(
        vesting,
        "NoTokensToRelease"
      );
    });

    it("Should allow multiple releases over time", async function () {
      const { vesting, token, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 30 * 24 * 60 * 60;

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      // First release after 60 days
      await time.increase(60 * 24 * 60 * 60);
      const vested1 = await vesting.vestedAmount(beneficiary1.address);
      await vesting.connect(beneficiary1).release();

      // Second release after another 60 days
      await time.increase(60 * 24 * 60 * 60);
      await vesting.connect(beneficiary1).release();

      const totalReleased = await token.balanceOf(beneficiary1.address);
      expect(totalReleased).to.be.greaterThan(vested1);
    });

    it("Should handle releasing all tokens after vesting period", async function () {
      const { vesting, token, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 30 * 24 * 60 * 60;

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      // Move past vesting period
      await time.increase(duration + 1);

      await vesting.connect(beneficiary1).release();

      const balance = await token.balanceOf(beneficiary1.address);
      expect(balance).to.equal(totalAmount);

      // No more tokens to release
      await expect(vesting.connect(beneficiary1).release()).to.be.revertedWithCustomError(
        vesting,
        "NoTokensToRelease"
      );
    });
  });

  describe("Double Claim Protection", function () {
    it("Should prevent claiming same tokens twice", async function () {
      const { vesting, token, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 30 * 24 * 60 * 60;

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      // Wait until 100% vested
      await time.increase(duration + cliffDuration + 1);

      // First claim - should get all tokens
      await vesting.connect(beneficiary1).release();
      const balanceAfterFirst = await token.balanceOf(beneficiary1.address);
      expect(balanceAfterFirst).to.equal(totalAmount);

      // Second claim - should revert since all tokens already released
      await expect(vesting.connect(beneficiary1).release()).to.be.revertedWithCustomError(
        vesting,
        "NoTokensToRelease"
      );

      // Balance should remain the same
      const balanceAfterSecond = await token.balanceOf(beneficiary1.address);
      expect(balanceAfterSecond).to.equal(balanceAfterFirst);
    });

    it("Should correctly track released amount across multiple releases", async function () {
      const { vesting, owner, beneficiary1 } = await loadFixture(deployVestingFixture);

      const now = await time.latest();
      const totalAmount = ethers.parseEther("10000");
      const duration = 365 * 24 * 60 * 60;
      const cliffDuration = 0;

      await vesting
        .connect(owner)
        .addVestingSchedule(beneficiary1.address, totalAmount, now, duration, cliffDuration);

      // Release at 25%
      await time.increase(duration / 4);
      await vesting.connect(beneficiary1).release();
      const schedule1 = await vesting.getVestingSchedule(beneficiary1.address);
      const released1 = schedule1.releasedAmount;

      // Release at 50%
      await time.increase(duration / 4);
      await vesting.connect(beneficiary1).release();
      const schedule2 = await vesting.getVestingSchedule(beneficiary1.address);
      const released2 = schedule2.releasedAmount;

      expect(released2).to.be.greaterThan(released1);
      expect(released2).to.be.closeTo(totalAmount / 2n, ethers.parseEther("100"));
    });
  });

  describe("Multiple Beneficiaries", function () {
    it("Should handle multiple independent vesting schedules", async function () {
      const { vesting, token, owner, beneficiary1, beneficiary2, beneficiary3 } =
        await loadFixture(deployVestingFixture);

      const now = await time.latest();

      // Different schedules for each beneficiary
      await vesting
        .connect(owner)
        .addVestingSchedule(
          beneficiary1.address,
          ethers.parseEther("10000"),
          now,
          365 * 24 * 60 * 60,
          30 * 24 * 60 * 60
        );

      await vesting
        .connect(owner)
        .addVestingSchedule(
          beneficiary2.address,
          ethers.parseEther("20000"),
          now,
          730 * 24 * 60 * 60,
          60 * 24 * 60 * 60
        );

      await vesting
        .connect(owner)
        .addVestingSchedule(
          beneficiary3.address,
          ethers.parseEther("5000"),
          now,
          180 * 24 * 60 * 60,
          0
        );

      // Move time forward
      await time.increase(90 * 24 * 60 * 60); // 90 days

      // Each should have different amounts vested
      const vested1 = await vesting.vestedAmount(beneficiary1.address);
      const vested2 = await vesting.vestedAmount(beneficiary2.address);
      const vested3 = await vesting.vestedAmount(beneficiary3.address);

      expect(vested1).to.be.greaterThan(0);
      expect(vested2).to.be.greaterThan(0);
      expect(vested3).to.be.greaterThan(0);

      // Release for each
      await vesting.connect(beneficiary1).release();
      await vesting.connect(beneficiary2).release();
      await vesting.connect(beneficiary3).release();

      expect(await token.balanceOf(beneficiary1.address)).to.be.greaterThan(0);
      expect(await token.balanceOf(beneficiary2.address)).to.be.greaterThan(0);
      expect(await token.balanceOf(beneficiary3.address)).to.be.greaterThan(0);
    });
  });

  describe("withdrawExcess", function () {
    it("Should allow owner to withdraw excess tokens", async function () {
      const { vesting, token, owner } = await loadFixture(deployVestingFixture);

      const withdrawAmount = ethers.parseEther("1000");
      const ownerBalanceBefore = await token.balanceOf(owner.address);

      await vesting.connect(owner).withdrawExcess(withdrawAmount);

      const ownerBalanceAfter = await token.balanceOf(owner.address);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(withdrawAmount);
    });

    it("Should revert when non-owner tries to withdraw", async function () {
      const { vesting, beneficiary1 } = await loadFixture(deployVestingFixture);

      await expect(
        vesting.connect(beneficiary1).withdrawExcess(ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(vesting, "OwnableUnauthorizedAccount");
    });
  });
});
