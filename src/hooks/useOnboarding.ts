import { useState, useCallback, useEffect, useRef } from 'react';
import { ChefProfile, StepId, ServiceType, FoodSafetyStatus, KvkStatus, PlanType, LogoMethod, NameMethod } from '@/types/onboarding';
import { supabase } from '@/integrations/supabase/client';
import { DbChefProfile } from './useChefProfile';

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

// Helper to convert DB profile to onboarding profile format
function dbProfileToOnboarding(dbProfile: DbChefProfile): Partial<ChefProfile> {
  const nameParts = (dbProfile.chef_name || '').split(' ');
  return {
    email: dbProfile.contact_email || '',
    phone: dbProfile.contact_phone || '',
    city: dbProfile.city || '',
    streetAddress: dbProfile.address?.split(',')[0] || '',
    restaurantName: dbProfile.business_name || '',
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    primaryCuisines: dbProfile.cuisines || [],
    dishTypes: dbProfile.dish_types || [],
    availabilityBuckets: dbProfile.availability || [],
    logoUrl: dbProfile.logo_url || undefined,
    serviceType: dbProfile.service_type || 'unsure',
  };
}

// Determine step index based on what data is already filled
function getResumeStepIndex(profile: ChefProfile): number {
  if (!profile.city) return 1; // city step
  if (profile.primaryCuisines.length === 0) return 2; // cuisine
  if (!profile.email && !profile.phone) return 3; // contact
  if (!profile.streetAddress) return 4; // address
  if (!profile.restaurantName) return 5; // business-name
  if (!profile.logoUrl) return 6; // logo
  if (profile.serviceType === 'unsure') return 7; // service-type
  if (profile.availabilityBuckets.length === 0) return 8; // availability
  if (profile.dishTypes.length === 0) return 9; // dish-types
  return 10; // food-safety-status or later
}

// Map onboarding types to DB enum values
function mapFoodSafetyStatus(status: string): 'have_certificate' | 'getting_certificate' | 'need_help' {
  const map: Record<string, 'have_certificate' | 'getting_certificate' | 'need_help'> = {
    'has_certificate': 'have_certificate',
    'needs_training': 'need_help',
  };
  return map[status] || 'need_help';
}

function mapKvkStatus(status: string): 'have_both' | 'in_progress' | 'need_help' {
  const map: Record<string, 'have_both' | 'in_progress' | 'need_help'> = {
    'kvk_nvwa_both': 'have_both',
    'kvk_only': 'in_progress',
    'none': 'need_help',
    'try_first': 'need_help',
  };
  return map[status] || 'need_help';
}

function mapPlanType(plan: string): 'starter' | 'growth' | 'pro' {
  const map: Record<string, 'starter' | 'growth' | 'pro'> = {
    'basic': 'starter',
    'pro': 'growth',
    'advanced': 'pro',
    'auto_recommend': 'starter',
  };
  return map[plan] || 'starter';
}

export function useOnboarding() {
  const savedProgress = loadSavedProgress();
  const [dbLoaded, setDbLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [currentStepIndex, setCurrentStepIndex] = useState(savedProgress?.currentStepIndex ?? 0);
  const [profile, setProfile] = useState<ChefProfile>(savedProgress?.profile ?? initialProfile);
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(
    new Set(savedProgress?.completedSteps ?? [])
  );
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);

  // Save to pending_profiles table (debounced)
  const saveToDatabase = useCallback(async (profileData: ChefProfile, step: StepId) => {
    if (!profileData.email) return; // Only save after email is provided

    try {
      const dbData = {
        email: profileData.email,
        phone: profileData.phone || null,
        chef_name: `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() || null,
        business_name: profileData.restaurantName || null,
        city: profileData.city || null,
        address: profileData.streetAddress 
          ? `${profileData.streetAddress}, ${profileData.zipCode || ''}, ${profileData.city || ''}, ${profileData.country || ''}`
          : null,
        cuisines: profileData.primaryCuisines || [],
        dish_types: profileData.dishTypes || [],
        availability: profileData.availabilityBuckets || [],
        service_type: (profileData.serviceType || 'unsure') as 'delivery' | 'pickup' | 'both' | 'unsure',
        food_safety_status: profileData.foodSafetyStatus ? mapFoodSafetyStatus(profileData.foodSafetyStatus) : null,
        kvk_status: profileData.kvkStatus ? mapKvkStatus(profileData.kvkStatus) : null,
        plan: profileData.plan ? mapPlanType(profileData.plan) : 'starter',
        logo_url: profileData.logoUrl || null,
        current_step: step,
      };

      // Check if profile already exists for this email
      const { data: existing } = await supabase
        .from('pending_profiles')
        .select('id')
        .eq('email', profileData.email)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('pending_profiles')
          .update(dbData)
          .eq('id', existing.id);
        setPendingProfileId(existing.id);
      } else {
        const { data } = await supabase
          .from('pending_profiles')
          .insert(dbData)
          .select('id')
          .single();
        if (data) setPendingProfileId(data.id);
      }
    } catch (error) {
      console.error('Error saving to pending_profiles:', error);
    }
  }, []);

  // Load progress from database on mount
  useEffect(() => {
    async function loadFromDb() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setDbLoaded(true);
          return;
        }

        const { data: dbProfile } = await supabase
          .from('chef_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (dbProfile && !savedProgress) {
          // User has DB data but no local progress - resume from DB
          const restoredProfile = { ...initialProfile, ...dbProfileToOnboarding(dbProfile) };
          const resumeIndex = getResumeStepIndex(restoredProfile);
          
          setProfile(restoredProfile);
          setCurrentStepIndex(resumeIndex);
          
          // Mark completed steps up to resume point
          const completed = STEP_ORDER.slice(0, resumeIndex);
          setCompletedSteps(new Set(completed));
        }
      } catch (err) {
        console.error('Failed to load onboarding from DB:', err);
      } finally {
        setDbLoaded(true);
      }
    }
    
    loadFromDb();
  }, []);

  const currentStep = STEP_ORDER[currentStepIndex];
  const totalSteps = STEP_ORDER.length - 2; // Exclude welcome and summary
  const displayStepNumber = Math.max(0, currentStepIndex - 1); // 0-indexed after welcome
  // Cap progress at 100% (summary step would otherwise go over)
  const progress = currentStepIndex > 0 ? Math.min(100, ((currentStepIndex - 1) / (totalSteps - 1)) * 100) : 0;

  // Save progress whenever it changes
  useEffect(() => {
    // Don't save if on welcome step or completed or not loaded from DB yet
    if (currentStepIndex > 0 && dbLoaded) {
      saveProgress(currentStepIndex, profile, completedSteps);
      
      // Debounced save to database
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveToDatabase(profile, currentStep);
      }, 1000);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentStepIndex, profile, completedSteps, dbLoaded, currentStep, saveToDatabase]);

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

  // Immediately save to DB (used on step completion)
  const saveStepToDatabase = useCallback(async () => {
    if (profile.email) {
      await saveToDatabase(profile, currentStep);
    }
  }, [profile, currentStep, saveToDatabase]);

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
    dbLoaded,
    pendingProfileId,
    saveStepToDatabase,
  };
}
