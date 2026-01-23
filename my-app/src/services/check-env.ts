import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
import Prediction from '../lib/db/models/Prediction'; 

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function wipe() {
  console.log("🧹 Wiping ALL bets...");
  await mongoose.connect(process.env.MONGODB_URI as string);
  await Prediction.deleteMany({});
  console.log("✅ Database cleared. Start fresh!");
  process.exit();
}

wipe();