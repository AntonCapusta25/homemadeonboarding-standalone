import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'onboarding_progress';
const SESSION_TOKEN_KEY = 'pending_profile_session_token';

// Map DB enum values back to onboarding values
const foodSafetyMap: Record<string, string> = {
  'have_certificate': 'has_certificate',
  'getting_certificate': 'has_certificate',
  'need_help': 'needs_training',
};

const kvkMap: Record<string, string> = {
  'have_both': 'kvk_nvwa_both',
  'in_progress': 'kvk_only',
  'need_help': 'try_first',
};

const planMap: Record<string, string> = {
  'starter': 'basic',
  'growth': 'pro',
  'pro': 'advanced',
};

const STEP_ORDER = [
  'welcome',
  'city',
  'cuisine',
  'contact',
  'address',
  'business-name',
  'logo',
  'service-type',
  'availability',
  'dish-types',
  'food-safety-status',
  'kvk-nvwa-status',
  'plan',
];

function getResumeStepIndex(profile: any): number {
  if (!profile.city) return 1;
  if (!profile.primaryCuisines?.length) return 2;
  if (!profile.email && !profile.phone) return 3;
  if (!profile.streetAddress) return 4;
  if (!profile.restaurantName) return 5;
  if (!profile.logoUrl) return 6;
  if (profile.serviceType === 'unsure') return 7;
  if (!profile.availabilityBuckets?.length) return 8;
  if (!profile.dishTypes?.length) return 9;
  return 10;
}

export default function Resume() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setErrorMessage('No resume token provided');
      return;
    }

    async function resumeProgress() {
      try {
        // Look up the pending profile by session token
        const { data, error } = await supabase.functions.invoke('lookup-pending-profile-by-token', {
          body: { sessionToken: token },
        });

        if (error || !data?.found) {
          // Fallback: try to find by email if user is logged in
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user?.email) {
            const { data: lookupData } = await supabase.functions.invoke('lookup-pending-profile', {
              body: { email: user.email },
            });

            if (lookupData?.found) {
              restoreProfile(lookupData.profile, lookupData.sessionToken);
              return;
            }
          }

          setStatus('error');
          setErrorMessage('Could not find your progress. The link may have expired.');
          return;
        }

        restoreProfile(data.profile, data.sessionToken);
      } catch (err) {
        console.error('Resume error:', err);
        setStatus('error');
        setErrorMessage('Something went wrong. Please try again.');
      }
    }

    function restoreProfile(profile: any, sessionToken: string) {
      // Convert DB profile to onboarding format
      const nameParts = (profile.chef_name || '').split(' ');
      const addressParts = (profile.address || '').split(',');

      const restoredProfile = {
        email: profile.email || '',
        phone: profile.phone || '',
        city: profile.city || '',
        streetAddress: addressParts[0]?.trim() || '',
        zipCode: addressParts[1]?.trim() || '',
        country: 'Netherlands',
        restaurantName: profile.business_name || '',
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        primaryCuisines: profile.cuisines || [],
        dishTypes: profile.dish_types || [],
        availabilityBuckets: profile.availability || [],
        logoUrl: profile.logo_url || undefined,
        serviceType: profile.service_type || 'unsure',
        foodSafetyStatus: profile.food_safety_status ? foodSafetyMap[profile.food_safety_status] || 'needs_training' : 'needs_training',
        kvkStatus: profile.kvk_status ? kvkMap[profile.kvk_status] || 'try_first' : 'try_first',
        plan: profile.plan ? planMap[profile.plan] || 'advanced' : 'advanced',
        logoGenerationMethod: 'placeholder',
        nameGenerationMethod: 'manual',
        onboardingCompleted: false,
      };

      // Determine step index from current_step or infer from data
      let stepIndex: number;
      if (profile.current_step && STEP_ORDER.includes(profile.current_step)) {
        stepIndex = STEP_ORDER.indexOf(profile.current_step);
      } else {
        stepIndex = getResumeStepIndex(restoredProfile);
      }

      // Save to localStorage
      const progressData = {
        currentStepIndex: stepIndex,
        profile: restoredProfile,
        completedSteps: STEP_ORDER.slice(0, stepIndex),
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(progressData));
      localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);

      setStatus('success');
      toast.success('Welcome back! Restoring your progress...');

      // Redirect to onboarding
      setTimeout(() => {
        navigate('/onboarding', { replace: true });
      }, 500);
    }

    resumeProgress();
  }, [searchParams, navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-soft flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Restoring your progress...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-soft flex flex-col items-center justify-center gap-6 px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">😕</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Link Not Found</h1>
          <p className="text-muted-foreground">{errorMessage}</p>
          <button
            onClick={() => navigate('/onboarding')}
            className="mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Start Fresh
          </button>
        </div>
      </div>
    );
  }

  return null;
}
