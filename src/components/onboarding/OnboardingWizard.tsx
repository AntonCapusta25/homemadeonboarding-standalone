import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding, clearOnboardingProgress } from '@/hooks/useOnboarding';
import { useAuth } from '@/hooks/useAuth';
import { ProgressBar } from './ProgressBar';
import { Logo } from '@/components/Logo';
import { CityStep } from './steps/CityStep';
import { CuisineStep } from './steps/CuisineStep';
import { ContactStep } from './steps/ContactStep';
import { AddressStep } from './steps/AddressStep';
import { BusinessNameStep } from './steps/BusinessNameStep';
import { LogoStep } from './steps/LogoStep';
import { ServiceTypeStep } from './steps/ServiceTypeStep';
import { AvailabilityStep } from './steps/AvailabilityStep';
import { DishTypesStep } from './steps/DishTypesStep';
import { FoodSafetyStep } from './steps/FoodSafetyStep';
import { KvkNvwaStep } from './steps/KvkNvwaStep';
import { PlanStep } from './steps/PlanStep';
import { SummaryStep } from './steps/SummaryStep';
import { MagicLinkSentStep } from './steps/MagicLinkSentStep';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);
  const [resending, setResending] = useState(false);
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);
  
  const {
    currentStep,
    displayStepNumber,
    totalSteps,
    progress,
    profile,
    updateProfile,
    goToNext,
    goToPrevious,
    dbLoaded,
  } = useOnboarding();

  // If user is already logged in and has completed onboarding, redirect to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      // Check if user has completed onboarding
      const checkOnboarding = async () => {
        const { data } = await supabase
          .from('chef_profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data?.onboarding_completed) {
          navigate('/dashboard');
        }
      };
      checkOnboarding();
    }
  }, [authLoading, user, navigate]);

  // Map onboarding types to DB enum values
  const mapFoodSafetyStatus = (status: string) => {
    const map: Record<string, 'have_certificate' | 'getting_certificate' | 'need_help'> = {
      'has_certificate': 'have_certificate',
      'needs_training': 'need_help',
    };
    return map[status] || 'need_help';
  };

  const mapKvkStatus = (status: string) => {
    const map: Record<string, 'have_both' | 'in_progress' | 'need_help'> = {
      'kvk_nvwa_both': 'have_both',
      'kvk_only': 'in_progress',
      'none': 'need_help',
      'try_first': 'need_help',
    };
    return map[status] || 'need_help';
  };

  const mapPlanType = (plan: string) => {
    const map: Record<string, 'starter' | 'growth' | 'pro'> = {
      'basic': 'starter',
      'pro': 'growth',
      'advanced': 'pro',
      'auto_recommend': 'starter',
    };
    return map[plan] || 'starter';
  };

  // Save pending profile to database
  const savePendingProfile = async (): Promise<string | null> => {
    try {
      const profileData = {
        phone: profile.phone,
        chef_name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
        business_name: profile.restaurantName,
        city: profile.city,
        address: `${profile.streetAddress || ''}, ${profile.zipCode || ''}, ${profile.city || ''}, ${profile.country || ''}`,
        cuisines: profile.primaryCuisines,
        dish_types: profile.dishTypes,
        availability: profile.availabilityBuckets,
        service_type: profile.serviceType as 'delivery' | 'pickup' | 'both' | 'unsure',
        food_safety_status: mapFoodSafetyStatus(profile.foodSafetyStatus),
        kvk_status: mapKvkStatus(profile.kvkStatus),
        plan: mapPlanType(profile.plan),
        logo_url: profile.logoUrl,
      };

      // Check if profile already exists for this email
      const { data: existing } = await supabase
        .from('pending_profiles')
        .select('id')
        .eq('email', profile.email)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('pending_profiles')
          .update(profileData)
          .eq('id', existing.id);

        if (error) throw error;
        return existing.id;
      }

      // Insert new
      const { data, error } = await supabase
        .from('pending_profiles')
        .insert({
          email: profile.email,
          ...profileData,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error: any) {
      console.error('Error saving pending profile:', error);
      toast.error('Failed to save your profile. Please try again.');
      return null;
    }
  };

  const handleCompleteOnboarding = async () => {
    setSaving(true);
    try {
      // Save pending profile first
      const profileId = await savePendingProfile();
      if (!profileId) {
        setSaving(false);
        return;
      }
      setPendingProfileId(profileId);

      // Call edge function to create account and send magic link
      // Use production URL for magic link redirect
      const redirectTo = 'https://chef-craft-flow.lovable.app/summary';
      
      const { data, error } = await supabase.functions.invoke('create-chef-account', {
        body: {
          email: profile.email,
          pendingProfileId: profileId,
          redirectTo,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Failed to create account. Please try again.');
        setSaving(false);
        return;
      }

      // Clear localStorage progress
      clearOnboardingProgress();
      
      // Show magic link sent screen
      setIsNewUser(data.isNewUser);
      setMagicLinkSent(true);
      
      toast.success('Check your email for the magic link!');
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResendMagicLink = async () => {
    if (!pendingProfileId) return;
    
    setResending(true);
    try {
      // Use production URL for magic link redirect
      const redirectTo = 'https://chef-craft-flow.lovable.app/summary';
      
      const { error } = await supabase.functions.invoke('create-chef-account', {
        body: {
          email: profile.email,
          pendingProfileId,
          redirectTo,
        },
      });

      if (error) {
        toast.error('Failed to resend. Please try again.');
      } else {
        toast.success('Magic link sent again!');
      }
    } catch (error) {
      toast.error('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Show loading while checking DB
  if (!dbLoaded) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show magic link sent screen
  if (magicLinkSent) {
    return (
      <MagicLinkSentStep
        email={profile.email}
        isNewUser={isNewUser}
        onResend={handleResendMagicLink}
        resending={resending}
      />
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        // Skip welcome step since we have a landing page now
        goToNext();
        return null;
      
      case 'city':
        return (
          <CityStep
            value={profile.city}
            onChange={(city) => updateProfile({ city })}
            onNext={goToNext}
            onPrevious={goToPrevious}
          />
        );
      
      case 'cuisine':
        return (
          <CuisineStep
            value={profile.primaryCuisines}
            onChange={(cuisines) => updateProfile({ primaryCuisines: cuisines })}
            onNext={goToNext}
            onPrevious={goToPrevious}
          />
        );
      
      case 'contact':
        return (
          <ContactStep
            email={profile.email}
            phone={profile.phone}
            firstName={profile.firstName}
            lastName={profile.lastName}
            onChange={(field, value) => updateProfile({ [field]: value })}
            onNext={goToNext}
            onPrevious={goToPrevious}
          />
        );
      
      case 'address':
        return (
          <AddressStep
            zipCode={profile.zipCode || ''}
            streetAddress={profile.streetAddress}
            city={profile.city}
            country={profile.country}
            onChange={(field, value) => updateProfile({ [field]: value })}
            onNext={goToNext}
            onPrevious={goToPrevious}
          />
        );
      
      case 'business-name':
        return (
          <BusinessNameStep
            value={profile.restaurantName}
            city={profile.city}
            cuisines={profile.primaryCuisines}
            chefName={profile.firstName}
            onChange={(name, method) => updateProfile({ restaurantName: name, nameGenerationMethod: method })}
            onNext={goToNext}
            onPrevious={goToPrevious}
          />
        );
      
      case 'logo':
        return (
          <LogoStep
            restaurantName={profile.restaurantName}
            cuisines={profile.primaryCuisines}
            chefName={profile.firstName}
            logoUrl={profile.logoUrl}
            method={profile.logoGenerationMethod}
            onChange={(url, method) => updateProfile({ logoUrl: url, logoGenerationMethod: method })}
            onNext={goToNext}
            onPrevious={goToPrevious}
          />
        );
      
      case 'service-type':
        return (
          <ServiceTypeStep
            value={profile.serviceType}
            onChange={(type) => updateProfile({ serviceType: type })}
            onNext={goToNext}
            onPrevious={goToPrevious}
          />
        );
      
      case 'availability':
        return (
          <AvailabilityStep
            value={profile.availabilityBuckets}
            onChange={(availability) => updateProfile({ availabilityBuckets: availability })}
            onNext={goToNext}
            onPrevious={goToPrevious}
          />
        );
      
      case 'dish-types':
        return (
          <DishTypesStep
            value={profile.dishTypes}
            onChange={(types) => updateProfile({ dishTypes: types })}
            onNext={goToNext}
            onPrevious={goToPrevious}
          />
        );
      
      case 'food-safety-status':
        return (
          <FoodSafetyStep
            value={profile.foodSafetyStatus}
            certificateUrl={profile.haccpCertificateUrl}
            onChange={(status, url) => updateProfile({ foodSafetyStatus: status, haccpCertificateUrl: url })}
            onNext={goToNext}
            onPrevious={goToPrevious}
          />
        );
      
      case 'kvk-nvwa-status':
        return (
          <KvkNvwaStep
            value={profile.kvkStatus}
            docsUrl={profile.kvkDocsUrl}
            onChange={(status, url) => updateProfile({ kvkStatus: status, kvkDocsUrl: url })}
            onNext={goToNext}
            onPrevious={goToPrevious}
          />
        );
      
      case 'plan':
        return (
          <PlanStep
            value={profile.plan}
            onChange={(plan) => updateProfile({ plan })}
            onNext={goToNext}
            onPrevious={goToPrevious}
          />
        );
      
      case 'summary':
        return (
          <SummaryStep
            profile={profile}
            onComplete={handleCompleteOnboarding}
            onBookCall={() => window.open('https://calendly.com', '_blank')}
            onUpdateProfile={updateProfile}
            saving={saving}
          />
        );
      
      default:
        return null;
    }
  };

  // Calculate progress excluding welcome step
  const showProgress = currentStep !== 'welcome';
  const adjustedProgress = currentStep === 'welcome' ? 0 : progress;

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header with logo */}
        <div className="flex items-center justify-between mb-6">
          <Logo chefLogo={profile.logoUrl} size="sm" />
        </div>

        {showProgress && (
          <div className="mb-8 animate-fade-in">
            <ProgressBar
              progress={adjustedProgress}
              currentStep={displayStepNumber}
              totalSteps={totalSteps}
            />
          </div>
        )}

        <div className="min-h-[calc(100vh-16rem)]">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
