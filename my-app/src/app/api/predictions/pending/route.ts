import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Prediction from '@/lib/db/models/Prediction'; // Ensure this model exists

export async function GET() {
    try {
        await dbConnect();
        
        
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        const pendingPositions = await Prediction.find({
            createdAt: { $gte: fiveMinutesAgo },
            status: 'PENDING'
        });

        return NextResponse.json({ positions: pendingPositions });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}