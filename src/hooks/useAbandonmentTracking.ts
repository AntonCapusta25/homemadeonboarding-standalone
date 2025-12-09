import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChefProfile } from '@/types/onboarding';

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

  const sendAbandonmentEmail = useCallback(async () => {
    // Don't send if already sent, or if user completed onboarding, or if no contact info
    if (hasTriggeredRef.current || isOnboardingComplete) return;
    if (!profile.email && !profile.phone) return;
    
    // Only send if user has progressed past the first few steps
    const progressedSteps = ['address', 'business-name', 'logo', 'service-type', 'availability', 'dish-types', 'food-safety-status', 'kvk-nvwa-status', 'plan'];
    if (!progressedSteps.includes(currentStep)) return;

    hasTriggeredRef.current = true;

    try {
      console.log('Sending abandonment notification...');
      await supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'abandonment',
          chefName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Unknown',
          email: profile.email || 'Not provided',
          phone: profile.phone,
          city: profile.city,
        },
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
      sendAbandonmentEmail();
    }, 5 * 60 * 1000);

    // Handle page unload/close
    const handleBeforeUnload = () => {
      sendAbandonmentEmail();
    };

    // Handle visibility change (tab switch/minimize)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Start a shorter timeout when user leaves the tab
        timeoutRef.current = setTimeout(() => {
          sendAbandonmentEmail();
        }, 2 * 60 * 1000); // 2 minutes when tab is hidden
      } else {
        // Clear timeout when user comes back
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
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
  }, [sendAbandonmentEmail]);

  // Reset the triggered flag when onboarding completes
  useEffect(() => {
    if (isOnboardingComplete) {
      hasTriggeredRef.current = true; // Prevent any future sends
    }
  }, [isOnboardingComplete]);
}
