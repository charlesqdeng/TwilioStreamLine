'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="text-center max-w-3xl">
        <h1 className="text-6xl font-bold mb-4 text-gray-900">StreamLine</h1>
        <p className="text-xl text-gray-700 mb-4">
          Multi-tenant monitoring dashboard for Twilio subaccounts
        </p>
        <p className="text-gray-600 mb-8">
          Monitor real-time Event Streams across multiple Twilio subaccounts with a unified, no-code interface.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-8 py-3 bg-white text-primary-600 border-2 border-primary-600 rounded-lg hover:bg-primary-50 transition font-medium"
          >
            Get Started
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-900 mb-2">Real-time Monitoring</h3>
            <p className="text-sm text-gray-600">
              See events as they happen across all your Twilio subaccounts in one place.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-900 mb-2">Strict Isolation</h3>
            <p className="text-sm text-gray-600">
              Each subaccount's data is completely isolated with secure workspace switching.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-900 mb-2">No Code Required</h3>
            <p className="text-sm text-gray-600">
              Configure event subscriptions and monitor streams through an intuitive UI.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
