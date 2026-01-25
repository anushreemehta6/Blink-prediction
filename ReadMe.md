# Blink

A high-speed prediction market built on Monad, engineered for instant execution and frictionless user experience. Blink replaces static betting interfaces with a dynamic, live-action price chart where users place predictions directly on the moving price line.

**Live Demo:** https://blink-prediction.vercel.app/

## Deployed Contracts
```
Blink Engine: 0x230F4a341f3f104355ce17b0c48D8abc9D9330C8
USDC Token: 0xD9a4C52EfA4EfA8F698EC9941061c9ef3387DBc6
```

## Overview

By leveraging ERC-7715 Advanced Permissions and Pimlico Account Abstraction, Blink eliminates the two critical friction points in web3 UX: wallet signatures and gas fees. The result is a trading experience where you watch the price move, tap the chart, and you're in—no pop-ups, no gas, no waiting.

## The Problem

In a 30-second market, speed is everything. Traditional Web3 applications fail here because:

**The Signature Tax:** Every prediction requires a wallet pop-up that blocks the screen. By the time users click "Confirm," the price has moved and the opportunity is gone.

**The Gas Barrier:** Users must maintain a balance of native tokens (MON or ETH) to pay gas fees. This creates both a psychological and technical hurdle for retail participants.

**Static UI:** Most prediction markets use static lists or orderbook-style interfaces that don't capture the immediacy of real-time price action.

## Technical Solution

### 1. Live-Action Chart Interface

The entire chart functions as the interface. Price updates every 400ms via Pyth Network oracle, and users tap the Green zone (Above) or Red zone (Below) directly on the right side of the moving price action. Entry points are visually pinned to the chart at the moment of interaction.

### 2. Advanced Permissions (Zero Signatures)

Using ERC-7715 with MetaMask Smart Accounts, users perform a one-time session approval:

- Sign once when starting a session to "Unlock the Chart"
- For the next hour (or chosen duration), every chart tap executes a transaction instantly in the background
- Set a "Session Cap" (e.g., $20 total session limit) for security
- Session keys only have permission to interact with the Blink contract within specified limits—they cannot withdraw funds to external addresses

### 3. Sponsored Transactions (Zero Gas Fees)

Pimlico integration provides web2-like onboarding:

- **Paymaster:** Blink sponsors gas fees for users via Pimlico Paymaster
- **No Native Tokens Required:** Users only need the asset they're betting with (USDC)
- **Transaction Bundling:** Multiple actions bundled into single on-chain executions for efficiency

## Architecture

### Gasless Flow (Powered by Pimlico)

1. **User Action:** User taps the chart to place a prediction
2. **Smart Account:** Application uses MetaMask Smart Account with ERC-7715 Advanced Permissions
3. **User Operation:** Application sends a UserOp to the Pimlico Bundler
4. **Sponsorship:** Pimlico's Paymaster validates the session and signs the gas fee
5. **Execution:** Transaction settles on Monad in 400ms with zero gas cost to user

## Core Features

### Interactive Price Canvas

- **Direct Interaction:** Right-hand side of chart serves as the "Action Zone"
- **Visual Feedback:** Horizontal line appears at entry price showing exact threshold for win conditions
- **400ms Heartbeat:** Powered by Pyth Network oracle for sub-second price accuracy

### One-Tap Session

- **Frictionless:** Zero wallet prompts after initial unlock
- **Non-Custodial:** Session key limited to Blink contract interactions within specified limits

### Gamification & Social

- **Live Heat Map:** Visualize where other participants are entering positions
- **Winning Streaks:** Visual indicators for 3+ consecutive wins
- **Instant Payouts:** 1.85x payout delivered directly to smart account when 30-second timer expires

## User Flow

1. **Onboard:** Connect MetaMask. Smart Account created in background (invisible to user)
2. **Unlock:** Click "Unlock Instant Trading," sign one message to set session limit with ERC-7715 Advanced Permissions
3. **Trade:** Watch the chart, tap Green or Red zone when ready
4. **Immediate Entry:** Position marker appears instantly on chart with no wallet popup
5. **Settlement:** 30 seconds later, outcome resolves via Pyth oracle and balance updates automatically

## Comparison Matrix

| Feature | Legacy Prediction Markets | Blink |
|---------|---------------------------|-------|
| Interface | Lists / Orderbooks | Interactive Live Chart |
| Execution | Manual Signature per trade | Session-based (Zero Signatures) |
| Gas Fees | User pays in native tokens | Gasless (Sponsored by Pimlico) |
| Speed | 5-10 seconds per trade | <500ms (Instant Tap) |
| Chain | Ethereum / Polygon / Base | Monad (Ultra-High Throughput) |

## Business Model

- **Revenue:** 7.5% fee on every round
- **Cost Efficiency:** Monad and Pimlico enable gas sponsorship at a fraction of a penny per trade
- **Volume Strategy:** Friction removal increases Trades Per User (TPU) and session duration

## Technical Stack

- **Blockchain:** Monad
- **Account Abstraction:** Pimlico (ERC-4337)
- **Smart Account:** MetaMask Smart Account
- **Permissions:** ERC-7715 Advanced Permissions
- **Price Oracle:** Pyth Network
- **Settlement Token:** USDC

## Getting Started

Visit https://blink-prediction.vercel.app/ to experience instant, gasless prediction markets.