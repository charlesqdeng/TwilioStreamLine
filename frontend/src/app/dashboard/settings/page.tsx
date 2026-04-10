'use client';

import { useEffect, useState } from 'react';
import { useSubaccountStore } from '@/store/useSubaccountStore';
import api from '@/lib/api';
import AddSubaccountModal from '@/components/AddSubaccountModal';
import { PlusCircle, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface Subaccount {
  id: string;
  friendlyName: string;
  twilioSid: string;
  sinkSid: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const { subaccounts, setSubaccounts, activeSubaccountId, setActiveSubaccount, removeSubaccount } = useSubaccountStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSubaccounts();
  }, []);

  const fetchSubaccounts = async () => {
    try {
      const response = await api.get('/api/subaccounts');
      setSubaccounts(response.data.subaccounts);
    } catch (error) {
      console.error('Failed to fetch subaccounts:', error);
      setError('Failed to load subaccounts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubaccountAdded = () => {
    fetchSubaccounts();
    setIsAddModalOpen(false);
    setSuccess('Subaccount added successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteClick = (subaccountId: string) => {
    setConfirmDeleteId(subaccountId);
    setError('');
    setSuccess('');
  };

  const handleCancelDelete = () => {
    setConfirmDeleteId(null);
  };

  const handleConfirmDelete = async (subaccount: Subaccount) => {
    setDeletingId(subaccount.id);
    setError('');
    setSuccess('');

    try {
      await api.delete(`/api/subaccounts/${subaccount.id}`);

      // Remove from store immediately
      removeSubaccount(subaccount.id);

      // If the deleted subaccount was active, switch to another one
      if (activeSubaccountId === subaccount.id) {
        const remaining = subaccounts.filter((s) => s.id !== subaccount.id);
        if (remaining.length > 0) {
          setActiveSubaccount(remaining[0].id);
        } else {
          setActiveSubaccount(null);
        }
      }

      setSuccess(`Subaccount "${subaccount.friendlyName}" disconnected successfully!`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to disconnect subaccount. Please try again.');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Manage Subaccounts</h2>
              <p className="text-gray-600">
                Add, view, and disconnect your Twilio subaccounts
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Add Subaccount</span>
            </button>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}
        </div>

        {/* Subaccounts List */}
        {subaccounts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <PlusCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Subaccounts</h3>
            <p className="text-gray-600 mb-4">
              Get started by adding your first Twilio subaccount
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Add Subaccount
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subaccount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account SID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subaccounts.map((subaccount) => (
                  <tr key={subaccount.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {subaccount.friendlyName}
                          </div>
                          {activeSubaccountId === subaccount.id && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">{subaccount.twilioSid}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        subaccount.sinkSid
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {subaccount.sinkSid ? 'Connected' : 'Setup Incomplete'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(subaccount.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {confirmDeleteId === subaccount.id ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={handleCancelDelete}
                            disabled={deletingId === subaccount.id}
                            className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleConfirmDelete(subaccount)}
                            disabled={deletingId === subaccount.id}
                            className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700 transition disabled:opacity-50 flex items-center"
                          >
                            {deletingId === subaccount.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Disconnecting...
                              </>
                            ) : (
                              'Confirm'
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDeleteClick(subaccount.id)}
                          disabled={deletingId !== null}
                          className="text-red-600 hover:text-red-900 transition disabled:opacity-50 flex items-center space-x-1 ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Disconnect</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Warning Notice */}
        {subaccounts.length > 0 && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-900 mb-1">
                  Warning: Disconnecting a subaccount
                </h3>
                <p className="text-sm text-yellow-700">
                  Disconnecting will remove the Twilio Event Sink and Subscription from your Twilio account,
                  and delete all stored events from StreamLine. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <AddSubaccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleSubaccountAdded}
      />
    </div>
  );
}
