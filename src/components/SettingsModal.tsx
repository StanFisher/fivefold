'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Settings, RotateCcw, AlertTriangle, Check, Save } from 'lucide-react';
import { AccountSettings, Child } from '@/lib/types';
import { PRESET_COLORS } from '@/lib/formatters';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  settings: AccountSettings;
  childrenList: Child[];
  onResetDatabase: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  onSuccess,
  settings,
  childrenList,
  onResetDatabase,
}: SettingsModalProps) {
  const [apy, setApy] = useState<string>(settings.apy.toFixed(2));
  const [accountName, setAccountName] = useState<string>(settings.accountName);
  const [childrenData, setChildrenData] = useState(
    childrenList.map((c) => ({ id: c.id, name: c.name, color: c.color }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [openColorPickerIndex, setOpenColorPickerIndex] = useState<number | null>(null);

  const colorPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (openColorPickerIndex === null) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setOpenColorPickerIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [openColorPickerIndex]);

  if (!isOpen) return null;

  const handleChildChange = (index: number, field: string, value: string) => {
    setChildrenData((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const parsedApy = parseFloat(apy);
      if (isNaN(parsedApy) || parsedApy < 0) {
        throw new Error('Please enter a valid APY percentage');
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apy: parsedApy,
          accountName: accountName.trim(),
          children: childrenData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');

      setSavedSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-30 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Account Settings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure APY and manage children</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-sm">
              {error}
            </div>
          )}

          {savedSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
              <Check className="w-4 h-4" /> Settings updated successfully!
            </div>
          )}

          {/* Account Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Account Parameters
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Current APY Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={apy}
                    onChange={(e) => setApy(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-3.5 pr-8 py-2 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <span className="absolute right-3 top-2 text-slate-400 text-sm">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Children Management */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Manage Children ({childrenData.length})
            </h3>

            <div className="space-y-2">
              {childrenData.map((child, index) => {
                const initialLetter = child.name.trim().charAt(0).toUpperCase() || `${index + 1}`;
                const isPickerOpen = openColorPickerIndex === index;

                return (
                  <div
                    key={child.id}
                    className={`relative flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 p-2.5 rounded-xl ${
                      isPickerOpen ? 'z-40 ring-1 ring-indigo-500/50' : 'z-10'
                    }`}
                  >
                    {/* Option A Avatar Button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenColorPickerIndex(isPickerOpen ? null : index);
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow transition-transform hover:scale-105 cursor-pointer ring-2 ring-white/10"
                        style={{ backgroundColor: child.color }}
                        title="Click to change color"
                      >
                        {initialLetter}
                      </button>

                      {/* Popover */}
                      {isPickerOpen && (
                        <div
                          ref={colorPickerRef}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 top-10 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 shadow-2xl w-44 animate-in fade-in"
                        >
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                            Select Color
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {PRESET_COLORS.map((pc) => {
                              const isSelected = child.color.toLowerCase() === pc.hex.toLowerCase();
                              return (
                                <button
                                  key={pc.hex}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChildChange(index, 'color', pc.hex);
                                    setOpenColorPickerIndex(null);
                                  }}
                                  className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow relative"
                                  style={{ backgroundColor: pc.hex }}
                                  title={pc.name}
                                >
                                  {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      value={child.name}
                      onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Child Name"
                      required
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reset zone */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Danger Zone
            </h3>

            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2 px-3 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Account &amp; Start Over
              </button>
            ) : (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl space-y-2">
                <p className="text-xs text-rose-700 dark:text-rose-200">
                  Are you sure? This will erase all children, transaction ledgers, and restart onboarding.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onResetDatabase}
                    className="flex-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-1.5 px-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
