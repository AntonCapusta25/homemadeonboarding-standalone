import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type ChefProfile = Tables<'chef_profiles'>;

export interface ChefWithStats extends ChefProfile {
  menuCount?: number;
  dishCount?: number;
  isPending?: boolean; // True if from pending_profiles (incomplete onboarding)
  currentStep?: string; // Current onboarding step for pending profiles
}

export interface PendingProfile {
  id: string;
  email: string;
  phone: string | null;
  chef_name: string | null;
  business_name: string | null;
  city: string | null;
  cuisines: string[] | null;
  current_step: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
}

interface UseChefProfilesOptions {
  page?: number;
  pageSize?: number;
  statusFilter?: string;
  cityFilter?: string;
  assignedToMe?: boolean;
  adminId?: string;
  includePending?: boolean; // Whether to include pending profiles
}

interface Analytics {
  totalChefs: number;
  chefsLast30Days: number;
  chefsLast7Days: number;
  avgCompletion: number;
  statusBreakdown: Record<string, number>;
  pendingCount: number; // New: count of incomplete onboarding
}

export function useChefProfiles(options: UseChefProfilesOptions = {}) {
  const { page = 1, pageSize = 10, statusFilter, cityFilter, assignedToMe, adminId, includePending = true } = options;

  const [chefs, setChefs] = useState<ChefWithStats[]>([]);
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const fetchAdmins = useCallback(async () => {
    try {
      // Get admin user IDs from user_roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      if (adminRoles && adminRoles.length > 0) {
        // Get admin names from chef_activities (where they've logged activity)
        const { data: activities } = await supabase
          .from('chef_activities')
          .select('admin_user_id, admin_name')
          .in('admin_user_id', adminRoles.map(r => r.user_id));

        const adminMap: Record<string, AdminUser> = {};
        adminRoles.forEach(role => {
          const activity = activities?.find(a => a.admin_user_id === role.user_id);
          adminMap[role.user_id] = {
            id: role.user_id,
            email: '',
            name: activity?.admin_name || `Admin ${role.user_id.slice(0, 8)}`,
          };
        });

        setAdmins(Object.values(adminMap));
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
    }
  }, []);

  const fetchChefs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('chef_profiles')
        .select('*', { count: 'exact' });

      // Apply filters
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('admin_status', statusFilter);
      }
      if (cityFilter && cityFilter !== 'all') {
        query = query.eq('city', cityFilter);
      }
      if (assignedToMe && adminId) {
        query = query.eq('assigned_admin_id', adminId);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // Deduplicate by contact_email - keep only the most recent profile per email
      const deduplicatedChefs = (data || []).reduce((acc: ChefWithStats[], chef) => {
        if (!chef.contact_email) {
          acc.push(chef);
          return acc;
        }
        const existingIndex = acc.findIndex(c => c.contact_email === chef.contact_email);
        if (existingIndex === -1) {
          acc.push(chef);
        } else if (new Date(chef.created_at) > new Date(acc[existingIndex].created_at)) {
          acc[existingIndex] = chef;
        }
        return acc;
      }, []);

      setChefs(deduplicatedChefs);
      setTotalCount(count || 0);

      // Fetch pending profiles (incomplete onboarding)
      if (includePending) {
        const { data: pendingData } = await supabase
          .from('pending_profiles')
          .select('id, email, phone, chef_name, business_name, city, cuisines, current_step, created_at')
          .order('created_at', { ascending: false });

        if (pendingData) {
          // Filter out pending profiles that already exist in chef_profiles
          const existingEmails = new Set(deduplicatedChefs.map(c => c.contact_email?.toLowerCase()));
          const filteredPending = pendingData.filter(p => !existingEmails.has(p.email.toLowerCase()));
          setPendingProfiles(filteredPending);
        }
      }

      // Fetch analytics
      const { data: allChefs } = await supabase
        .from('chef_profiles')
        .select('created_at, admin_status, onboarding_completed');

      const { count: pendingCountResult } = await supabase
        .from('pending_profiles')
        .select('id', { count: 'exact', head: true });

      if (allChefs) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const statusBreakdown: Record<string, number> = {};
        let completedCount = 0;

        allChefs.forEach((chef) => {
          const status = chef.admin_status || 'new';
          statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
          if (chef.onboarding_completed) completedCount++;
        });

        setAnalytics({
          totalChefs: allChefs.length,
          chefsLast30Days: allChefs.filter(
            (c) => new Date(c.created_at) >= thirtyDaysAgo
          ).length,
          chefsLast7Days: allChefs.filter(
            (c) => new Date(c.created_at) >= sevenDaysAgo
          ).length,
          avgCompletion: allChefs.length > 0
            ? Math.round((completedCount / allChefs.length) * 100)
            : 0,
          statusBreakdown,
          pendingCount: pendingCountResult || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching chef profiles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch chefs');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, cityFilter, assignedToMe, adminId, includePending]);

  useEffect(() => {
    fetchChefs();
    fetchAdmins();
  }, [fetchChefs, fetchAdmins]);

  // Optimistic update helper
  const optimisticUpdate = (chefId: string, updates: Partial<ChefWithStats>) => {
    setChefs(prev => prev.map(chef => 
      chef.id === chefId ? { ...chef, ...updates } : chef
    ));
  };

  const updateChefStatus = async (chefId: string, status: string, currentAdminId: string, adminName?: string) => {
    // Optimistic update
    const previousChef = chefs.find(c => c.id === chefId);
    optimisticUpdate(chefId, { 
      admin_status: status, 
      crm_last_contact_date: new Date().toISOString() 
    });

    try {
      const { error } = await supabase
        .from('chef_profiles')
        .update({
          admin_status: status,
          crm_updated_by: currentAdminId,
          crm_last_contact_date: new Date().toISOString(),
        })
        .eq('id', chefId);

      if (error) throw error;

      // Log activity
      await supabase.from('chef_activities').insert({
        chef_id: chefId,
        activity_type: 'status_change',
        description: `Status changed to ${status}`,
        admin_user_id: currentAdminId,
        admin_name: adminName,
      });

      return { error: null };
    } catch (err) {
      // Rollback on error
      if (previousChef) {
        optimisticUpdate(chefId, { admin_status: previousChef.admin_status });
      }
      return { error: err };
    }
  };

  const updateChefNotes = async (chefId: string, notes: string, currentAdminId: string) => {
    // Optimistic update
    optimisticUpdate(chefId, { admin_notes: notes });

    try {
      const { error } = await supabase
        .from('chef_profiles')
        .update({
          admin_notes: notes,
          crm_updated_by: currentAdminId,
        })
        .eq('id', chefId);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const assignAdmin = async (chefId: string, newAdminId: string | null, currentAdminId: string, adminName?: string) => {
    // Optimistic update
    const previousChef = chefs.find(c => c.id === chefId);
    optimisticUpdate(chefId, { assigned_admin_id: newAdminId });

    try {
      const { error } = await supabase
        .from('chef_profiles')
        .update({ assigned_admin_id: newAdminId })
        .eq('id', chefId);

      if (error) throw error;

      // Log activity
      await supabase.from('chef_activities').insert({
        chef_id: chefId,
        activity_type: 'admin_assigned',
        description: newAdminId ? `Assigned to admin` : 'Unassigned from admin',
        admin_user_id: currentAdminId,
        admin_name: adminName,
      });

      return { error: null };
    } catch (err) {
      // Rollback on error
      if (previousChef) {
        optimisticUpdate(chefId, { assigned_admin_id: previousChef.assigned_admin_id });
      }
      return { error: err };
    }
  };

  const incrementCallAttempts = async (chefId: string, currentAdminId: string, adminName?: string) => {
    // Optimistic update
    const chef = chefs.find(c => c.id === chefId);
    const newCount = (chef?.call_attempts || 0) + 1;
    optimisticUpdate(chefId, { 
      call_attempts: newCount,
      crm_last_contact_date: new Date().toISOString()
    });

    try {
      const { error } = await supabase
        .from('chef_profiles')
        .update({
          call_attempts: newCount,
          crm_last_contact_date: new Date().toISOString(),
          crm_updated_by: currentAdminId,
        })
        .eq('id', chefId);

      if (error) throw error;

      // Log activity
      await supabase.from('chef_activities').insert({
        chef_id: chefId,
        activity_type: 'call_attempt',
        description: `Call attempt #${newCount}`,
        admin_user_id: currentAdminId,
        admin_name: adminName,
      });

      return { error: null };
    } catch (err) {
      // Rollback on error
      if (chef) {
        optimisticUpdate(chefId, { call_attempts: chef.call_attempts });
      }
      return { error: err };
    }
  };

  const updateFollowUpDate = async (chefId: string, date: Date | null, currentAdminId: string, adminName?: string) => {
    // Optimistic update
    const previousChef = chefs.find(c => c.id === chefId);
    const dateStr = date ? date.toISOString() : null;
    optimisticUpdate(chefId, { crm_follow_up_date: dateStr });

    try {
      const { error } = await supabase
        .from('chef_profiles')
        .update({
          crm_follow_up_date: dateStr,
          crm_updated_by: currentAdminId,
        })
        .eq('id', chefId);

      if (error) throw error;

      // Log activity
      await supabase.from('chef_activities').insert({
        chef_id: chefId,
        activity_type: 'follow_up_scheduled',
        description: date ? `Follow-up scheduled for ${date.toLocaleDateString()}` : 'Follow-up cleared',
        admin_user_id: currentAdminId,
        admin_name: adminName,
      });

      return { error: null };
    } catch (err) {
      // Rollback on error
      if (previousChef) {
        optimisticUpdate(chefId, { crm_follow_up_date: previousChef.crm_follow_up_date });
      }
      return { error: err };
    }
  };

  return {
    chefs,
    pendingProfiles,
    admins,
    loading,
    error,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    currentPage: page,
    analytics,
    refetch: fetchChefs,
    updateChefStatus,
    updateChefNotes,
    assignAdmin,
    incrementCallAttempts,
    updateFollowUpDate,
  };
}
