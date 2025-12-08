import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type ChefProfile = Tables<'chef_profiles'>;

export interface ChefWithStats extends ChefProfile {
  menuCount?: number;
  dishCount?: number;
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
}

interface Analytics {
  totalChefs: number;
  chefsLast30Days: number;
  chefsLast7Days: number;
  avgCompletion: number;
  statusBreakdown: Record<string, number>;
}

export function useChefProfiles(options: UseChefProfilesOptions = {}) {
  const { page = 1, pageSize = 10, statusFilter, cityFilter, assignedToMe, adminId } = options;

  const [chefs, setChefs] = useState<ChefWithStats[]>([]);
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

      setChefs(data || []);
      setTotalCount(count || 0);

      // Fetch analytics
      const { data: allChefs } = await supabase
        .from('chef_profiles')
        .select('created_at, admin_status, onboarding_completed');

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
        });
      }
    } catch (err) {
      console.error('Error fetching chef profiles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch chefs');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, cityFilter, assignedToMe, adminId]);

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

  return {
    chefs,
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
  };
}
