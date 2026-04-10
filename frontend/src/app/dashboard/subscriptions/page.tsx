'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSubaccountStore } from '@/store/useSubaccountStore';
import api from '@/lib/api';
import { AlertCircle, Save, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface Subscription {
  id: string;
  eventType: string;
  subscriptionSid: string | null;
}

// Product name mapping for better display
// Maps the third part of event type to friendly names
// Event format: com.twilio.{product}.{event}.{action}
const PRODUCT_NAMES: Record<string, string> = {
  'messaging': 'Messaging',
  'voice': 'Voice',
  'studio': 'Studio',
  'conversations': 'Conversations',
  'taskrouter': 'TaskRouter',
  'trusthub': 'Trust Hub',
  'accountsecurity': 'Account Security',
  'verify': 'Verify',
  'authy': 'Authy',
  'flex': 'Flex',
  'proxy': 'Proxy',
  'sync': 'Sync',
  'chat': 'Chat',
  'video': 'Video',
  'notify': 'Notify',
  'wireless': 'Wireless',
  'supersim': 'Super SIM',
  'lookup': 'Lookup',
  'intelligence': 'Intelligence',
  'frontline': 'Frontline',
  'numbers': 'Phone Numbers',
  'autopilot': 'Autopilot',
  'trunking': 'SIP Trunking',
};

export default function SubscriptionsPage() {
  const { activeSubaccountId, getActiveSubaccount } = useSubaccountStore();
  const [availableEventTypes, setAvailableEventTypes] = useState<string[]>([]);
  const [currentSubscriptions, setCurrentSubscriptions] = useState<string[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());

  const activeSubaccount = getActiveSubaccount();

  // Fetch available event types from Twilio
  const fetchEventTypes = useCallback(async () => {
    if (!activeSubaccountId) return;

    setIsLoadingTypes(true);
    setError('');
    try {
      const response = await api.get(`/api/subaccounts/${activeSubaccountId}/event-types`);
      setAvailableEventTypes(response.data.eventTypes || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch event types');
    } finally {
      setIsLoadingTypes(false);
    }
  }, [activeSubaccountId]);

  // Fetch current subscriptions
  const fetchSubscriptions = useCallback(async () => {
    if (!activeSubaccountId) return;

    setIsLoadingSubscriptions(true);
    try {
      const response = await api.get(`/api/subaccounts/${activeSubaccountId}/subscriptions`);
      const subscriptions: Subscription[] = response.data.subscriptions || [];
      const eventTypes = subscriptions.map((s) => s.eventType);
      setCurrentSubscriptions(eventTypes);
      setSelectedEventTypes(eventTypes);
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
    } finally {
      setIsLoadingSubscriptions(false);
    }
  }, [activeSubaccountId]);

  useEffect(() => {
    if (activeSubaccountId) {
      fetchEventTypes();
      fetchSubscriptions();
    }
  }, [activeSubaccountId, fetchEventTypes, fetchSubscriptions]);

  // Group event types by product namespace and sub-category
  // Event format: com.twilio.{product}.{subcategory}.{action}
  // Example: com.twilio.accountsecurity.verify.attempt-dlr.delivered
  // Main category: accountsecurity (index 2)
  // Sub-category: verify (index 3)
  const groupedEventTypes = useMemo(() => {
    const filtered = availableEventTypes.filter((eventType) =>
      eventType.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: Record<string, Record<string, string[]>> = {};

    filtered.forEach((eventType) => {
      const parts = eventType.split('.');
      // Use the third part (index 2) as the main product category
      const category = parts.length >= 3 ? parts[2] : parts[0];
      // Use the fourth part (index 3) as the sub-category
      const subcategory = parts.length >= 4 ? parts[3] : 'general';

      if (!groups[category]) {
        groups[category] = {};
      }
      if (!groups[category][subcategory]) {
        groups[category][subcategory] = [];
      }
      groups[category][subcategory].push(eventType);
    });

    // Sort categories, subcategories, and events
    const sortedGroups: Record<string, Record<string, string[]>> = {};
    Object.keys(groups)
      .sort()
      .forEach((category) => {
        sortedGroups[category] = {};
        Object.keys(groups[category])
          .sort()
          .forEach((subcategory) => {
            sortedGroups[category][subcategory] = groups[category][subcategory].sort();
          });
      });

    return sortedGroups;
  }, [availableEventTypes, searchQuery]);

  const filteredEventTypes = useMemo(() => {
    return availableEventTypes.filter((eventType) =>
      eventType.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableEventTypes, searchQuery]);

  const formatProductName = (namespace: string): string => {
    return PRODUCT_NAMES[namespace] || namespace
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const toggleSubcategory = (category: string, subcategory: string) => {
    const key = `${category}:${subcategory}`;
    setExpandedSubcategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allCategories = new Set(Object.keys(groupedEventTypes));
    const allSubcategories = new Set<string>();
    Object.entries(groupedEventTypes).forEach(([category, subcats]) => {
      Object.keys(subcats).forEach((subcat) => {
        allSubcategories.add(`${category}:${subcat}`);
      });
    });
    setExpandedCategories(allCategories);
    setExpandedSubcategories(allSubcategories);
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
    setExpandedSubcategories(new Set());
  };

  const handleToggle = (eventType: string) => {
    setSelectedEventTypes((prev) =>
      prev.includes(eventType)
        ? prev.filter((t) => t !== eventType)
        : [...prev, eventType]
    );
  };

  const handleToggleCategory = (category: string) => {
    // Collect all events in this category across all subcategories
    const categoryEvents: string[] = [];
    Object.values(groupedEventTypes[category] || {}).forEach((events) => {
      categoryEvents.push(...events);
    });

    const allSelected = categoryEvents.every((et) => selectedEventTypes.includes(et));

    if (allSelected) {
      // Deselect all in this category
      setSelectedEventTypes((prev) => prev.filter((et) => !categoryEvents.includes(et)));
    } else {
      // Select all in this category
      setSelectedEventTypes((prev) => {
        const newSet = new Set(prev);
        categoryEvents.forEach((et) => newSet.add(et));
        return Array.from(newSet);
      });
    }
  };

  const handleToggleSubcategory = (category: string, subcategory: string) => {
    const subcategoryEvents = groupedEventTypes[category]?.[subcategory] || [];
    const allSelected = subcategoryEvents.every((et) => selectedEventTypes.includes(et));

    if (allSelected) {
      // Deselect all in this subcategory
      setSelectedEventTypes((prev) => prev.filter((et) => !subcategoryEvents.includes(et)));
    } else {
      // Select all in this subcategory
      setSelectedEventTypes((prev) => {
        const newSet = new Set(prev);
        subcategoryEvents.forEach((et) => newSet.add(et));
        return Array.from(newSet);
      });
    }
  };

  const handleSelectAll = () => {
    setSelectedEventTypes(filteredEventTypes);
  };

  const handleDeselectAll = () => {
    setSelectedEventTypes([]);
  };

  const handleSave = async () => {
    if (!activeSubaccountId) return;

    if (selectedEventTypes.length === 0) {
      setError('Please select at least one event type');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/api/subaccounts/${activeSubaccountId}/subscriptions`, {
        eventTypes: selectedEventTypes,
      });

      setCurrentSubscriptions(selectedEventTypes);
      setSuccess('Subscriptions updated successfully!');

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update subscriptions');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(selectedEventTypes.sort()) !== JSON.stringify(currentSubscriptions.sort());

  if (!activeSubaccountId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Subaccount Selected</h2>
        <p className="text-gray-600">Please select a subaccount from the sidebar to manage subscriptions.</p>
      </div>
    );
  }

  const isLoading = isLoadingTypes || isLoadingSubscriptions;

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Event Subscriptions</h2>
              <p className="text-gray-600">
                {activeSubaccount?.friendlyName} • {activeSubaccount?.twilioSid}
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving || selectedEventTypes.length === 0}
              className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
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

          {/* Selection Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              <span className="font-bold">{selectedEventTypes.length}</span> of <span className="font-bold">{availableEventTypes.length}</span> event types selected
              {hasChanges && <span className="text-orange-600 ml-2">(unsaved changes)</span>}
            </span>
            <div className="space-x-2">
              <button
                onClick={handleSelectAll}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Select All
              </button>
              <span className="text-gray-400">•</span>
              <button
                onClick={handleDeselectAll}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>

        {/* Search & Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <input
            type="text"
            placeholder="Search event types... (e.g., messaging, voice, compliance)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white mb-3"
          />
          <div className="flex justify-end space-x-2 text-sm">
            <button
              onClick={expandAll}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Expand All
            </button>
            <span className="text-gray-400">•</span>
            <button
              onClick={collapseAll}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Event Types by Category */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : Object.keys(groupedEventTypes).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No Matching Event Types' : 'No Event Types Available'}
            </h3>
            <p className="text-gray-600">
              {searchQuery
                ? 'Try adjusting your search query.'
                : 'No event types were found for this subaccount.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedEventTypes).map(([category, subcategories]) => {
              const isExpanded = expandedCategories.has(category);

              // Count all events in this category across all subcategories
              const allCategoryEvents: string[] = [];
              Object.values(subcategories).forEach((events) => {
                allCategoryEvents.push(...events);
              });
              const selectedInCategory = allCategoryEvents.filter((et) => selectedEventTypes.includes(et)).length;
              const allSelected = selectedInCategory === allCategoryEvents.length;
              const someSelected = selectedInCategory > 0 && !allSelected;

              return (
                <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
                  {/* Category Header */}
                  <div className="bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleCategory(category)}
                          className="text-gray-600 hover:text-gray-900 transition"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {formatProductName(category)}
                        </h3>
                        <span className="text-sm text-gray-500">
                          ({selectedInCategory}/{allCategoryEvents.length})
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleCategory(category)}
                        className="text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  </div>

                  {/* Subcategories */}
                  {isExpanded && (
                    <div>
                      {Object.entries(subcategories).map(([subcategory, events]) => {
                        const subcategoryKey = `${category}:${subcategory}`;
                        const isSubExpanded = expandedSubcategories.has(subcategoryKey);
                        const selectedInSubcategory = events.filter((et) => selectedEventTypes.includes(et)).length;
                        const allSubSelected = selectedInSubcategory === events.length;

                        return (
                          <div key={subcategoryKey} className="border-b border-gray-200 last:border-b-0">
                            {/* Subcategory Header */}
                            <div className="bg-gray-50/50 hover:bg-gray-100/50 transition">
                              <div className="flex items-center justify-between p-3 pl-12">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => toggleSubcategory(category, subcategory)}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                  >
                                    {isSubExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>
                                  <h4 className="text-sm font-medium text-gray-800">
                                    {formatProductName(subcategory)}
                                  </h4>
                                  <span className="text-xs text-gray-500">
                                    ({selectedInSubcategory}/{events.length})
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleToggleSubcategory(category, subcategory)}
                                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                                >
                                  {allSubSelected ? 'Deselect All' : 'Select All'}
                                </button>
                              </div>
                            </div>

                            {/* Subcategory Events */}
                            {isSubExpanded && (
                              <div className="divide-y divide-gray-100">
                                {events.map((eventType) => {
                                  const isSelected = selectedEventTypes.includes(eventType);
                                  const isCurrentlyActive = currentSubscriptions.includes(eventType);

                                  // Extract event name after subcategory
                                  // Format: com.twilio.{category}.{subcategory}.{remaining}
                                  // Show only the {remaining} part
                                  const parts = eventType.split('.');
                                  const eventName = parts.length >= 5 ? parts.slice(4).join('.') : '';

                                  return (
                                    <label
                                      key={eventType}
                                      className="flex items-center p-3 pl-20 hover:bg-gray-50 cursor-pointer transition"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggle(eventType)}
                                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                      />
                                      <div className="ml-3 flex-1">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-sm text-gray-900">{eventType}</span>
                                          {isCurrentlyActive && (
                                            <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded">
                                              Active
                                            </span>
                                          )}
                                        </div>
                                        {eventName && (
                                          <div className="text-xs text-gray-500 mt-0.5">
                                            {eventName.replace(/\./g, ' › ')}
                                          </div>
                                        )}
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Save Button (Bottom) */}
        {!isLoading && Object.keys(groupedEventTypes).length > 0 && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving || selectedEventTypes.length === 0}
              className="flex items-center space-x-2 px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
