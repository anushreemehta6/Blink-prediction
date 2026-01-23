import mongoose, { Schema, Model } from 'mongoose';

/**
 * Autopilot Permission Schema
 * Stores user's autopilot settings and permissions for automated trading
 */

export interface IAutopilot {
  userWallet: string;                  // User's main wallet address
  sessionAccount: string;              // Session smart account address
  permissionsContext: string;          // ERC-7715 permissions context
  delegationManager: string;           // Delegation manager address
  dailyLimit: string;                  // Daily spending limit in USDC
  spentToday: string;                  // Amount spent today
  lastResetAt: Date;                   // Last time daily limit was reset
  strategy: {
    bands: number[];                   // Which price bands to bet on (0-7)
    betAmount: string;                 // Amount per bet
    conditions?: string;               // Optional: Strategy conditions (JSON)
  };
  isActive: boolean;                   // Is autopilot currently enabled
  expiresAt?: Date;                    // Permission expiry date (optional)
  createdAt: Date;
  updatedAt: Date;
}

const AutopilotSchema = new Schema<IAutopilot>(
  {
    userWallet: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
      validate: {
        validator: (v: string) => /^0x[a-fA-F0-9]{40}$/.test(v),
        message: 'Invalid Ethereum address format',
      },
    },
    sessionAccount: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
      validate: {
        validator: (v: string) => /^0x[a-fA-F0-9]{40}$/.test(v),
        message: 'Invalid session account address format',
      },
    },
    permissionsContext: {
      type: String,
      required: true,
    },
    delegationManager: {
      type: String,
      required: true,
      lowercase: true,
      validate: {
        validator: (v: string) => /^0x[a-fA-F0-9]{40}$/.test(v),
        message: 'Invalid delegation manager address format',
      },
    },
    dailyLimit: {
      type: String,
      required: true,
      default: '10', // Default $10/day
    },
    spentToday: {
      type: String,
      default: '0',
    },
    lastResetAt: {
      type: Date,
      default: Date.now,
    },
    strategy: {
      bands: {
        type: [Number],
        default: [1], // Default: UP_SMALL (index 1)
        validate: {
          validator: (arr: number[]) => arr.every(n => n >= 0 && n <= 7),
          message: 'Band must be between 0-7',
        },
      },
      betAmount: {
        type: String,
        default: '0.1', // Default $0.10 per bet
      },
      conditions: {
        type: String,
        default: null,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'autopilots',
  }
);

// Compound indexes for efficient queries
AutopilotSchema.index({ userWallet: 1, isActive: 1 });
AutopilotSchema.index({ sessionAccount: 1, isActive: 1 });
AutopilotSchema.index({ isActive: 1, expiresAt: 1 });

// Instance methods
AutopilotSchema.methods.checkDailyLimit = function (amount: number): boolean {
  const spent = parseFloat(this.spentToday || '0');
  const limit = parseFloat(this.dailyLimit);
  return spent + amount <= limit;
};

AutopilotSchema.methods.resetDailyLimit = async function () {
  const now = new Date();
  const lastReset = this.lastResetAt ? new Date(this.lastResetAt) : new Date(0);
  const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

  if (hoursSinceReset >= 24) {
    this.spentToday = '0';
    this.lastResetAt = now;
    await this.save();
    return true;
  }
  return false;
};

// Static methods
AutopilotSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

AutopilotSchema.statics.findByUser = function (userWallet: string) {
  return this.find({ userWallet: userWallet.toLowerCase() });
};

AutopilotSchema.statics.findExpired = function () {
  const now = new Date();
  return this.find({
    isActive: true,
    expiresAt: { $lt: now },
  });
};

// Pre-save hook to lowercase addresses
AutopilotSchema.pre('save', async function () {
  if (this.isModified('userWallet')) {
    this.userWallet = this.userWallet.toLowerCase();
  }
  if (this.isModified('sessionAccount')) {
    this.sessionAccount = this.sessionAccount.toLowerCase();
  }
  if (this.isModified('delegationManager')) {
    this.delegationManager = this.delegationManager.toLowerCase();
  }
});

const Autopilot: Model<IAutopilot> =
  mongoose.models.Autopilot || mongoose.model<IAutopilot>('Autopilot', AutopilotSchema);

export default Autopilot;