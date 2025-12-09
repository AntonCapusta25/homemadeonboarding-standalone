import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VerificationProgress {
  id?: string;
  chefProfileId: string;
  menuReviewed: boolean;
  documentsUploaded: boolean;
  foodSafetyViewed: boolean;
  kvkDocumentUrl?: string;
  haccpDocumentUrl?: string;
  nvwaDocumentUrl?: string;
  verificationCompleted: boolean;
}

export function useVerification() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<VerificationProgress | null>(null);

  const loadProgress = useCallback(async (chefProfileId: string): Promise<VerificationProgress | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chef_verification')
        .select('*')
        .eq('chef_profile_id', chefProfileId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const result: VerificationProgress = {
          id: data.id,
          chefProfileId: data.chef_profile_id,
          menuReviewed: data.menu_reviewed || false,
          documentsUploaded: data.documents_uploaded || false,
          foodSafetyViewed: data.food_safety_viewed || false,
          kvkDocumentUrl: data.kvk_document_url || undefined,
          haccpDocumentUrl: data.haccp_document_url || undefined,
          nvwaDocumentUrl: data.nvwa_document_url || undefined,
          verificationCompleted: data.verification_completed || false,
        };
        setProgress(result);
        return result;
      }

      return null;
    } catch (err) {
      console.error('Error loading verification progress:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const initializeProgress = useCallback(async (chefProfileId: string): Promise<VerificationProgress | null> => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('chef_verification')
        .insert({
          chef_profile_id: chefProfileId,
        })
        .select()
        .single();

      if (error) throw error;

      const result: VerificationProgress = {
        id: data.id,
        chefProfileId: data.chef_profile_id,
        menuReviewed: false,
        documentsUploaded: false,
        foodSafetyViewed: false,
        verificationCompleted: false,
      };
      setProgress(result);
      return result;
    } catch (err) {
      console.error('Error initializing verification progress:', err);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateProgress = useCallback(async (
    chefProfileId: string,
    updates: Partial<Omit<VerificationProgress, 'id' | 'chefProfileId'>>
  ): Promise<boolean> => {
    setSaving(true);
    try {
      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.menuReviewed !== undefined) dbUpdates.menu_reviewed = updates.menuReviewed;
      if (updates.documentsUploaded !== undefined) dbUpdates.documents_uploaded = updates.documentsUploaded;
      if (updates.foodSafetyViewed !== undefined) dbUpdates.food_safety_viewed = updates.foodSafetyViewed;
      if (updates.kvkDocumentUrl !== undefined) dbUpdates.kvk_document_url = updates.kvkDocumentUrl;
      if (updates.haccpDocumentUrl !== undefined) dbUpdates.haccp_document_url = updates.haccpDocumentUrl;
      if (updates.nvwaDocumentUrl !== undefined) dbUpdates.nvwa_document_url = updates.nvwaDocumentUrl;
      if (updates.verificationCompleted !== undefined) dbUpdates.verification_completed = updates.verificationCompleted;

      const { error } = await supabase
        .from('chef_verification')
        .update(dbUpdates)
        .eq('chef_profile_id', chefProfileId);

      if (error) throw error;

      // Update local state
      setProgress(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (err) {
      console.error('Error updating verification progress:', err);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const getOrCreateProgress = useCallback(async (chefProfileId: string): Promise<VerificationProgress | null> => {
    let result = await loadProgress(chefProfileId);
    if (!result) {
      result = await initializeProgress(chefProfileId);
    }
    return result;
  }, [loadProgress, initializeProgress]);

  return {
    loading,
    saving,
    progress,
    loadProgress,
    initializeProgress,
    updateProgress,
    getOrCreateProgress,
  };
}