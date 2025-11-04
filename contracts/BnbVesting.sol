// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BnbVesting
 * @notice Linear vesting contract for token allocations with security enhancements
 */
contract BnbVesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /**
     * @notice Vesting schedule for a beneficiary
     */
    struct VestingSchedule {
        uint256 totalAmount;     // Total tokens allocated
        uint256 releasedAmount;  // Tokens already released
        uint256 startTime;       // Vesting start timestamp
        uint256 duration;        // Vesting duration in seconds
        uint256 cliffDuration;   // Cliff duration in seconds
    }

    /// @notice Token being vested
    IERC20 public immutable token;

    /// @notice Total tokens allocated across all schedules
    uint256 public totalAllocated;

    /// @notice Vesting schedules by beneficiary
    mapping(address => VestingSchedule) public vestingSchedules;

    /**
     * @notice Emitted when tokens are released to a beneficiary
     * @param beneficiary Address receiving tokens
     * @param amount Amount of tokens released
     */
    event TokensReleased(address indexed beneficiary, uint256 amount);

    /**
     * @notice Emitted when a vesting schedule is created or updated
     * @param beneficiary Address of the beneficiary
     * @param totalAmount Total tokens allocated
     * @param startTime Vesting start time
     * @param duration Vesting duration
     * @param cliffDuration Cliff duration
     */
    event VestingScheduleAdded(
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 duration,
        uint256 cliffDuration
    );

    /**
     * @notice Emitted when excess tokens are withdrawn
     * @param recipient Address receiving excess tokens
     * @param amount Amount withdrawn
     */
    event ExcessWithdrawn(address indexed recipient, uint256 amount);

    /// @custom:error Invalid beneficiary address
    error InvalidBeneficiary();

    /// @custom:error Invalid vesting parameters
    error InvalidParameters();

    /// @custom:error No tokens available for release
    error NoTokensToRelease();

    /// @custom:error Insufficient contract balance
    error InsufficientBalance();

    /// @custom:error Amount exceeds excess balance
    error ExceedsExcessBalance();

    /**
     * @notice Constructor
     * @param _token Address of the token to vest
     */
    constructor(address _token) Ownable(msg.sender) {
        if (_token == address(0)) revert InvalidBeneficiary();
        token = IERC20(_token);
    }

    /**
     * @notice Add or update a vesting schedule for a beneficiary
     * @param beneficiary Address of the beneficiary
     * @param totalAmount Total tokens to vest
     * @param startTime Vesting start timestamp
     * @param duration Vesting duration in seconds
     * @param cliffDuration Cliff duration in seconds
     */
    function addVestingSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 duration,
        uint256 cliffDuration
    ) external onlyOwner {
        if (beneficiary == address(0)) revert InvalidBeneficiary();
        if (totalAmount == 0) revert InvalidParameters();
        if (duration == 0) revert InvalidParameters();
        if (cliffDuration > duration) revert InvalidParameters();
        if (startTime == 0) startTime = block.timestamp;

        // Track allocation changes
        VestingSchedule memory existing = vestingSchedules[beneficiary];
        if (existing.totalAmount > 0) {
            totalAllocated -= existing.totalAmount;
        }
        totalAllocated += totalAmount;

        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: totalAmount,
            releasedAmount: 0,
            startTime: startTime,
            duration: duration,
            cliffDuration: cliffDuration
        });

        emit VestingScheduleAdded(
            beneficiary,
            totalAmount,
            startTime,
            duration,
            cliffDuration
        );
    }

    /**
     * @notice Release vested tokens for the caller
     */
    function release() external nonReentrant {
        uint256 releasable = releasableAmount(msg.sender);
        if (releasable == 0) revert NoTokensToRelease();

        VestingSchedule storage schedule = vestingSchedules[msg.sender];

        // Effects
        schedule.releasedAmount += releasable;

        // Interaction
        token.safeTransfer(msg.sender, releasable);

        emit TokensReleased(msg.sender, releasable);
    }

    /**
     * @notice Calculate total vested amount for a beneficiary at current time
     * @param beneficiary Address to check
     * @return Total vested amount
     */
    function vestedAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];

        if (schedule.totalAmount == 0) {
            return 0;
        }

        // Before cliff, nothing is vested
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }

        // After vesting period, everything is vested
        if (block.timestamp >= schedule.startTime + schedule.duration) {
            return schedule.totalAmount;
        }

        // Linear vesting between cliff and end
        uint256 elapsed = block.timestamp - schedule.startTime;
        return (schedule.totalAmount * elapsed) / schedule.duration;
    }

    /**
     * @notice Calculate releasable amount for a beneficiary
     * @param beneficiary Address to check
     * @return Amount available to claim
     */
    function releasableAmount(address beneficiary)
        public
        view
        returns (uint256)
    {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        uint256 vested = vestedAmount(beneficiary);
        return vested - schedule.releasedAmount;
    }

    /**
     * @notice Get vesting schedule for a beneficiary
     * @param beneficiary Address to query
     * @return VestingSchedule struct
     */
    function getVestingSchedule(address beneficiary)
        external
        view
        returns (VestingSchedule memory)
    {
        return vestingSchedules[beneficiary];
    }

    /**
     * @notice Calculate excess tokens (balance minus allocated)
     * @return Excess token amount
     */
    function excessBalance() public view returns (uint256) {
        uint256 balance = token.balanceOf(address(this));
        // Calculate unreleased allocations
        if (balance > totalAllocated) {
            return balance - totalAllocated;
        }
        return 0;
    }

    /**
     * @notice M-4/M-5: Withdraw excess tokens with validation and nonReentrant
     * @param amount Amount to withdraw
     */
    function withdrawExcess(uint256 amount) external onlyOwner nonReentrant {
        uint256 excess = excessBalance();
        if (amount > excess) revert ExceedsExcessBalance();

        token.safeTransfer(msg.sender, amount);

        emit ExcessWithdrawn(msg.sender, amount);
    }
}
