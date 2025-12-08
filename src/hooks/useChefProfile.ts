import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ChefProfile as OnboardingChefProfile } from '@/types/onboarding';
import { toast } from '@/hooks/use-toast';

export interface DbChefProfile {
  id: string;
  user_id: string;
  business_name: string | null;
  chef_name: string | null;
  city: string | null;
  address: string | null;
  cuisines: string[] | null;
  dish_types: string[] | null;
  availability: string[] | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  service_type: 'delivery' | 'pickup' | 'both' | 'unsure' | null;
  food_safety_status: 'have_certificate' | 'getting_certificate' | 'need_help' | null;
  kvk_status: 'have_both' | 'in_progress' | 'need_help' | null;
  plan: 'starter' | 'growth' | 'pro' | null;
  onboarding_completed: boolean | null;
  created_at: string;
  updated_at: string;
}

// Map onboarding types to database enum types
function mapFoodSafetyStatus(status: string): 'have_certificate' | 'getting_certificate' | 'need_help' {
  if (status === 'has_certificate') return 'have_certificate';
  return 'need_help';
}

function mapKvkStatus(status: string): 'have_both' | 'in_progress' | 'need_help' {
  if (status === 'kvk_nvwa_both') return 'have_both';
  if (status === 'kvk_only') return 'in_progress';
  if (status === 'none' || status === 'try_first') return 'need_help';
  return 'need_help';
}

function mapPlanType(plan: string): 'starter' | 'growth' | 'pro' {
  if (plan === 'basic' || plan === 'starter') return 'starter';
  if (plan === 'advanced' || plan === 'growth') return 'growth';
  if (plan === 'pro') return 'pro';
  return 'starter';
}

export function useChefProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<DbChefProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chef_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching chef profile:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchProfile();
    }
  }, [authLoading, fetchProfile]);

  const saveProgress = useCallback(async (onboardingData: OnboardingChefProfile, completed: boolean = false) => {
    if (!user) {
      return null;
    }

    try {
      const profileData = {
        user_id: user.id,
        business_name: onboardingData.restaurantName || null,
        chef_name: `${onboardingData.firstName || ''} ${onboardingData.lastName || ''}`.trim() || null,
        city: onboardingData.city || null,
        address: onboardingData.streetAddress ? `${onboardingData.streetAddress}, ${onboardingData.zipCode || ''} ${onboardingData.city || ''}`.trim() : null,
        cuisines: onboardingData.primaryCuisines || [],
        dish_types: onboardingData.dishTypes || [],
        availability: onboardingData.availabilityBuckets || [],
        contact_email: onboardingData.email || user.email || null,
        contact_phone: onboardingData.phone || null,
        logo_url: onboardingData.logoUrl || null,
        service_type: onboardingData.serviceType || 'unsure',
        food_safety_status: onboardingData.foodSafetyStatus ? mapFoodSafetyStatus(onboardingData.foodSafetyStatus) : null,
        kvk_status: onboardingData.kvkStatus ? mapKvkStatus(onboardingData.kvkStatus) : null,
        plan: onboardingData.plan ? mapPlanType(onboardingData.plan) : null,
        onboarding_completed: completed,
      };

      const { data, error } = await supabase
        .from('chef_profiles')
        .upsert(profileData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      return data;
    } catch (err) {
      console.error('Error saving chef profile progress:', err);
      return null;
    }
  }, [user]);

  const createProfile = useCallback(async (onboardingData: OnboardingChefProfile) => {
    const result = await saveProgress(onboardingData, true);
    if (result) {
      toast({ 
        title: 'Profile saved!', 
        description: 'Your chef profile has been created successfully.' 
      });
    } else if (!user) {
      toast({ 
        title: 'Not logged in', 
        description: 'Please log in to save your profile',
        variant: 'destructive' 
      });
    } else {
      toast({ 
        title: 'Error saving profile', 
        description: 'Please try again.',
        variant: 'destructive' 
      });
    }
    return result;
  }, [user, saveProgress]);

  const updateProfile = useCallback(async (updates: Partial<DbChefProfile>) => {
    if (!user || !profile) return null;

    try {
      const { data, error } = await supabase
        .from('chef_profiles')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      return data;
    } catch (err) {
      console.error('Error updating chef profile:', err);
      return null;
    }
  }, [user, profile]);

  return {
    profile,
    loading: authLoading || loading,
    error,
    saveProgress,
    createProfile,
    updateProfile,
    refetch: fetchProfile,
    hasCompletedOnboarding: profile?.onboarding_completed ?? false,
  };
}
