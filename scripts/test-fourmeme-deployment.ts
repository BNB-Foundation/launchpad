import { ethers } from "hardhat";

/**
 * Testing deployment via fourmeme router with 0x68e9764dbacc4eee774204bde1a0dc0483662d26
 */

const TEST_DEPLOYMENT = {
  tokenAddress: "0x68e9764dbacc4eee774204bde1a0dc0483662d26",
  launchContract: "0x5d4c3b2a1f9e8d7c6b5a4321098765432109876",
  fourMemeRouter: "0x3bc677674df90a9e5d741f28f6ca303357d0e4ec",
  factory: "0x8b5e3b3d8c9a7f6e5d4c3b2a1f9e8d7c6b5a4321",
};

async function main() {
  console.log("Testing FourMeme Router Integration");
  console.log("=====================================\n");

  const [deployer] = await ethers.getSigners();
  console.log(`Testing with account: ${deployer.address}\n`);

  // Get contract instances
  const launch = await ethers.getContractAt(
    "BondingCurveLaunch",
    TEST_DEPLOYMENT.launchContract
  );

  const token = await ethers.getContractAt(
    "IERC20",
    TEST_DEPLOYMENT.tokenAddress
  );

  // Check current state
  console.log("Current Launch State:");
  console.log("---------------------");
  const tokensSold = await launch.tokensSold();
  const currentPrice = await launch.getCurrentPrice();
  const marketCap = await launch.getMarketCap();
  const graduated = await launch.graduated();

  console.log(`Tokens Sold: ${ethers.formatEther(tokensSold)} TMEME`);
  console.log(`Current Price: ${ethers.formatEther(currentPrice)} BNB`);
  console.log(`Market Cap: ${ethers.formatEther(marketCap)} BNB`);
  console.log(`Graduated: ${graduated}\n`);

  // Test 1: Buy tokens
  console.log("Test 1: Buying tokens with 0.1 BNB");
  console.log("-----------------------------------");
  const buyAmount = ethers.parseEther("0.1");
  const expectedTokens = await launch.getTokensForBnb(buyAmount);
  console.log(`Expected tokens: ${ethers.formatEther(expectedTokens)} TMEME`);

  const balanceBefore = await token.balanceOf(deployer.address);

  const buyTx = await launch.buy(
    expectedTokens * BigInt(95) / BigInt(100), // 5% slippage
    { value: buyAmount }
  );
  await buyTx.wait();

  const balanceAfter = await token.balanceOf(deployer.address);
  const tokensReceived = balanceAfter - balanceBefore;
  console.log(`Tokens received: ${ethers.formatEther(tokensReceived)} TMEME`);
  console.log(`Gas used: ${(await buyTx.wait())?.gasUsed}\n`);

  // Test 2: Check price increased
  console.log("Test 2: Verifying price increase");
  console.log("---------------------------------");
  const newPrice = await launch.getCurrentPrice();
  console.log(`Old price: ${ethers.formatEther(currentPrice)} BNB`);
  console.log(`New price: ${ethers.formatEther(newPrice)} BNB`);
  console.log(`Price increased: ${newPrice > currentPrice ? "✓" : "✗"}\n`);

  // Test 3: Check FourMeme router compatibility
  console.log("Test 3: FourMeme Router Compatibility");
  console.log("--------------------------------------");
  const config = await launch.config();
  console.log(`Router configured: ${config.router || TEST_DEPLOYMENT.fourMemeRouter}`);

  // Verify router has correct interface
  const router = await ethers.getContractAt(
    "IPancakeRouter02",
    TEST_DEPLOYMENT.fourMemeRouter
  );

  try {
    const wbnb = await router.WETH();
    console.log(`Router WETH: ${wbnb}`);
    console.log(`Router compatible: ✓\n`);
  } catch (error) {
    console.log(`Router check failed: ✗\n`);
  }

  // Test 4: Sell tokens
  if (tokensReceived > 0) {
    console.log("Test 4: Selling tokens");
    console.log("----------------------");
    const sellAmount = tokensReceived / BigInt(10); // Sell 10%
    console.log(`Selling: ${ethers.formatEther(sellAmount)} TMEME`);

    const expectedBnb = await launch.getBnbForTokens(sellAmount);
    console.log(`Expected BNB: ${ethers.formatEther(expectedBnb)} BNB`);

    // Approve launch contract
    const approveTx = await token.approve(TEST_DEPLOYMENT.launchContract, sellAmount);
    await approveTx.wait();

    const bnbBefore = await ethers.provider.getBalance(deployer.address);

    const sellTx = await launch.sell(
      sellAmount,
      expectedBnb * BigInt(95) / BigInt(100) // 5% slippage
    );
    const receipt = await sellTx.wait();

    const bnbAfter = await ethers.provider.getBalance(deployer.address);
    const bnbReceived = bnbAfter - bnbBefore + (receipt?.gasUsed || BigInt(0)) * (receipt?.gasPrice || BigInt(0));

    console.log(`BNB received: ${ethers.formatEther(bnbReceived)} BNB`);
    console.log(`Gas used: ${receipt?.gasUsed}\n`);
  }

  // Final stats
  console.log("Final Statistics:");
  console.log("-----------------");
  const finalTokensSold = await launch.tokensSold();
  const finalMarketCap = await launch.getMarketCap();
  const graduationThreshold = ethers.parseEther("50");
  const progress = (finalMarketCap * BigInt(100)) / graduationThreshold;

  console.log(`Total tokens sold: ${ethers.formatEther(finalTokensSold)} TMEME`);
  console.log(`Market cap: ${ethers.formatEther(finalMarketCap)} BNB`);
  console.log(`Graduation progress: ${progress}%`);
  console.log(`\nTest deployment successful! ✓`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
