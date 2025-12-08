import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type ChefProfile = Tables<'chef_profiles'>;

interface ChefWithStats extends ChefProfile {
  menuCount?: number;
  dishCount?: number;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

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
  }, [fetchChefs]);

  const updateChefStatus = async (chefId: string, status: string, adminId: string) => {
    try {
      const { error } = await supabase
        .from('chef_profiles')
        .update({
          admin_status: status,
          crm_updated_by: adminId,
          crm_last_contact_date: new Date().toISOString(),
        })
        .eq('id', chefId);

      if (error) throw error;

      // Log activity
      await supabase.from('chef_activities').insert({
        chef_id: chefId,
        activity_type: 'status_change',
        description: `Status changed to ${status}`,
        admin_user_id: adminId,
      });

      await fetchChefs();
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const updateChefNotes = async (chefId: string, notes: string, adminId: string) => {
    try {
      const { error } = await supabase
        .from('chef_profiles')
        .update({
          admin_notes: notes,
          crm_updated_by: adminId,
        })
        .eq('id', chefId);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const assignAdmin = async (chefId: string, newAdminId: string | null) => {
    try {
      const { error } = await supabase
        .from('chef_profiles')
        .update({ assigned_admin_id: newAdminId })
        .eq('id', chefId);

      if (error) throw error;

      await fetchChefs();
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  return {
    chefs,
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
  };
}
