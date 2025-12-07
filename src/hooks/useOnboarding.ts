import { useState, useCallback } from 'react';
import { ChefProfile, StepId, ServiceType, FoodSafetyStatus, KvkStatus, PlanType, LogoMethod, NameMethod } from '@/types/onboarding';

const STEP_ORDER: StepId[] = [
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
  'summary',
];

const initialProfile: ChefProfile = {
  email: '',
  phone: '',
  city: '',
  zipCode: '',
  streetAddress: '',
  country: 'Netherlands',
  restaurantName: '',
  primaryCuisines: [],
  dishTypes: [],
  serviceType: 'unsure',
  availabilityBuckets: [],
  logoGenerationMethod: 'placeholder',
  nameGenerationMethod: 'manual',
  foodSafetyStatus: 'needs_training',
  kvkStatus: 'none',
  plan: 'pro',
  onboardingCompleted: false,
};

export function useOnboarding() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [profile, setProfile] = useState<ChefProfile>(initialProfile);
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set());

  const currentStep = STEP_ORDER[currentStepIndex];
  const totalSteps = STEP_ORDER.length - 2; // Exclude welcome and summary
  const displayStepNumber = Math.max(0, currentStepIndex - 1); // 0-indexed after welcome
  const progress = currentStepIndex > 0 ? ((currentStepIndex - 1) / (totalSteps - 1)) * 100 : 0;

  const updateProfile = useCallback((updates: Partial<ChefProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const markStepComplete = useCallback((stepId: StepId) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  }, []);

  const goToNext = useCallback(() => {
    if (currentStepIndex < STEP_ORDER.length - 1) {
      markStepComplete(currentStep);
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentStepIndex, currentStep, markStepComplete]);

  const goToPrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const canGoNext = currentStepIndex < STEP_ORDER.length - 1;
  const canGoPrevious = currentStepIndex > 0;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEP_ORDER.length - 1;

  return {
    currentStep,
    currentStepIndex,
    displayStepNumber,
    totalSteps,
    progress,
    profile,
    updateProfile,
    completedSteps,
    goToNext,
    goToPrevious,
    canGoNext,
    canGoPrevious,
    isFirstStep,
    isLastStep,
  };
}
