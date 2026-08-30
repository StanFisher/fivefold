'use client';

import React, { useState } from 'react';
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

  if (!isOpen) return null;

  const handleChildChange = (index: number, field: string, value: string) => {
    const updated = [...childrenData];
    updated[index] = { ...updated[index], [field]: value };
    setChildrenData(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apy: parseFloat(apy) || 5.0,
          accountName,
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
      {openColorPickerIndex !== null && (
        <div
          className="fixed inset-0 z-20 cursor-default"
          onClick={() => setOpenColorPickerIndex(null)}
        />
      )}
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-30">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Account Settings</h2>
              <p className="text-xs text-slate-400">Configure APY and manage children</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-sm">
              {error}
            </div>
          )}

          {/* General info */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Bank Account Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Current APY Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={apy}
                    onChange={(e) => setApy(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3.5 pr-8 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <span className="absolute right-3 top-2 text-slate-400 text-sm">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Children Management */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Manage Children ({childrenData.length})
            </h3>

            <div className="space-y-2">
              {childrenData.map((child, index) => {
                const initialLetter = child.name.trim().charAt(0).toUpperCase() || `${index + 1}`;
                const isPickerOpen = openColorPickerIndex === index;

                return (
                  <div
                    key={child.id}
                    className="relative flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 p-2.5 rounded-xl"
                  >
                    {/* Option A Avatar Button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenColorPickerIndex(isPickerOpen ? null : index)}
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow transition-transform hover:scale-105 cursor-pointer ring-2 ring-white/10"
                        style={{ backgroundColor: child.color }}
                        title="Click to change color"
                      >
                        {initialLetter}
                      </button>

                      {/* Popover */}
                      {isPickerOpen && (
                        <div className="absolute left-0 top-10 z-30 bg-slate-800 border border-slate-700 rounded-2xl p-2.5 shadow-2xl w-44 animate-in fade-in">
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
                                  onClick={() => {
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
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Child Name"
                      required
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reset zone */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Danger Zone
            </h3>

            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-xs text-rose-400 hover:text-rose-300 underline underline-offset-2 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset all data &amp; restart onboarding
              </button>
            ) : (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl space-y-2">
                <p className="text-xs text-rose-200">
                  Are you sure? This will delete all transactions and initial balances.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onResetDatabase}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow"
                  >
                    Yes, Reset Everything
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
