import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding, clearOnboardingProgress } from '@/hooks/useOnboarding';
import { useAuth } from '@/hooks/useAuth';
import { useAbandonmentTracking } from '@/hooks/useAbandonmentTracking';
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
import { SummaryStep } from './steps/SummaryStep'; // Keep import for potential future use
import { MagicLinkSentStep } from './steps/MagicLinkSentStep';
import { CongratsStep } from './steps/CongratsStep';
import { FastVerificationFlow } from './steps/FastVerificationFlow';
import { MenuGeneratingIndicator } from './MenuGeneratingIndicator';
import { ContactButtons } from './ContactButtons';
import { Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);
  const [resending, setResending] = useState(false);
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showFastVerification, setShowFastVerification] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [isGeneratingMenu, setIsGeneratingMenu] = useState(false);
  
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

  // Track abandonment
  useAbandonmentTracking({
    profile,
    currentStep,
    isOnboardingComplete: showCongrats || verificationComplete,
  });

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
          setShowCongrats(true);
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
      // User is already logged in (account created at contact step)
      // Now we need to create/update the chef_profile from pending_profile data
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Create or update chef profile
        const profileData = {
          user_id: user.id,
          contact_email: profile.email,
          contact_phone: profile.phone,
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
          onboarding_completed: true,
        };

        const { data: chefProfile, error: upsertError } = await supabase
          .from('chef_profiles')
          .upsert(profileData, { 
            onConflict: 'user_id',
            ignoreDuplicates: false 
          })
          .select('id')
          .single();

        if (upsertError) {
          console.error('Error saving chef profile:', upsertError);
          toast.error('Failed to save profile. Please try again.');
          setSaving(false);
          return;
        }

        // Generate and save menu to database
        if (chefProfile) {
          try {
            setIsGeneratingMenu(true);
            const { data: menuData, error: menuError } = await supabase.functions.invoke('generate-menu', {
              body: {
                city: profile.city,
                cuisines: profile.primaryCuisines,
                dishTypes: profile.dishTypes,
                serviceType: profile.serviceType,
                restaurantName: profile.restaurantName,
                chefName: profile.firstName
              }
            });

            if (!menuError && menuData?.menu) {
              // Save menu to database
              // First, deactivate any existing active menus
              await supabase
                .from('menus')
                .update({ is_active: false })
                .eq('chef_profile_id', chefProfile.id);

              // Create the new menu
              const { data: savedMenu, error: saveMenuError } = await supabase
                .from('menus')
                .insert({
                  chef_profile_id: chefProfile.id,
                  summary: menuData.menu.summary,
                  average_margin: menuData.menu.avgMargin,
                  is_active: true,
                })
                .select()
                .single();

              if (!saveMenuError && savedMenu) {
                // Insert all dishes
                const dishesToInsert = menuData.menu.dishes.map((dish: any, index: number) => ({
                  menu_id: savedMenu.id,
                  name: dish.name,
                  description: dish.description,
                  price: dish.price,
                  estimated_cost: dish.estimatedCost,
                  margin: dish.margin,
                  category: dish.category || null,
                  restaurant_comparison_price: dish.restaurantPrice || null,
                  is_upsell: false,
                  sort_order: index,
                }));

                // Add upsells
                if (menuData.menu.upsells) {
                  menuData.menu.upsells.forEach((upsell: any, index: number) => {
                    const upsellCategory = upsell.type === 'extra' ? 'side' : upsell.type;
                    dishesToInsert.push({
                      menu_id: savedMenu.id,
                      name: upsell.name,
                      description: null,
                      price: upsell.price,
                      estimated_cost: null,
                      margin: null,
                      category: upsellCategory || null,
                      restaurant_comparison_price: null,
                      is_upsell: true,
                      sort_order: menuData.menu.dishes.length + index,
                    });
                  });
                }

                await supabase.from('dishes').insert(dishesToInsert);
                
                // Show success toast
                toast.success(t('onboarding.menuGeneratedSuccess', 'Your personalized menu is ready! 🎉'));
              }
            }
          } catch (menuErr) {
            console.error('Failed to generate/save menu:', menuErr);
            // Continue anyway - menu can be created later
          } finally {
            setIsGeneratingMenu(false);
          }
        }

        // Delete pending profile if exists
        if (profile.email) {
          await supabase
            .from('pending_profiles')
            .delete()
            .eq('email', profile.email);
        }
      }

      // Clear localStorage progress
      clearOnboardingProgress();
      
      // Show congrats screen instead of redirecting
      setShowCongrats(true);
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

  // Show fast verification flow
  if (showFastVerification) {
    return (
      <FastVerificationFlow
        profile={profile}
        onUpdateProfile={updateProfile}
        onComplete={() => {
          // Fast verification complete - show congrats with verification complete flag
          setShowFastVerification(false);
          setVerificationComplete(true);
          setShowCongrats(true);
        }}
      />
    );
  }

  // Show congrats screen
  if (showCongrats) {
    return (
      <CongratsStep
        profile={profile}
        onStartFastVerification={() => setShowFastVerification(true)}
        verificationComplete={verificationComplete}
      />
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
            onAccountCreated={(userId) => {
              console.log('Account created with ID:', userId);
              // Account is now created, user is logged in
            }}
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
            onNext={handleCompleteOnboarding}
            onPrevious={goToPrevious}
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
        {/* Header with logo and language selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Logo chefLogo={profile.logoUrl} size="sm" />
            <LanguageSelector />
          </div>
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                clearOnboardingProgress();
                window.location.href = '/onboarding';
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('auth.signOut', 'Logout')}
            </Button>
          )}
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
      
      {/* Menu generation indicator */}
      <MenuGeneratingIndicator isVisible={isGeneratingMenu} />
      
      {/* Contact buttons */}
      <ContactButtons />
    </div>
  );
}
