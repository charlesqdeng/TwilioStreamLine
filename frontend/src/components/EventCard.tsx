'use client';

import { Clock, FileJson } from 'lucide-react';

interface EventCardProps {
  event: {
    id: string;
    eventSid: string | null;
    eventType: string;
    payload: Record<string, any>;
    receivedAt: string;
  };
  onClick: () => void;
}

export default function EventCard({ event, onClick }: EventCardProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleString();
  };

  // Extract meaningful data from payload for preview
  const getPreview = () => {
    const p = event.payload;

    // Common Twilio fields
    const from = p.From || p.from || p.CallFrom || p.call_from;
    const to = p.To || p.to || p.CallTo || p.call_to;
    const status = p.Status || p.status || p.CallStatus || p.call_status;
    const body = p.Body || p.body || p.MessageBody || p.message_body;

    const parts = [];
    if (from) parts.push(`From: ${from}`);
    if (to) parts.push(`To: ${to}`);
    if (status) parts.push(`Status: ${status}`);
    if (body) parts.push(`Body: ${body.substring(0, 50)}${body.length > 50 ? '...' : ''}`);

    return parts.length > 0 ? parts.join(' • ') : 'No preview available';
  };

  // Color coding based on event type
  const getEventColor = () => {
    const type = event.eventType.toLowerCase();
    if (type.includes('message') || type.includes('sms')) return 'blue';
    if (type.includes('call') || type.includes('voice')) return 'green';
    if (type.includes('error') || type.includes('failed')) return 'red';
    if (type.includes('complete') || type.includes('delivered')) return 'green';
    return 'gray';
  };

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const color = getEventColor();

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-primary-300 cursor-pointer transition"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span
              className={`px-2 py-1 text-xs font-medium rounded border ${colorClasses[color]}`}
            >
              {event.eventType}
            </span>
            {event.eventSid && (
              <span className="text-xs text-gray-500 font-mono">{event.eventSid}</span>
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{getPreview()}</p>
        </div>
        <FileJson className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
      </div>

      <div className="flex items-center text-xs text-gray-500">
        <Clock className="w-3 h-3 mr-1" />
        {formatTime(event.receivedAt)}
      </div>
    </div>
  );
}
