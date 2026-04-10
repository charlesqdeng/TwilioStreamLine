'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    const error = searchParams.get('error');

    if (error) {
      // OAuth failed or was cancelled
      const errorMessages: Record<string, string> = {
        oauth_failed: 'Authentication failed. Please try again.',
        oauth_cancelled: 'Authentication was cancelled.',
      };

      const errorMessage = errorMessages[error] || 'An error occurred during authentication.';
      router.push(`/login?error=${encodeURIComponent(errorMessage)}`);
      return;
    }

    if (token && email) {
      // OAuth success - login the user
      const user = {
        email: decodeURIComponent(email),
        id: '', // We'll get this from /api/auth/me
      };

      login(user, token);
      router.push('/dashboard');
    } else {
      // Missing parameters
      router.push('/login?error=Invalid+authentication+response');
    }
  }, [searchParams, router, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-700 text-lg">Completing sign in...</p>
      </div>
    </div>
  );
}
