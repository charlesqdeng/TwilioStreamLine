'use client';

import { useEffect, useState } from 'react';
import { useSubaccountStore } from '@/store/useSubaccountStore';
import api from '@/lib/api';
import { Bell, Mail, MessageSquare, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  emailAddress: string | null;
  phoneNumber: string | null;
  frequency: 'realtime' | 'daily' | 'both';
  eventTypeFilters: string[] | null;
  dailySummaryTime: string;
  lastNotificationSentAt: string | null;
}

interface EventType {
  type: string;
  schemaId: string;
}

export default function NotificationSettings() {
  const { activeSubaccountId } = useSubaccountStore();
  const activeSubaccount = useSubaccountStore(
    (state) => state.subaccounts.find((s) => s.id === activeSubaccountId)
  );

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailEnabled: false,
    smsEnabled: false,
    emailAddress: null,
    phoneNumber: null,
    frequency: 'daily',
    eventTypeFilters: null,
    dailySummaryTime: '09:00',
    lastNotificationSentAt: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState<'email' | 'sms' | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeSubaccount) {
      fetchPreferences();
    }
  }, [activeSubaccount]);

  const fetchPreferences = async () => {
    if (!activeSubaccount) return;

    try {
      setIsLoading(true);
      const response = await api.get(`/api/subaccounts/${activeSubaccount.id}/notifications`);
      setPreferences(response.data);
    } catch (err: any) {
      console.error('Failed to fetch notification preferences:', err);
      setError('Failed to load notification preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!activeSubaccount) return;

    // Validation
    if (preferences.emailEnabled && !preferences.emailAddress) {
      setError('Email address is required when email notifications are enabled');
      return;
    }

    if (preferences.smsEnabled && !preferences.phoneNumber) {
      setError('Phone number is required when SMS notifications are enabled');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      setSuccess('');

      await api.put(`/api/subaccounts/${activeSubaccount.id}/notifications`, preferences);

      setSuccess('Notification preferences saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async (channel: 'email' | 'sms') => {
    if (!activeSubaccount) return;

    // Validate that contact info is provided
    if (channel === 'email' && !preferences.emailAddress) {
      setError('Please enter an email address first');
      return;
    }

    if (channel === 'sms' && !preferences.phoneNumber) {
      setError('Please enter a phone number first');
      return;
    }

    try {
      setIsSendingTest(channel);
      setError('');
      setSuccess('');

      // Send current form values (not saved preferences)
      await api.post(`/api/subaccounts/${activeSubaccount.id}/notifications/test`, {
        channel,
        email: preferences.emailAddress,
        phone: preferences.phoneNumber,
      });

      setSuccess(`Test ${channel} notification sent successfully!`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to send test ${channel}`);
    } finally {
      setIsSendingTest(null);
    }
  };


  if (!activeSubaccount) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>Please select a subaccount to configure notifications</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3 mb-2">
          <Bell className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-900">Notification Settings</h2>
        </div>
        <p className="text-gray-600">
          Configure how you want to receive event notifications for {activeSubaccount.friendlyName}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Status Messages */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-start">
            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Email Notifications */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-3 mb-4">
            <Mail className="w-5 h-5 text-gray-600 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.emailEnabled}
                    onChange={(e) => setPreferences({ ...preferences, emailEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <p className="text-sm text-gray-600 mb-3">Receive event notifications via email</p>

              {preferences.emailEnabled && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={preferences.emailAddress || ''}
                      onChange={(e) => setPreferences({ ...preferences, emailAddress: e.target.value })}
                      placeholder="your-email@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                    />
                  </div>
                  <button
                    onClick={() => handleSendTest('email')}
                    disabled={!preferences.emailAddress || isSendingTest !== null}
                    className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSendingTest === 'email' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Test Email'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SMS Notifications */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-3 mb-4">
            <MessageSquare className="w-5 h-5 text-gray-600 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">SMS Notifications</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.smsEnabled}
                    onChange={(e) => setPreferences({ ...preferences, smsEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <p className="text-sm text-gray-600 mb-3">Receive event notifications via SMS</p>

              {preferences.smsEnabled && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={preferences.phoneNumber || ''}
                      onChange={(e) => setPreferences({ ...preferences, phoneNumber: e.target.value })}
                      placeholder="+1234567890"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +1 for US)</p>
                  </div>
                  <button
                    onClick={() => handleSendTest('sms')}
                    disabled={!preferences.phoneNumber || isSendingTest !== null}
                    className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSendingTest === 'sms' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Test SMS'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notification Frequency */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Notification Frequency</h3>
          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                value="realtime"
                checked={preferences.frequency === 'realtime'}
                onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value as any })}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">Real-time</div>
                <div className="text-xs text-gray-500">Get notified immediately for every event</div>
              </div>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                value="daily"
                checked={preferences.frequency === 'daily'}
                onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value as any })}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">Daily Summary</div>
                <div className="text-xs text-gray-500">Receive a daily digest of all events</div>
              </div>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                value="both"
                checked={preferences.frequency === 'both'}
                onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value as any })}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">Both</div>
                <div className="text-xs text-gray-500">Real-time notifications + daily summary</div>
              </div>
            </label>
          </div>

          {(preferences.frequency === 'daily' || preferences.frequency === 'both') && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Daily Summary Time (UTC)
              </label>
              <input
                type="time"
                value={preferences.dailySummaryTime}
                onChange={(e) => setPreferences({ ...preferences, dailySummaryTime: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
              />
              <p className="text-xs text-gray-500 mt-1">Time when you'll receive your daily summary</p>
            </div>
          )}
        </div>

        {/* Last Notification Info */}
        {preferences.lastNotificationSentAt && (
          <div className="text-xs text-gray-500">
            Last notification sent: {new Date(preferences.lastNotificationSentAt).toLocaleString()}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
