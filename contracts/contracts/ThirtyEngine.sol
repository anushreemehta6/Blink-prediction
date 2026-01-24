// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ThirtyEngineV3 is Ownable, ReentrancyGuard {
    IPyth public immutable pyth;
    IERC20 public immutable usdc;
    address public treasury;

    // Config
    uint256 public constant DURATION = 30 seconds;
    uint256 public constant ORACLE_FRESHNESS = 60 seconds;
    
    uint256 public constant MIN_MULTIPLIER = 110;  // 1.10x
    uint256 public constant MAX_MULTIPLIER = 5000; // 50.00x
    uint256 public constant DIFFICULTY_SCALER = 2000;

    // Reserve Management
    uint256 public minReserveBalance = 1000 * 1e6; // Minimum $1,000 USDC reserve (adjustable)
    uint256 public totalPendingPayouts = 0; // Track total potential payouts

    // Manager mapping for the bot
    mapping(address => bool) public isManager;

    struct Position {
        uint256 id;
        address user;
        uint256 startTime;
        uint256 expiryTime;
        int64 entryPrice;
        int64 targetPrice;
        bool isUpward;
        uint256 amount;
        uint256 multiplier;
        bool resolved;
        bool won;
    }
    
    uint256 public nextPositionId = 1;
    mapping(uint256 => Position) public positions;
    mapping(address => uint256[]) public userPositions;
    
    event PositionOpened(uint256 indexed id, address indexed user, int64 targetPrice, uint256 multiplier, uint256 expiry);
    event PositionResolved(uint256 indexed id, address indexed user, uint256 payout, bool won);
    event ReserveFunded(address indexed funder, uint256 amount, uint256 newBalance);
    
    error TransferFailed();
    error ZeroAmount();
    error InvalidTarget();
    error AlreadyResolved();
    error NotManager();
    error InsufficientReserve();

    modifier onlyManager() {
        if (!isManager[msg.sender] && msg.sender != owner()) revert NotManager();
        _;
    }
    
    constructor(address _pyth, address _usdc, address _treasury) Ownable(msg.sender) {
        pyth = IPyth(_pyth);
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }

    // ============================================================
    // UTILITIES
    // ============================================================

    function calculateMultiplier(int64 currentPrice, int64 targetPrice) public pure returns (uint256) {
        require(currentPrice > 0, "Invalid price");
        int64 diff = targetPrice > currentPrice ? targetPrice - currentPrice : currentPrice - targetPrice;
        uint256 distanceBps = (uint256(int256(diff)) * 10000) / uint256(int256(currentPrice));
        uint256 bonus = (distanceBps * DIFFICULTY_SCALER) / 1000;
        uint256 multiplier = MIN_MULTIPLIER + bonus;
        return multiplier > MAX_MULTIPLIER ? MAX_MULTIPLIER : multiplier;
    }

    function hasEnoughReserve(uint256 maxPayout) public view returns (bool) {
        uint256 currentBalance = usdc.balanceOf(address(this));
        uint256 requiredBalance = totalPendingPayouts + maxPayout + minReserveBalance;
        return currentBalance >= requiredBalance;
    }

    function getAvailableBalance() public view returns (uint256) {
        uint256 totalBalance = usdc.balanceOf(address(this));
        if (totalBalance <= totalPendingPayouts) return 0;
        return totalBalance - totalPendingPayouts;
    }

    // ============================================================
    // CORE LOGIC
    // ============================================================

    function registerTransferPosition(
        address user,
        int64 targetPrice,
        uint256 amount,
        int64 entryPrice,
        uint256 customId 
    ) external onlyManager {
        if (positions[customId].id != 0) revert("ID already exists");
        
        bool isUpward = targetPrice > entryPrice;
        uint256 multiplier = calculateMultiplier(entryPrice, targetPrice);
        
        uint256 maxPayout = (amount * multiplier) / 100;
        
        if (!hasEnoughReserve(maxPayout)) revert InsufficientReserve();
        
        totalPendingPayouts += maxPayout;

        positions[customId] = Position({
            id: customId,
            user: user,
            startTime: block.timestamp,
            expiryTime: block.timestamp + DURATION,
            entryPrice: entryPrice,
            targetPrice: targetPrice,
            isUpward: isUpward,
            amount: amount,
            multiplier: multiplier,
            resolved: false,
            won: false
        });

        userPositions[user].push(customId);
        emit PositionOpened(customId, user, targetPrice, multiplier, block.timestamp + DURATION);
    }

    function openPosition(
        bytes32 assetPriceId,
        int64 targetPrice,
        uint256 amount,
        bytes[] calldata pythPriceUpdate
    ) external payable nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 fee = pyth.getUpdateFee(pythPriceUpdate);
        pyth.updatePriceFeeds{value: fee}(pythPriceUpdate);
        
        PythStructs.Price memory price = pyth.getPriceNoOlderThan(assetPriceId, ORACLE_FRESHNESS);
        int64 entryPrice = price.price;

        bool isUpward = targetPrice > entryPrice;
        if (targetPrice == entryPrice) revert InvalidTarget();
        uint256 multiplier = calculateMultiplier(entryPrice, targetPrice);

        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        
        uint256 maxPayout = (amount * multiplier) / 100;
        uint256 potentialProfit = maxPayout > amount ? maxPayout - amount : 0;
        if (!hasEnoughReserve(potentialProfit)) revert InsufficientReserve();
        
        totalPendingPayouts += maxPayout;

        positions[nextPositionId] = Position({
            id: nextPositionId,
            user: msg.sender,
            startTime: block.timestamp,
            expiryTime: block.timestamp + DURATION,
            entryPrice: entryPrice,
            targetPrice: targetPrice,
            isUpward: isUpward,
            amount: amount,
            multiplier: multiplier,
            resolved: false,
            won: false
        });

        userPositions[msg.sender].push(nextPositionId);
        emit PositionOpened(nextPositionId, msg.sender, targetPrice, multiplier, block.timestamp + DURATION);
        nextPositionId++;

        if (msg.value > fee) {
            (bool success, ) = msg.sender.call{value: msg.value - fee}("");
            require(success);
        }
    }

    function resolvePosition(
        uint256 positionId,
        bytes[] calldata pythPriceUpdate
    ) external payable nonReentrant {
        Position storage pos = positions[positionId];
        if (pos.resolved) revert AlreadyResolved();
        
        uint256 fee = pyth.getUpdateFee(pythPriceUpdate);
        pyth.updatePriceFeeds{value: fee}(pythPriceUpdate);
        
        bytes32 priceId = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
        PythStructs.Price memory currentPrice = pyth.getPrice(priceId);

        bool hit = false;
        bool isExpired = block.timestamp > pos.expiryTime;

        if (pos.isUpward) {
            if (currentPrice.price >= pos.targetPrice) hit = true;
        } else {
            if (currentPrice.price <= pos.targetPrice) hit = true;
        }

        uint256 payout = 0;
        uint256 maxPayout = (pos.amount * pos.multiplier) / 100;

        if (hit) {
            payout = maxPayout;
            pos.resolved = true;
            pos.won = true;
            totalPendingPayouts -= maxPayout;
            require(usdc.transfer(pos.user, payout), "Payout failed");
        } 
        else if (isExpired) {
            pos.resolved = true;
            pos.won = false;
            totalPendingPayouts -= maxPayout;
        } 
        else {
            revert("Game still active, target not hit yet");
        }

        emit PositionResolved(pos.id, pos.user, payout, hit);

        if (msg.value > fee) {
            (bool success, ) = msg.sender.call{value: msg.value - fee}("");
            require(success);
        }
    }

    // ============================================================
    // RESERVE MANAGEMENT & ADMIN
    // ============================================================

    function fundReserve(uint256 amount) external {
        require(amount > 0, "Amount must be positive");
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit ReserveFunded(msg.sender, amount, usdc.balanceOf(address(this)));
    }

    function setMinReserveBalance(uint256 _minReserve) external onlyOwner {
        minReserveBalance = _minReserve;
    }

    function getReserveStatus() external view returns (uint256, uint256, uint256, uint256, bool) {
        uint256 totalBalance = usdc.balanceOf(address(this));
        uint256 availableBalance = getAvailableBalance();
        bool isHealthy = totalBalance >= (totalPendingPayouts + minReserveBalance);
        return (totalBalance, totalPendingPayouts, availableBalance, minReserveBalance, isHealthy);
    }

    function setManager(address _manager, bool _status) external onlyOwner {
        isManager[_manager] = _status;
    }

    function getUserPositions(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
    
    function withdrawFunds(uint256 amount) external onlyOwner {
        uint256 available = getAvailableBalance();
        require(amount <= available, "Cannot withdraw reserved funds");
        require(usdc.transfer(msg.sender, amount), "Transfer failed");
    }

    // ============================================================
    // 🚨 PLAN C: GOD MODE (Add this at the bottom)
    // ============================================================

    /**
     * @dev HACKATHON ONLY: Force a win and payout without Pyth verification.
     * Prevents reverts due to slippage or oracle latency.
     */
    function adminResolveWin(uint256 positionId, uint256 payoutAmount) external onlyManager {
        Position storage pos = positions[positionId];
        require(!pos.resolved, "Already resolved");
        
        // Force the state to WIN
        pos.resolved = true;
        pos.won = true;
        
        // Decrement pending payouts safely (prevent underflow crashes)
        if (totalPendingPayouts >= payoutAmount) {
            totalPendingPayouts -= payoutAmount;
        } else {
            totalPendingPayouts = 0;
        }

        // Send the money
        require(usdc.transfer(pos.user, payoutAmount), "Payout failed");
        
        emit PositionResolved(positionId, pos.user, payoutAmount, true);
    }

    receive() external payable {}
}