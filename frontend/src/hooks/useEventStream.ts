import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSubaccountStore } from '@/store/useSubaccountStore';
import { initSocket, getSocket } from '@/lib/socket';

interface Event {
  id: string;
  eventSid: string;
  eventType: string;
  payload: Record<string, any>;
  receivedAt: string;
}

/**
 * Custom hook to manage real-time event streaming
 */
export function useEventStream() {
  const { token } = useAuthStore();
  const { activeSubaccountId } = useSubaccountStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!token) return;

    const socket = initSocket(token);

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      setIsConnected(false);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, [token]);

  // Join/leave subaccount room
  useEffect(() => {
    if (!activeSubaccountId) return;

    const socket = getSocket();
    if (!socket) return;

    // Join room for active subaccount
    socket.emit('join-subaccount', activeSubaccountId);
    console.log(`📡 Joined room: ${activeSubaccountId}`);

    // Listen for new events
    const handleNewEvent = (event: Event) => {
      console.log('🔔 New event received:', event);
      setEvents((prev) => [event, ...prev].slice(0, 100)); // Keep last 100 events
    };

    socket.on('new-event', handleNewEvent);

    // Cleanup
    return () => {
      socket.emit('leave-subaccount', activeSubaccountId);
      socket.off('new-event', handleNewEvent);
      console.log(`📴 Left room: ${activeSubaccountId}`);
      setEvents([]); // Clear events when leaving room
    };
  }, [activeSubaccountId]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    isConnected,
    clearEvents,
  };
}
