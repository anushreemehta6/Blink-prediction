'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface SessionInfo {
  id: string;
  userWallet: string;
  smartAccountAddress: string;
  eoaAddress: string;
  isActive: boolean;
  hasPermissions: boolean;
  permissionsContext: string;
  delegationManager: string;
  expiresAt: string;
  createdAt: string;
}

export default function SessionDiagnostics({ userAddress }: { userAddress: string }) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/session/debug?userWallet=${userAddress}`);
      const data = await res.json();
      setSessions(data.sessions || []);
      toast.success(`Loaded ${data.sessions?.length || 0} sessions`);
    } catch (error) {
      toast.error("Failed to load sessions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const cleanupSessions = async () => {
    if (!confirm('Delete all sessions for this user? You will need to re-enable Auto-Trade.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/session/debug?userWallet=${userAddress}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      toast.success(`Deleted ${data.deletedCount} sessions`);
      setSessions([]);
    } catch (error) {
      toast.error("Failed to cleanup sessions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold flex items-center gap-2">
          🔍 Session Diagnostics
        </h3>
        <div className="flex gap-2">
          <button
            onClick={loadSessions}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "Loading..." : "Load Sessions"}
          </button>
          <button
            onClick={cleanupSessions}
            disabled={loading}
            className="bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Cleanup
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-gray-400 text-sm text-center py-8">
          No sessions found. Click "Load Sessions" to check.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, idx) => (
            <div
              key={session.id}
              className="bg-black/30 rounded-lg p-4 space-y-2 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Session #{idx + 1}</span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  session.isActive 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {session.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              <div className="space-y-1 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">User Wallet:</span>
                  <span className="text-white">
                    {session.userWallet.slice(0, 10)}...{session.userWallet.slice(-8)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Smart Account:</span>
                  <span className="text-purple-400">
                    {session.smartAccountAddress.slice(0, 10)}...{session.smartAccountAddress.slice(-8)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">EOA:</span>
                  <span className="text-blue-400">
                    {session.eoaAddress.slice(0, 10)}...{session.eoaAddress.slice(-8)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Permissions:</span>
                  <span className={
                    session.hasPermissions 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }>
                    {session.hasPermissions ? '✓ SET' : '✗ MISSING'}
                  </span>
                </div>

                {session.hasPermissions && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Context:</span>
                      <span className="text-yellow-400">
                        {session.permissionsContext}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Delegation Mgr:</span>
                      <span className="text-yellow-400">
                        {session.delegationManager === 'MISSING' 
                          ? 'MISSING' 
                          : `${session.delegationManager.slice(0, 6)}...`}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                  <span className="text-gray-400">Created:</span>
                  <span className="text-gray-300">
                    {new Date(session.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
        <div className="text-blue-400 font-medium mb-2 text-sm">💡 Troubleshooting:</div>
        <ul className="text-xs text-blue-300 space-y-1 list-disc pl-4">
          <li>If you see multiple sessions, cleanup and re-enable</li>
          <li>Smart Account address must match between session and MetaMask</li>
          <li>Permissions Context and Delegation Manager must be SET</li>
          <li>Session must be ACTIVE to execute trades</li>
        </ul>
      </div>
    </div>
  );
}