// OAuth utility functions

/**
 * Check if Google OAuth is configured on the backend
 */
export async function isGoogleOAuthEnabled(): Promise<boolean> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/api/auth/google`, {
      method: 'HEAD',
      redirect: 'manual', // Don't follow redirects
    });

    // If status is 503, OAuth is not configured
    // If status is 302, OAuth is configured (redirect to Google)
    return response.status !== 503;
  } catch (error) {
    // If there's an error, assume OAuth is not configured
    console.warn('Failed to check OAuth status:', error);
    return false;
  }
}

/**
 * Initiate Google OAuth login flow
 */
export function initiateGoogleLogin(): void {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const currentUrl = window.location.origin;
  window.location.href = `${apiUrl}/api/auth/google?redirect=${encodeURIComponent(currentUrl)}`;
}
