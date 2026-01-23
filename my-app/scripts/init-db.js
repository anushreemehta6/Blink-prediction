// scripts/init-db.js
const { MongoClient } = require('mongodb');
const path = require('path');
// This loads your .env.local file
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const uri = "mongodb+srv://dpancholipp123_db_user:Dhruv457@prediction.qptyt7b.mongodb.net/?appName=prediction";
  if (!uri) {
    console.error("❌ MONGODB_URI not found in .env.local");
    return;
  }

  const client = new MongoClient(uri);

  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    
    const db = client.db(); // Uses the DB name from your connection string
    const collection = db.collection('predictions');

    console.log("Creating Leaderboard Index...");
    // symbol 1 (asc), status 1 (asc), payout -1 (desc)
    const result = await collection.createIndex(
      { symbol: 1, status: 1, payout: -1 }, 
      { name: "leaderboard_idx" }
    );

    console.log(`✅ Index Created: ${result}`);
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.close();
  }
}

run();