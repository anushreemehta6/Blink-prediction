import mongoose, { Model, Schema } from 'mongoose';

// 1. Interface
export interface IPrediction {
  userWallet: string;
  positionId: number;
  targetPrice: string;
  entryPrice: string;
  multiplier: number;
  amount: string;
  isUpward: boolean;
  status: 'OPEN' | 'WON' | 'LOST';
  payout?: string;
  txHash: string;
  // createdAt & updatedAt are automatic now
  createdAt: Date; 
  updatedAt: Date;
}

// 2. Model Interface
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
  }>;
}

// 3. Schema
const PredictionSchema = new Schema<IPrediction>({
  userWallet: { type: String, required: true, lowercase: true, index: true },
  positionId: { type: Number, required: true, unique: true },
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
  // ✅ This replaces the middleware
  timestamps: true 
});

// Indexes
PredictionSchema.index({ userWallet: 1, createdAt: -1 });

// 4. Stats Method
PredictionSchema.statics.getUserStats = async function(address: string) {
  const userAddress = address.toLowerCase();
  const predictions = await this.find({ userWallet: userAddress }) as IPrediction[];
  
  const totalBets = predictions.length;
  const wonBets = predictions.filter((p: IPrediction) => p.status === 'WON');
  const lostBets = predictions.filter((p: IPrediction) => p.status === 'LOST');
  const pendingBets = predictions.filter((p: IPrediction) => p.status === 'OPEN');
  
  const totalWagered = predictions.reduce((sum: number, p: IPrediction) => sum + parseFloat(p.amount || '0'), 0);
  const totalWon = wonBets.reduce((sum: number, p: IPrediction) => sum + parseFloat(p.payout || '0'), 0);
  const netProfit = totalWon - totalWagered;
  
  const resolvedCount = wonBets.length + lostBets.length;
  const winRate = resolvedCount > 0 ? (wonBets.length / resolvedCount) * 100 : 0;
  
  return {
    totalBets,
    wonBets: wonBets.length,
    lostBets: lostBets.length,
    pendingBets: pendingBets.length,
    totalWagered: totalWagered.toFixed(2),
    totalWon: totalWon.toFixed(2),
    netProfit: netProfit.toFixed(2),
    winRate: winRate.toFixed(1),
  };
};

// ❌ NO PRE-SAVE MIDDLEWARE HERE

export default (mongoose.models.Prediction as IPredictionModel) || 
  mongoose.model<IPrediction, IPredictionModel>('Prediction', PredictionSchema);