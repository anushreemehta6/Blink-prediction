// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SessionKeyManager is Ownable, ReentrancyGuard {
    
    struct Permission {
        address sessionKey;
        address targetContract;
        uint256 dailyLimit;
        uint256 usedToday;                                                                                                  
        uint256 lastResetTime;
        uint256 expiryTime;
        bool isActive;
        bytes32 permissionsContext;
        address delegationManager;
    }
    
    mapping(address => Permission[]) public userPermissions;
    mapping(address => mapping(address => uint256)) public sessionKeyIndex;
    
    uint256 public constant MIN_DAILY_LIMIT = 1e6;
    uint256 public constant MAX_DAILY_LIMIT = 1000e6;
    
    event PermissionGranted(address indexed user, address indexed sessionKey, address targetContract, uint256 dailyLimit, uint256 expiryTime);
    event PermissionRevoked(address indexed user, address indexed sessionKey);
    event PermissionUsed(address indexed user, address indexed sessionKey, uint256 amount);
    
    constructor() Ownable(msg.sender) {}
    
    function grantPermission(
        address sessionKey,
        address targetContract,
        uint256 dailyLimit,
        uint256 durationDays,
        bytes32 permissionsContext,
        address delegationManager
    ) external nonReentrant {
        require(sessionKey != address(0), "Invalid session key");
        require(targetContract != address(0), "Invalid target");
        require(dailyLimit >= MIN_DAILY_LIMIT && dailyLimit <= MAX_DAILY_LIMIT, "Invalid limit");
        
        uint256 expiryTime = block.timestamp + (durationDays * 1 days);
        
        Permission memory newPermission = Permission({
            sessionKey: sessionKey,
            targetContract: targetContract,
            dailyLimit: dailyLimit,
            usedToday: 0,
            lastResetTime: block.timestamp,
            expiryTime: expiryTime,
            isActive: true,
            permissionsContext: permissionsContext,
            delegationManager: delegationManager
        });
        
        userPermissions[msg.sender].push(newPermission);
        uint256 index = userPermissions[msg.sender].length;
        sessionKeyIndex[msg.sender][sessionKey] = index;
        
        emit PermissionGranted(msg.sender, sessionKey, targetContract, dailyLimit, expiryTime);
    }
    
    function revokePermission(address sessionKey) external nonReentrant {
        uint256 index = sessionKeyIndex[msg.sender][sessionKey];
        require(index > 0, "Permission not found");
        
        Permission storage permission = userPermissions[msg.sender][index - 1];
        permission.isActive = false;
        
        emit PermissionRevoked(msg.sender, sessionKey);
    }
    
    function canExecute(address user, address sessionKey, uint256 amount) external nonReentrant returns (bool) {
        uint256 index = sessionKeyIndex[user][sessionKey];
        require(index > 0, "Permission not found");
        
        Permission storage permission = userPermissions[user][index - 1];
        require(permission.isActive, "Permission inactive");
        require(block.timestamp < permission.expiryTime, "Permission expired");
        
        if (block.timestamp >= permission.lastResetTime + 1 days) {
            permission.usedToday = 0;
            permission.lastResetTime = block.timestamp;
        }
        
        require(permission.usedToday + amount <= permission.dailyLimit, "Daily limit exceeded");
        permission.usedToday += amount;
        
        emit PermissionUsed(user, sessionKey, amount);
        return true;
    }
    
    function getUserPermissions(address user) external view returns (Permission[] memory) {
        return userPermissions[user];
    }
}