import { useState, useCallback, useEffect } from 'react';
import { ChefProfile, StepId, ServiceType, FoodSafetyStatus, KvkStatus, PlanType, LogoMethod, NameMethod } from '@/types/onboarding';

const STORAGE_KEY = 'onboarding_progress';

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
  kvkStatus: 'try_first',
  plan: 'advanced',
  onboardingCompleted: false,
};

interface SavedProgress {
  currentStepIndex: number;
  profile: ChefProfile;
  completedSteps: StepId[];
  savedAt: string;
}

function loadSavedProgress(): SavedProgress | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as SavedProgress;
      // Check if saved data is less than 7 days old
      const savedDate = new Date(parsed.savedAt);
      const now = new Date();
      const daysDiff = (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < 7) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load onboarding progress:', e);
  }
  return null;
}

function saveProgress(currentStepIndex: number, profile: ChefProfile, completedSteps: Set<StepId>) {
  try {
    const data: SavedProgress = {
      currentStepIndex,
      profile,
      completedSteps: Array.from(completedSteps),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save onboarding progress:', e);
  }
}

export function clearOnboardingProgress() {
  localStorage.removeItem(STORAGE_KEY);
}

export function useOnboarding() {
  const savedProgress = loadSavedProgress();
  
  const [currentStepIndex, setCurrentStepIndex] = useState(savedProgress?.currentStepIndex ?? 0);
  const [profile, setProfile] = useState<ChefProfile>(savedProgress?.profile ?? initialProfile);
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(
    new Set(savedProgress?.completedSteps ?? [])
  );

  const currentStep = STEP_ORDER[currentStepIndex];
  const totalSteps = STEP_ORDER.length - 2; // Exclude welcome and summary
  const displayStepNumber = Math.max(0, currentStepIndex - 1); // 0-indexed after welcome
  const progress = currentStepIndex > 0 ? ((currentStepIndex - 1) / (totalSteps - 1)) * 100 : 0;

  // Save progress whenever it changes
  useEffect(() => {
    // Don't save if on welcome step or completed
    if (currentStepIndex > 0) {
      saveProgress(currentStepIndex, profile, completedSteps);
    }
  }, [currentStepIndex, profile, completedSteps]);

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

  const resetProgress = useCallback(() => {
    clearOnboardingProgress();
    setCurrentStepIndex(0);
    setProfile(initialProfile);
    setCompletedSteps(new Set());
  }, []);

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
    resetProgress,
  };
}
