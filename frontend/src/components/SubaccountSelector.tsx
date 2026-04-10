'use client';

import { useSubaccountStore } from '@/store/useSubaccountStore';

export default function SubaccountSelector() {
  const { subaccounts, activeSubaccountId, setActiveSubaccount } = useSubaccountStore();

  if (subaccounts.length === 0) {
    return (
      <div className="p-4 text-gray-500">
        No subaccounts linked. Add one to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase">Subaccounts</h3>
      {subaccounts.map((subaccount) => (
        <button
          key={subaccount.id}
          onClick={() => setActiveSubaccount(subaccount.id)}
          className={`w-full text-left px-4 py-3 rounded-lg transition ${
            activeSubaccountId === subaccount.id
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="font-medium">{subaccount.friendlyName}</div>
          <div className="text-xs opacity-75">{subaccount.twilioSid}</div>
        </button>
      ))}
    </div>
  );
}
