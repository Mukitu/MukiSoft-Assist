import React, { useState, useEffect } from 'react';
import { Sliders, Save, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { PlatformSettings } from '../../types/database';

export const AdminSettings: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { showToast } = useNotification();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const s = await api.getSettings();
      setSettings(s);
      setLoading(false);
    }
    load();
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-3">
        <Lock className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Super Administrator Restricted</h2>
        <p className="text-xs text-slate-500">Platform operational settings can only be managed by Super Administrators.</p>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast({
      type: 'success',
      title: 'Settings Saved',
      message: 'Platform configuration updated successfully.',
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
          Global Configuration
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Platform Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure corporate identifiers, support contact lines, and deposit gateway credentials.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSave} className="space-y-6 text-xs">
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Corporate Identity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Platform Name</label>
                <input
                  type="text"
                  defaultValue={settings?.general?.platform_name || 'MukiSoft Assist'}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operating Company</label>
                <input
                  type="text"
                  defaultValue={settings?.general?.parent_company || 'MukiSoft Technology'}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Payment Gateway Credentials (Public)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">bKash Merchant Number</label>
                <input
                  type="text"
                  defaultValue="01700-000000"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nagad Merchant Number</label>
                <input
                  type="text"
                  defaultValue="01800-000000"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="px-5 py-2 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
