'use client';

import { useEffect, useState } from 'react';
import { useSubaccountStore } from '@/store/useSubaccountStore';
import { useAuthStore } from '@/store/useAuthStore';
import { initSocket, getSocket } from '@/lib/socket';
import api from '@/lib/api';
import AddSubaccountModal from '@/components/AddSubaccountModal';
import { PlusCircle, Loader2 } from 'lucide-react';

interface Stats {
  totalEvents: number;
  activeSubscriptions: number;
}

export default function DashboardPage() {
  const { subaccounts, setSubaccounts, activeSubaccountId, setActiveSubaccount } = useSubaccountStore();
  const { token } = useAuthStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalEvents: 0, activeSubscriptions: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    fetchSubaccounts();
  }, []);

  useEffect(() => {
    if (activeSubaccountId) {
      fetchStats();
    }
  }, [activeSubaccountId]);

  // Initialize WebSocket connection and listen for new events
  useEffect(() => {
    if (!token) return;

    const socket = initSocket(token);

    socket.on('connect', () => {
      console.log('✅ Dashboard WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('❌ Dashboard WebSocket disconnected');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [token]);

  // Join/leave subaccount room and listen for events
  useEffect(() => {
    if (!activeSubaccountId) return;

    const socket = getSocket();
    if (!socket) return;

    // Join room for active subaccount
    socket.emit('join-subaccount', activeSubaccountId);
    console.log(`📡 Dashboard joined room: ${activeSubaccountId}`);

    // Listen for new events and increment counter
    const handleNewEvent = () => {
      console.log('🔔 Dashboard received new event notification');
      setStats((prev) => ({
        ...prev,
        totalEvents: prev.totalEvents + 1,
      }));
    };

    socket.on('new-event', handleNewEvent);

    // Cleanup
    return () => {
      socket.emit('leave-subaccount', activeSubaccountId);
      socket.off('new-event', handleNewEvent);
      console.log(`📴 Dashboard left room: ${activeSubaccountId}`);
    };
  }, [activeSubaccountId]);

  const fetchSubaccounts = async () => {
    try {
      const response = await api.get('/api/subaccounts');
      setSubaccounts(response.data.subaccounts);

      // Auto-select first subaccount if none selected
      if (!activeSubaccountId && response.data.subaccounts.length > 0) {
        setActiveSubaccount(response.data.subaccounts[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch subaccounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!activeSubaccountId) return;

    setIsLoadingStats(true);
    try {
      // Fetch events from last 24 hours
      const eventsResponse = await api.get(`/api/events/${activeSubaccountId}?limit=1000`);
      const events = eventsResponse.data.events || [];

      // Count events from last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentEvents = events.filter((event: any) => new Date(event.receivedAt) > oneDayAgo);

      // Fetch active subscriptions
      const subsResponse = await api.get(`/api/subaccounts/${activeSubaccountId}/subscriptions`);
      const subscriptions = subsResponse.data.subscriptions || [];

      setStats({
        totalEvents: recentEvents.length,
        activeSubscriptions: subscriptions.length,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleSubaccountAdded = () => {
    fetchSubaccounts();
    setIsAddModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (subaccounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to StreamLine</h2>
          <p className="text-gray-600 mb-8">
            Get started by adding your first Twilio subaccount to monitor events in real-time.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Add Subaccount
          </button>
        </div>

        <AddSubaccountModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleSubaccountAdded}
        />
      </div>
    );
  }

  const activeSubaccount = subaccounts.find((s) => s.id === activeSubaccountId);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {activeSubaccount?.friendlyName || 'Dashboard'}
              </h2>
              <p className="text-gray-600">
                {activeSubaccount ? `SID: ${activeSubaccount.twilioSid}` : 'Select a subaccount from the sidebar'}
              </p>
            </div>
            {activeSubaccount && (
              <button
                onClick={fetchStats}
                disabled={isLoadingStats}
                className="flex items-center space-x-2 px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition disabled:opacity-50"
              >
                <Loader2 className={`w-4 h-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Events</h3>
            {isLoadingStats ? (
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            ) : (
              <p className="text-3xl font-bold text-primary-600">{stats.totalEvents}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">Last 24 hours</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Subscriptions</h3>
            {isLoadingStats ? (
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            ) : (
              <p className="text-3xl font-bold text-primary-600">{stats.activeSubscriptions}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">Event types</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Status</h3>
            <p className={`text-3xl font-bold ${activeSubaccount?.sinkSid ? 'text-green-600' : 'text-yellow-600'}`}>
              {activeSubaccount?.sinkSid ? 'Active' : 'Setup Incomplete'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {activeSubaccount?.sinkSid ? 'Monitoring in real-time' : 'Configure subscriptions to start'}
            </p>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          {activeSubaccount ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/dashboard/events"
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition"
              >
                <h4 className="font-semibold text-gray-900 mb-1">⚡ View Events</h4>
                <p className="text-sm text-gray-600">See real-time event stream</p>
              </a>
              <a
                href="/dashboard/subscriptions"
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition"
              >
                <h4 className="font-semibold text-gray-900 mb-1">⚙️ Manage Subscriptions</h4>
                <p className="text-sm text-gray-600">Configure event types</p>
              </a>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">
              Select a subaccount from the sidebar to view actions
            </p>
          )}
        </div>
      </div>

      <AddSubaccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleSubaccountAdded}
      />
    </div>
  );
}
