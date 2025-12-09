import { useEffect, useRef, useCallback } from 'react';
import { ChefProfile } from '@/types/onboarding';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface AbandonmentTrackingProps {
  profile: ChefProfile;
  currentStep: string;
  isOnboardingComplete: boolean;
}

export function useAbandonmentTracking({
  profile,
  currentStep,
  isOnboardingComplete,
}: AbandonmentTrackingProps) {
  const hasTriggeredRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use sendBeacon for reliable delivery on page unload
  const sendAbandonmentBeacon = useCallback(() => {
    if (hasTriggeredRef.current || isOnboardingComplete) return;
    if (!profile.email && !profile.phone) return;
    
    // Include 'contact' step - once user enters email/phone, we want to track them
    const progressedSteps = ['contact', 'address', 'business-name', 'logo', 'service-type', 'availability', 'dish-types', 'food-safety-status', 'kvk-nvwa-status', 'plan'];
    if (!progressedSteps.includes(currentStep)) return;

    hasTriggeredRef.current = true;

    const payload = JSON.stringify({
      type: 'abandonment',
      chefName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Unknown',
      email: profile.email || 'Not provided',
      phone: profile.phone,
      city: profile.city,
    });

    // Use sendBeacon for reliable delivery when page is closing
    const url = `${SUPABASE_URL}/functions/v1/send-notification-email`;
    const blob = new Blob([payload], { type: 'application/json' });
    
    // sendBeacon doesn't support custom headers, so we use fetch with keepalive as fallback
    const success = navigator.sendBeacon(url, blob);
    
    if (!success) {
      // Fallback to fetch with keepalive for browsers that don't support sendBeacon well
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Silently fail - we tried our best
      });
    }
    
    console.log('Abandonment notification sent via beacon');
  }, [profile, currentStep, isOnboardingComplete]);

  // Regular async send for timeouts (not page unload)
  const sendAbandonmentAsync = useCallback(async () => {
    if (hasTriggeredRef.current || isOnboardingComplete) return;
    if (!profile.email && !profile.phone) return;
    
    const progressedSteps = ['contact', 'address', 'business-name', 'logo', 'service-type', 'availability', 'dish-types', 'food-safety-status', 'kvk-nvwa-status', 'plan'];
    if (!progressedSteps.includes(currentStep)) return;

    hasTriggeredRef.current = true;

    try {
      console.log('Sending abandonment notification...');
      const url = `${SUPABASE_URL}/functions/v1/send-notification-email`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          type: 'abandonment',
          chefName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Unknown',
          email: profile.email || 'Not provided',
          phone: profile.phone,
          city: profile.city,
        }),
      });
      console.log('Abandonment notification sent');
    } catch (error) {
      console.error('Failed to send abandonment email:', error);
    }
  }, [profile, currentStep, isOnboardingComplete]);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set up inactivity timeout (5 minutes)
    timeoutRef.current = setTimeout(() => {
      sendAbandonmentAsync();
    }, 5 * 60 * 1000);

    // Handle page unload/close - use beacon for reliability
    const handleBeforeUnload = () => {
      sendAbandonmentBeacon();
    };

    // Handle visibility change (tab switch/minimize)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Start a shorter timeout when user leaves the tab
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          sendAbandonmentAsync();
        }, 2 * 60 * 1000); // 2 minutes when tab is hidden
      } else {
        // Clear timeout when user comes back
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        // Restart the 5-minute timeout
        timeoutRef.current = setTimeout(() => {
          sendAbandonmentAsync();
        }, 5 * 60 * 1000);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sendAbandonmentBeacon, sendAbandonmentAsync]);

  // Reset the triggered flag when onboarding completes
  useEffect(() => {
    if (isOnboardingComplete) {
      hasTriggeredRef.current = true; // Prevent any future sends
    }
  }, [isOnboardingComplete]);
}
