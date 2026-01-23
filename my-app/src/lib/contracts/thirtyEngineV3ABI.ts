/**
 * ThirtyEngineV3 (One-Touch) Interface
 */

import { V3_ABI } from "../../services/abi";

export const THIRTY_ENGINE_V3_ABI = V3_ABI;

// ============ TYPES ============

// Matches struct Position in Solidity
export interface Position {
  id: bigint;
  user: string;
  startTime: bigint;
  expiryTime: bigint;
  entryPrice: bigint;
  targetPrice: bigint;
  isUpward: boolean;
  amount: bigint;
  multiplier: bigint; // Scaled by 100 (e.g. 250 = 2.5x)
  resolved: boolean;
  won: boolean;
}

// Helper to parse contract return values
export function parsePosition(raw: any): Position {
  return {
    id: raw.id,
    user: raw.user,
    startTime: raw.startTime,
    expiryTime: raw.expiryTime,
    entryPrice: raw.entryPrice,
    targetPrice: raw.targetPrice,
    isUpward: raw.isUpward,
    amount: raw.amount,
    multiplier: raw.multiplier,
    resolved: raw.resolved,
    won: raw.won
  };
}