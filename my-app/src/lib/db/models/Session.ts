import mongoose, { Schema, models, model } from 'mongoose';

const SessionSchema = new Schema({
  userWallet: { type: String, required: true, index: true },
  
  smartAccountAddress: { type: String, required: true },
  
  // ✅ YOU MUST ADD THIS FIELD DEFINITION
  eoaAddress: { type: String, required: true, unique: true },

  privateKey: { type: String, required: true },
  
  permissionsContext: { type: String },
  delegationManager: { type: String },
  
  isActive: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default models.Session || model('Session', SessionSchema);