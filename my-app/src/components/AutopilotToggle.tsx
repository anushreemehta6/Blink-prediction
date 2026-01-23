'use client';

import { useState, useEffect } from 'react';
import { Bot, Settings, Power } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { type Address } from 'viem';

interface AutopilotToggleProps {
  address: Address;
}

export default function AutopilotToggle({ address }: AutopilotToggleProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    dailyLimit: '10',
    bands: [1], // Default: UP_SMALL
    betAmount: '0.1',
  });

  // Check autopilot status
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(`/api/autopilot/status?address=${address}`);
        if (res.ok) {
          const data = await res.json();
          setIsEnabled(data.isActive || false);
          if (data.settings) {
            setSettings(data.settings);
          }
        }
      } catch (error) {
        console.error('Failed to check autopilot status:', error);
      }
    }

    if (address) {
      checkStatus();
    }
  }, [address]);

  const handleToggle = async () => {
    if (isEnabled) {
      // Disable autopilot
      await handleDisable();
    } else {
      // Show settings modal before enabling
      setShowSettings(true);
    }
  };

  const handleEnable = async () => {
    try {
      setLoading(true);
      toast.loading('Setting up autopilot...', { id: 'autopilot' });

      const res = await fetch('/api/autopilot/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          settings,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to enable autopilot');
      }

      toast.dismiss('autopilot');
      toast.success('Autopilot enabled! 🤖');
      setIsEnabled(true);
      setShowSettings(false);
    } catch (error: any) {
      console.error('Enable autopilot error:', error);
      toast.dismiss('autopilot');
      toast.error(error.message || 'Failed to enable autopilot');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    try {
      setLoading(true);
      toast.loading('Disabling autopilot...', { id: 'autopilot' });

      const res = await fetch('/api/autopilot/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (!res.ok) {
        throw new Error('Failed to disable autopilot');
      }

      toast.dismiss('autopilot');
      toast.success('Autopilot disabled');
      setIsEnabled(false);
    } catch (error: any) {
      console.error('Disable autopilot error:', error);
      toast.dismiss('autopilot');
      toast.error('Failed to disable autopilot');
    } finally {
      setLoading(false);
    }
  };

  const toggleBand = (bandId: number) => {
    setSettings((prev) => {
      const bands = prev.bands.includes(bandId)
        ? prev.bands.filter((b) => b !== bandId)
        : [...prev.bands, bandId];
      return { ...prev, bands };
    });
  };

  return (
    <>
      {/* Autopilot Card */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isEnabled ? 'bg-green-500/10' : 'bg-gray-800'}`}>
              <Bot className={isEnabled ? 'text-green-500' : 'text-gray-400'} size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Autopilot Mode</h3>
              <p className="text-sm text-gray-400">
                {isEnabled ? '🟢 Active - Bot is trading' : '⚪ Inactive'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEnabled && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-gray-800 rounded-xl transition-colors"
                title="Settings"
              >
                <Settings size={20} className="text-gray-400" />
              </button>
            )}

            <button
              onClick={handleToggle}
              disabled={loading}
              className={`
                relative w-16 h-8 rounded-full transition-colors
                ${isEnabled ? 'bg-green-500' : 'bg-gray-700'}
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div
                className={`
                  absolute top-1 w-6 h-6 bg-white rounded-full transition-transform
                  ${isEnabled ? 'translate-x-9' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </div>

        {isEnabled && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-400 mb-1">Daily Limit</div>
                <div className="text-sm font-bold text-white">${settings.dailyLimit}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Bet Amount</div>
                <div className="text-sm font-bold text-white">${settings.betAmount}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Bands</div>
                <div className="text-sm font-bold text-white">{settings.bands.length}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Autopilot Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Daily Limit */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Daily Limit (USDC)
              </label>
              <input
                type="number"
                value={settings.dailyLimit}
                onChange={(e) => setSettings({ ...settings, dailyLimit: e.target.value })}
                className="input"
                placeholder="10"
              />
              <p className="text-xs text-gray-400 mt-1">
                Bot will stop if this limit is reached in 24h
              </p>
            </div>

            {/* Bet Amount */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bet Amount per Prediction (USDC)
              </label>
              <input
                type="number"
                value={settings.betAmount}
                onChange={(e) => setSettings({ ...settings, betAmount: e.target.value })}
                className="input"
                placeholder="0.1"
              />
            </div>

            {/* Band Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Active Bands (select multiple)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['UP_TINY', 'UP_SMALL', 'UP_MEDIUM', 'UP_LARGE', 'DOWN_TINY', 'DOWN_SMALL', 'DOWN_MEDIUM', 'DOWN_LARGE'].map(
                  (name, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleBand(idx)}
                      className={`
                        p-3 rounded-xl border-2 text-sm font-medium transition-all
                        ${
                          settings.bands.includes(idx)
                            ? 'border-purple-500 bg-purple-500/10 text-white'
                            : 'border-gray-700 bg-gray-800 text-gray-400'
                        }
                      `}
                    >
                      {name}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button onClick={() => setShowSettings(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleEnable}
                disabled={loading || settings.bands.length === 0}
                className="btn btn-primary flex-1"
              >
                {loading ? 'Enabling...' : isEnabled ? 'Update' : 'Enable Autopilot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}