import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChefProfile, StepId } from '@/types/onboarding';

interface PendingProfileData {
  id: string;
  email: string;
  current_step: string;
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

export function usePendingProfile() {
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const savePendingProfile = useCallback(async (
    profile: ChefProfile,
    currentStep: StepId
  ): Promise<string | null> => {
    if (!profile.email) return null;
    
    setSaving(true);
    try {
      const profileData = {
        email: profile.email,
        phone: profile.phone || null,
        chef_name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || null,
        business_name: profile.restaurantName || null,
        city: profile.city || null,
        address: profile.streetAddress 
          ? `${profile.streetAddress}, ${profile.zipCode || ''}, ${profile.city || ''}, ${profile.country || ''}`
          : null,
        cuisines: profile.primaryCuisines || [],
        dish_types: profile.dishTypes || [],
        availability: profile.availabilityBuckets || [],
        service_type: (profile.serviceType || 'unsure') as 'delivery' | 'pickup' | 'both' | 'unsure',
        food_safety_status: profile.foodSafetyStatus ? mapFoodSafetyStatus(profile.foodSafetyStatus) : null,
        kvk_status: profile.kvkStatus ? mapKvkStatus(profile.kvkStatus) : null,
        plan: profile.plan ? mapPlanType(profile.plan) : 'starter',
        logo_url: profile.logoUrl || null,
        current_step: currentStep,
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
        setPendingProfileId(existing.id);
        return existing.id;
      }

      // Insert new
      const { data, error } = await supabase
        .from('pending_profiles')
        .insert(profileData)
        .select('id')
        .single();

      if (error) throw error;
      setPendingProfileId(data.id);
      return data.id;
    } catch (error) {
      console.error('Error saving pending profile:', error);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const getPendingProfileByEmail = useCallback(async (email: string): Promise<PendingProfileData | null> => {
    try {
      const { data, error } = await supabase
        .from('pending_profiles')
        .select('id, email, current_step')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching pending profile:', error);
      return null;
    }
  }, []);

  return {
    pendingProfileId,
    saving,
    savePendingProfile,
    getPendingProfileByEmail,
  };
}
