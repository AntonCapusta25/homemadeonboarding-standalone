import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { WelcomeStep } from '@/components/onboarding/steps/WelcomeStep';
import { CityStep } from '@/components/onboarding/steps/CityStep';
import { CuisineStep } from '@/components/onboarding/steps/CuisineStep';
import { ContactStep } from '@/components/onboarding/steps/ContactStep';
import { AddressStep } from '@/components/onboarding/steps/AddressStep';
import { BusinessNameStep } from '@/components/onboarding/steps/BusinessNameStep';
import { LogoStep } from '@/components/onboarding/steps/LogoStep';
import { ServiceTypeStep } from '@/components/onboarding/steps/ServiceTypeStep';
import { AvailabilityStep } from '@/components/onboarding/steps/AvailabilityStep';
import { DishTypesStep } from '@/components/onboarding/steps/DishTypesStep';
import { FoodSafetyStep } from '@/components/onboarding/steps/FoodSafetyStep';
import { KvkNvwaStep } from '@/components/onboarding/steps/KvkNvwaStep';
import { PlanStep } from '@/components/onboarding/steps/PlanStep';
import { CongratsStep } from '@/components/onboarding/steps/CongratsStep';
import { ChefProfile } from '@/types/onboarding';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';

const STEPS = [
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
  'food-safety',
  'kvk-nvwa',
  'plan',
  'congrats',
] as const;

type Step = typeof STEPS[number];

const initialProfile: ChefProfile = {
  email: '',
  phone: '',
  firstName: '',
  lastName: '',
  city: '',
  zipCode: '',
  streetAddress: '',
  country: 'Netherlands',
  restaurantName: '',
  nameGenerationMethod: 'manual',
  logoUrl: '',
  logoGenerationMethod: 'ai',
  primaryCuisines: [],
  dishTypes: [],
  serviceType: 'both',
  availabilityBuckets: [],
  foodSafetyStatus: 'has_certificate',
  kvkStatus: 'kvk_nvwa_both',
  plan: 'advanced',
  onboardingCompleted: false,
};

export default function TestOnboarding() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [profile, setProfile] = useState<ChefProfile>(initialProfile);

  const currentStep = STEPS[currentStepIndex];

  const updateProfile = (updates: Partial<ChefProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const goToNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const goToStep = (index: number) => {
    setCurrentStepIndex(index);
  };

  const reset = () => {
    setCurrentStepIndex(0);
    setProfile(initialProfile);
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
            firstName={profile.firstName}
            lastName={profile.lastName}
            onChange={(field, value) => updateProfile({ [field]: value })}
            onNext={goToNext}
            onPrevious={goToPrevious}
            onAccountCreated={() => {}}
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
      
      case 'food-safety':
        return (
          <FoodSafetyStep
            value={profile.foodSafetyStatus}
            onChange={(status) => updateProfile({ foodSafetyStatus: status })}
            onNext={goToNext}
            onPrevious={goToPrevious}
          />
        );
      
      case 'kvk-nvwa':
        return (
          <KvkNvwaStep
            value={profile.kvkStatus}
            onChange={(status) => updateProfile({ kvkStatus: status })}
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
      
      case 'congrats':
        return (
          <CongratsStep
            profile={profile}
            onStartFastVerification={() => {}}
            verificationComplete={false}
          />
        );
      
      default:
        return <div>Unknown step: {currentStep}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Test Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-foreground">Test Mode</h1>
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
          
          {/* Step Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevious}
              disabled={currentStepIndex === 0}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            {STEPS.map((step, index) => (
              <Button
                key={step}
                variant={index === currentStepIndex ? 'default' : 'outline'}
                size="sm"
                onClick={() => goToStep(index)}
                className="text-xs whitespace-nowrap"
              >
                {index + 1}. {step}
              </Button>
            ))}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNext}
              disabled={currentStepIndex === STEPS.length - 1}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Current Profile State (Debug) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border p-3 max-h-40 overflow-y-auto">
        <details className="text-xs">
          <summary className="cursor-pointer font-semibold text-foreground">Profile State</summary>
          <pre className="mt-2 text-muted-foreground overflow-x-auto">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </details>
      </div>

      {/* Step Content */}
      <div className="pt-32 pb-48">
        {renderStep()}
      </div>
    </div>
  );
}
