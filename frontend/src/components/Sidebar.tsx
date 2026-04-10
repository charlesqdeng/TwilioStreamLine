'use client';

import { useState, useEffect } from 'react';
import { useSubaccountStore } from '@/store/useSubaccountStore';
import { PlusCircle } from 'lucide-react';
import AddSubaccountModal from './AddSubaccountModal';
import api from '@/lib/api';

export default function Sidebar() {
  const { subaccounts, activeSubaccountId, setActiveSubaccount, setSubaccounts } = useSubaccountStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch subaccounts on component mount to ensure fresh data
  useEffect(() => {
    fetchSubaccounts();
  }, []);

  const fetchSubaccounts = async () => {
    try {
      const response = await api.get('/api/subaccounts');
      setSubaccounts(response.data.subaccounts);
    } catch (error) {
      console.error('Failed to fetch subaccounts:', error);
    }
  };

  const handleSubaccountAdded = () => {
    fetchSubaccounts();
    setIsAddModalOpen(false);
  };

  return (
    <>
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-primary-600">StreamLine</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Subaccounts
            </h3>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="p-1 text-primary-600 hover:bg-primary-50 rounded transition"
              title="Add Subaccount"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
          </div>

          {subaccounts.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              No subaccounts yet.
              <br />
              Click + to add one.
            </div>
          ) : (
            <div className="space-y-2">
              {subaccounts.map((subaccount) => (
                <button
                  key={subaccount.id}
                  onClick={() => setActiveSubaccount(subaccount.id)}
                  className={`w-full text-left px-3 py-3 rounded-lg transition ${
                    activeSubaccountId === subaccount.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium truncate">{subaccount.friendlyName}</div>
                  <div className={`text-xs truncate mt-1 ${
                    activeSubaccountId === subaccount.id ? 'text-primary-100' : 'text-gray-500'
                  }`}>
                    {subaccount.twilioSid}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200">
          <nav className="space-y-1">
            <a
              href="/dashboard"
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <span>📊</span>
              <span className="ml-2">Dashboard</span>
            </a>
            <a
              href="/dashboard/events"
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <span>⚡</span>
              <span className="ml-2">Live Events</span>
            </a>
            <a
              href="/dashboard/subscriptions"
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <span>⚙️</span>
              <span className="ml-2">Subscriptions</span>
            </a>
            <a
              href="/dashboard/notifications"
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <span>🔔</span>
              <span className="ml-2">Notifications</span>
            </a>
            <a
              href="/dashboard/settings"
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <span>🔧</span>
              <span className="ml-2">Settings</span>
            </a>
          </nav>
        </div>
      </div>

      <AddSubaccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleSubaccountAdded}
      />
    </>
  );
}
