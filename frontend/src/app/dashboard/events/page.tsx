'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSubaccountStore } from '@/store/useSubaccountStore';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import { initSocket, getSocket } from '@/lib/socket';
import EventCard from '@/components/EventCard';
import EventDetailModal from '@/components/EventDetailModal';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface Event {
  id: string;
  eventSid: string;
  eventType: string;
  payload: Record<string, any>;
  receivedAt: string;
}

export default function EventsPage() {
  const { activeSubaccountId, getActiveSubaccount } = useSubaccountStore();
  const { token } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const activeSubaccount = getActiveSubaccount();

  // Fetch historical events
  const fetchEvents = useCallback(async () => {
    if (!activeSubaccountId) return;

    setIsLoading(true);
    try {
      const response = await api.get(`/api/events/${activeSubaccountId}?limit=50`);
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeSubaccountId]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!token) return;

    const socket = initSocket(token);

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket');
      setIsConnected(false);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [token]);

  // Join/leave subaccount room when active subaccount changes
  useEffect(() => {
    if (!activeSubaccountId) return;

    const socket = getSocket();
    if (!socket) return;

    // Join new room
    socket.emit('join-subaccount', activeSubaccountId);
    console.log(`📡 Joined room: ${activeSubaccountId}`);

    // Listen for new events
    const handleNewEvent = (event: Event) => {
      console.log('🔔 New event received:', event);
      setEvents((prev) => [event, ...prev].slice(0, 100)); // Keep last 100 events
    };

    socket.on('new-event', handleNewEvent);

    // Fetch historical events
    fetchEvents();

    return () => {
      socket.emit('leave-subaccount', activeSubaccountId);
      socket.off('new-event', handleNewEvent);
      console.log(`📴 Left room: ${activeSubaccountId}`);
    };
  }, [activeSubaccountId, fetchEvents]);

  if (!activeSubaccountId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Subaccount Selected</h2>
        <p className="text-gray-600">Please select a subaccount from the sidebar to view events.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Live Events</h2>
              <p className="text-gray-600">
                {activeSubaccount?.friendlyName} • {activeSubaccount?.twilioSid}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchEvents}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Events List */}
        {isLoading && events.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">Loading events...</div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Yet</h3>
            <p className="text-gray-600 mb-4">
              Events will appear here in real-time once Twilio starts sending them.
            </p>
            <p className="text-sm text-gray-500">
              Make sure you have configured event subscriptions and Twilio is sending events to your webhook.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => setSelectedEvent(event)}
              />
            ))}
          </div>
        )}

        {/* Event Detail Modal */}
        <EventDetailModal
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      </div>
    </div>
  );
}
