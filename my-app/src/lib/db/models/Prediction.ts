import mongoose, { Model, Schema } from 'mongoose';

/**
 * 1. Interface for a Single Prediction
 */
export interface IPrediction {
  userWallet: string;
  symbol: string;      // 👈 Added for Multi-Token support (BTC, ETH, etc.)
  positionId: number;
  targetPrice: string;
  entryPrice: string;
  multiplier: number;
  amount: string;
  isUpward: boolean;
  status: 'OPEN' | 'WON' | 'LOST';
  payout?: string;
  txHash: string;
  createdAt: Date; 
  updatedAt: Date;
}

/**
 * 2. Interface for the Model (Static Methods)
 */
interface IPredictionModel extends Model<IPrediction> {
  getUserStats(address: string): Promise<{
    totalBets: number;
    wonBets: number;
    lostBets: number;
    pendingBets: number;
    totalWagered: string;
    totalWon: string;
    netProfit: string;
    winRate: string;
    favAsset: string; // 👈 Bonus: Tracks which asset they trade most
  }>;
}

/**
 * 3. Schema Definition
 */
const PredictionSchema = new Schema<IPrediction>({
  userWallet: { 
    type: String, 
    required: true, 
    lowercase: true, 
    index: true 
  },
  symbol: { 
    type: String, 
    required: true, 
    uppercase: true, // Standardizes 'eth' to 'ETH'
    index: true      // Indexed for fast filtering by token
  },
  positionId: { 
    type: Number, 
    required: true, 
    unique: true 
  },
  targetPrice: { type: String, required: true },
  entryPrice: { type: String, required: true },
  multiplier: { type: Number, required: true },
  amount: { type: String, required: true },
  isUpward: { type: Boolean, required: true },
  status: { 
    type: String, 
    enum: ['OPEN', 'WON', 'LOST'], 
    default: 'OPEN',
    index: true
  },
  payout: { type: String, default: '0' },
  txHash: { type: String, required: true },
}, {
  // Automatically manages createdAt and updatedAt
  timestamps: true 
});

/**
 * 4. Compound Indexes
 * Optimizes queries like "Show me all ETH trades for this user"
 */
PredictionSchema.index({ userWallet: 1, symbol: 1, createdAt: -1 });

/**
 * 5. Aggregated Stats Method
 */
PredictionSchema.statics.getUserStats = async function(address: string) {
  const userAddress = address.toLowerCase();
  const predictions = await this.find({ userWallet: userAddress }) as IPrediction[];
  
  if (predictions.length === 0) {
    return {
      totalBets: 0, wonBets: 0, lostBets: 0, pendingBets: 0,
      totalWagered: "0.00", totalWon: "0.00", netProfit: "0.00", winRate: "0.0",
      favAsset: "N/A"
    };
  }

  const wonBets = predictions.filter(p => p.status === 'WON');
  const lostBets = predictions.filter(p => p.status === 'LOST');
  const pendingBets = predictions.filter(p => p.status === 'OPEN');
  
  const totalWagered = predictions.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
  const totalWon = wonBets.reduce((sum, p) => sum + parseFloat(p.payout || '0'), 0);
  const netProfit = totalWon - totalWagered;
  
  const resolvedCount = wonBets.length + lostBets.length;
  const winRate = resolvedCount > 0 ? (wonBets.length / resolvedCount) * 100 : 0;

  // Calculate most traded asset
  const assetCounts: Record<string, number> = {};
  predictions.forEach(p => assetCounts[p.symbol] = (assetCounts[p.symbol] || 0) + 1);
  const favAsset = Object.keys(assetCounts).reduce((a, b) => assetCounts[a] > assetCounts[b] ? a : b);
  
  return {
    totalBets: predictions.length,
    wonBets: wonBets.length,
    lostBets: lostBets.length,
    pendingBets: pendingBets.length,
    totalWagered: totalWagered.toFixed(2),
    totalWon: totalWon.toFixed(2),
    netProfit: netProfit.toFixed(2),
    winRate: winRate.toFixed(1),
    favAsset
  };
};

/**
 * 6. Export Model
 */
export default (mongoose.models.Prediction as IPredictionModel) || 
  mongoose.model<IPrediction, IPredictionModel>('Prediction', PredictionSchema);