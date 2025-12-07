import { useOnboarding } from '@/hooks/useOnboarding';
import { ProgressBar } from './ProgressBar';
import { WelcomeStep } from './steps/WelcomeStep';
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
import { toast } from '@/hooks/use-toast';

export function OnboardingWizard() {
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

  const handleGoToDashboard = () => {
    toast({
      title: "Welcome aboard! 🎉",
      description: "Your chef profile has been created. Redirecting to dashboard...",
    });
  };

  const handleBookCall = () => {
    toast({
      title: "Call booking",
      description: "Opening call scheduling page...",
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep onStart={goToNext} />;
      
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
            onChange={(name, method) => updateProfile({ restaurantName: name, nameGenerationMethod: method })}
            onNext={goToNext}
            onPrevious={goToPrevious}
          />
        );
      
      case 'logo':
        return (
          <LogoStep
            restaurantName={profile.restaurantName}
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
            onGoToDashboard={handleGoToDashboard}
            onBookCall={handleBookCall}
          />
        );
      
      default:
        return null;
    }
  };

  const showProgress = !isFirstStep && !isLastStep;

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {showProgress && (
          <div className="mb-8 animate-fade-in">
            <ProgressBar
              progress={progress}
              currentStep={displayStepNumber}
              totalSteps={totalSteps}
            />
          </div>
        )}

        <div className="min-h-[calc(100vh-12rem)]">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
