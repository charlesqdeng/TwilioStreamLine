'use client';

import { X, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface EventDetailModalProps {
  event: {
    id: string;
    eventSid: string | null;
    eventType: string;
    payload: Record<string, any>;
    receivedAt: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EventDetailModal({ event, isOpen, onClose }: EventDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !event) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(event.payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Event Details</h3>
            <p className="text-sm text-gray-500 mt-1">{event.eventType}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                Event ID
              </label>
              <p className="text-sm font-mono text-gray-900">{event.id}</p>
            </div>
            {event.eventSid && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                  Event SID
                </label>
                <p className="text-sm font-mono text-gray-900">{event.eventSid}</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                Event Type
              </label>
              <p className="text-sm text-gray-900">{event.eventType}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                Received At
              </label>
              <p className="text-sm text-gray-900">{formatDate(event.receivedAt)}</p>
            </div>
          </div>

          {/* JSON Payload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-500 uppercase">
                JSON Payload
              </label>
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1 text-xs text-primary-600 hover:text-primary-700 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </div>
          </div>

          {/* Human-Readable Summary */}
          <div className="mt-6">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
              Human-Readable Summary
            </label>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-900">
                {generateHumanReadable(event.eventType, event.payload)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Generate human-readable description from event payload
function generateHumanReadable(eventType: string, payload: Record<string, any>): string {
  const type = eventType.toLowerCase();

  // Messaging events
  if (type.includes('message')) {
    const from = payload.From || payload.from || 'Unknown';
    const to = payload.To || payload.to || 'Unknown';
    const body = payload.Body || payload.body || '';
    const status = payload.Status || payload.status || '';

    if (type.includes('sent')) {
      return `Message sent from ${from} to ${to}${body ? `: "${body}"` : ''}`;
    }
    if (type.includes('delivered')) {
      return `Message delivered to ${to} from ${from}${status ? ` (Status: ${status})` : ''}`;
    }
    if (type.includes('received')) {
      return `Message received from ${from} to ${to}${body ? `: "${body}"` : ''}`;
    }
    return `Message event: ${from} → ${to}`;
  }

  // Call events
  if (type.includes('call') || type.includes('voice')) {
    const from = payload.From || payload.CallFrom || payload.from || 'Unknown';
    const to = payload.To || payload.CallTo || payload.to || 'Unknown';
    const status = payload.CallStatus || payload.status || '';
    const duration = payload.CallDuration || payload.Duration || '';

    if (type.includes('initiated') || type.includes('started')) {
      return `Call initiated from ${from} to ${to}`;
    }
    if (type.includes('answered') || type.includes('in-progress')) {
      return `Call in progress: ${from} → ${to}`;
    }
    if (type.includes('completed') || type.includes('ended')) {
      return `Call completed: ${from} → ${to}${duration ? ` (Duration: ${duration}s)` : ''}`;
    }
    return `Call event: ${from} → ${to}${status ? ` (${status})` : ''}`;
  }

  // Generic fallback
  const keys = Object.keys(payload).slice(0, 5);
  const summary = keys.map((key) => `${key}: ${payload[key]}`).join(', ');
  return `Event: ${eventType}${summary ? ` - ${summary}` : ''}`;
}
