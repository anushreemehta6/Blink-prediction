import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Session from '@/lib/db/models/Session';

/**
 * DEBUG ROUTE: View all sessions and their details
 * Access at: /api/session/debug?userWallet=0x...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userWallet = searchParams.get('userWallet');

    await dbConnect();

    let sessions;
    if (userWallet) {
      // Get sessions for specific user
      sessions = await Session.find({
        userWallet: userWallet.toLowerCase()
      }).select('-privateKey'); // Don't expose private keys!
    } else {
      // Get all sessions (limited to 10)
      sessions = await Session.find({})
        .limit(10)
        .select('-privateKey')
        .sort({ createdAt: -1 });
    }

    const debugInfo = {
      totalSessions: sessions.length,
      sessions: sessions.map(s => ({
        id: s._id.toString(),
        userWallet: s.userWallet,
        smartAccountAddress: s.smartAccountAddress,
        eoaAddress: s.eoaAddress,
        isActive: s.isActive,
        hasPermissions: !!(s.permissionsContext && s.delegationManager),
        permissionsContext: s.permissionsContext ? 'SET' : 'MISSING',
        delegationManager: s.delegationManager || 'MISSING',
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
      }))
    };

    return NextResponse.json(debugInfo, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error: any) {
    console.error('Debug Error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * DELETE: Clean up sessions for a user
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userWallet = searchParams.get('userWallet');

    if (!userWallet) {
      return NextResponse.json({ 
        error: "userWallet parameter required" 
      }, { status: 400 });
    }

    await dbConnect();

    const result = await Session.deleteMany({
      userWallet: userWallet.toLowerCase()
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount
    });

  } catch (error: any) {
    console.error('Delete Error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}