import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding, clearOnboardingProgress } from '@/hooks/useOnboarding';
import { useChefProfile } from '@/hooks/useChefProfile';
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
import { CongratsStep } from './steps/CongratsStep';
import { Loader2 } from 'lucide-react';

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile: dbProfile, loading: profileLoading, hasCompletedOnboarding, createProfile } = useChefProfile();
  const [saving, setSaving] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  
  const {
    currentStep,
    displayStepNumber,
    totalSteps,
    progress,
    profile,
    updateProfile,
    goToNext,
    goToPrevious,
    isFirstStep,
    isLastStep,
  } = useOnboarding();

  // Redirect to dashboard if already completed onboarding
  useEffect(() => {
    if (!authLoading && !profileLoading && hasCompletedOnboarding) {
      navigate('/dashboard');
    }
  }, [authLoading, profileLoading, hasCompletedOnboarding, navigate]);

  const handleCompleteOnboarding = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setSaving(true);
    try {
      // Save to database
      const savedProfile = await createProfile(profile);
      if (savedProfile) {
        // Clear localStorage onboarding progress
        clearOnboardingProgress();
        // Also save to localStorage for dashboard to use generated menu
        localStorage.setItem('chefProfile', JSON.stringify(profile));
        // Show congrats screen
        setShowCongrats(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const handleBookCall = () => {
    window.open('https://calendly.com', '_blank');
  };

  // Show loading while checking auth/profile status
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show congrats screen after successful save
  if (showCongrats) {
    return <CongratsStep profile={profile} onGoToDashboard={handleGoToDashboard} />;
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
            onBookCall={handleBookCall}
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
