import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type ChefProfile = Tables<'chef_profiles'>;

// Admin data from separate table (only visible to admins)
export interface ChefAdminData {
  id: string;
  chef_profile_id: string;
  admin_notes: string | null;
  admin_status: string | null;
  crm_last_contact_date: string | null;
  crm_follow_up_date: string | null;
  call_attempts: number | null;
  assigned_admin_id: string | null;
  crm_updated_by: string | null;
}

export interface ChefWithStats extends ChefProfile {
  menuCount?: number;
  dishCount?: number;
  isPending?: boolean;
  currentStep?: string;
  // Admin data (joined from chef_admin_data table)
  admin_notes?: string | null;
  admin_status?: string | null;
  crm_last_contact_date?: string | null;
  crm_follow_up_date?: string | null;
  call_attempts?: number | null;
  assigned_admin_id?: string | null;
  crm_updated_by?: string | null;
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
  includePending?: boolean;
}

interface Analytics {
  totalChefs: number;
  totalSignups: number;
  chefsLast30Days: number;
  chefsLast7Days: number;
  avgCompletion: number;
  statusBreakdown: Record<string, number>;
  planBreakdown: Record<string, number>;
  pendingCount: number;
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
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, email')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      if (adminRoles && adminRoles.length > 0) {
        const { data: activities } = await supabase
          .from('chef_activities')
          .select('admin_user_id, admin_name')
          .in('admin_user_id', adminRoles.map(r => r.user_id));

        const adminMap: Record<string, AdminUser> = {};
        adminRoles.forEach(role => {
          const activity = activities?.find(a => a.admin_user_id === role.user_id);
          adminMap[role.user_id] = {
            id: role.user_id,
            email: role.email || '',
            name: activity?.admin_name || role.email || `Admin ${role.user_id.slice(0, 8)}`,
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
      // First fetch chef profiles
      let query = supabase
        .from('chef_profiles')
        .select('*', { count: 'exact' });

      if (cityFilter && cityFilter !== 'all') {
        query = query.eq('city', cityFilter);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Exclude backfilled profiles (those with null contact_phone) from main view
      // They can still be accessed via CSV export
      query = query
        .not('contact_phone', 'is', null)
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data: profilesData, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // Fetch admin data for these profiles
      const profileIds = (profilesData || []).map(p => p.id);
      let adminDataMap: Record<string, ChefAdminData> = {};

      if (profileIds.length > 0) {
        const { data: adminData, error: adminError } = await supabase
          .from('chef_admin_data')
          .select('*')
          .in('chef_profile_id', profileIds);

        if (!adminError && adminData) {
          adminDataMap = adminData.reduce((acc, ad) => {
            acc[ad.chef_profile_id] = ad;
            return acc;
          }, {} as Record<string, ChefAdminData>);
        }
      }

      // Merge chef profiles with admin data
      let mergedData: ChefWithStats[] = (profilesData || []).map(chef => ({
        ...chef,
        admin_notes: adminDataMap[chef.id]?.admin_notes || null,
        admin_status: adminDataMap[chef.id]?.admin_status || 'new',
        crm_last_contact_date: adminDataMap[chef.id]?.crm_last_contact_date || null,
        crm_follow_up_date: adminDataMap[chef.id]?.crm_follow_up_date || null,
        call_attempts: adminDataMap[chef.id]?.call_attempts || 0,
        assigned_admin_id: adminDataMap[chef.id]?.assigned_admin_id || null,
        crm_updated_by: adminDataMap[chef.id]?.crm_updated_by || null,
      }));

      // Apply status filter after merging (since status is now in admin_data)
      if (statusFilter && statusFilter !== 'all') {
        mergedData = mergedData.filter(chef => chef.admin_status === statusFilter);
      }

      // Apply assigned to me filter
      if (assignedToMe && adminId) {
        mergedData = mergedData.filter(chef => chef.assigned_admin_id === adminId);
      }

      // Deduplicate by contact_email
      const deduplicatedChefs = mergedData.reduce((acc: ChefWithStats[], chef) => {
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

      // Fetch pending profiles
      if (includePending) {
        const { data: pendingData } = await supabase
          .from('pending_profiles')
          .select('id, email, phone, chef_name, business_name, city, cuisines, current_step, created_at')
          .order('created_at', { ascending: false });

        if (pendingData) {
          const existingEmails = new Set(deduplicatedChefs.map(c => c.contact_email?.toLowerCase()));
          const filteredPending = pendingData.filter(p => !existingEmails.has(p.email.toLowerCase()));
          setPendingProfiles(filteredPending);
        }
      }

      // Fetch analytics - need to get admin data for status breakdown
      // Use large range to get all records (bypass default 1000 limit)
      const { data: allChefs } = await supabase
        .from('chef_profiles')
        .select('id, created_at, onboarding_completed, plan, contact_email')
        .range(0, 9999);

      const { data: allAdminData } = await supabase
        .from('chef_admin_data')
        .select('chef_profile_id, admin_status')
        .range(0, 9999);

      const { data: allPendingProfiles } = await supabase
        .from('pending_profiles')
        .select('id, email, created_at')
        .range(0, 9999);

      // Fetch auth users count from edge function
      let authUsersCount = 0;
      let authUsersLast30Days = 0;
      let authUsersLast7Days = 0;
      
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.access_token) {
          const { data: authData, error: authError } = await supabase.functions.invoke('get-auth-users-count', {
            headers: {
              Authorization: `Bearer ${session.session.access_token}`,
            },
          });
          
          if (!authError && authData) {
            authUsersCount = authData.totalAuthUsers || 0;
            authUsersLast30Days = authData.usersLast30Days || 0;
            authUsersLast7Days = authData.usersLast7Days || 0;
          }
        }
      } catch (authErr) {
        console.error('Error fetching auth users count:', authErr);
      }

      if (allChefs) {
        const adminStatusMap = (allAdminData || []).reduce((acc, ad) => {
          acc[ad.chef_profile_id] = ad.admin_status;
          return acc;
        }, {} as Record<string, string | null>);

        const statusBreakdown: Record<string, number> = {};
        const planBreakdown: Record<string, number> = {};

        // Track unique emails across both tables
        const chefEmails = new Set<string>();

        allChefs.forEach((chef) => {
          const status = adminStatusMap[chef.id] || 'new';
          statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
          
          // Track plans from actual database field
          const plan = chef.plan || 'starter';
          planBreakdown[plan] = (planBreakdown[plan] || 0) + 1;

          // Add email to unique set
          if (chef.contact_email) {
            chefEmails.add(chef.contact_email.toLowerCase());
          }
        });

        // Count only pending profiles whose email is NOT already in chef_profiles
        let uniquePendingCount = 0;
        (allPendingProfiles || []).forEach((pending) => {
          if (pending.email) {
            const emailLower = pending.email.toLowerCase();
            if (!chefEmails.has(emailLower)) {
              uniquePendingCount++;
            }
          }
        });

        // Use auth.users count as the source of truth for total signups
        const totalSignups = authUsersCount > 0 ? authUsersCount : (allChefs.length + uniquePendingCount);
        
        // Completion rate = profiles with onboarding_completed=true / total signups
        const completedOnboarding = allChefs.filter(c => c.onboarding_completed === true).length;
        const completionRate = totalSignups > 0
          ? Math.round((completedOnboarding / totalSignups) * 100)
          : 0;

        setAnalytics({
          totalChefs: allChefs.length,
          totalSignups: totalSignups,
          chefsLast30Days: authUsersLast30Days > 0 ? authUsersLast30Days : allChefs.length,
          chefsLast7Days: authUsersLast7Days > 0 ? authUsersLast7Days : allChefs.length,
          avgCompletion: completionRate,
          statusBreakdown,
          planBreakdown,
          pendingCount: uniquePendingCount,
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
    const previousChef = chefs.find(c => c.id === chefId);
    const now = new Date().toISOString();
    
    // Optimistic update - happens immediately
    optimisticUpdate(chefId, { 
      admin_status: status, 
      crm_last_contact_date: now 
    });

    // Fire-and-forget DB operations
    (async () => {
      try {
        // Use upsert to handle missing records automatically
        const { error } = await supabase
          .from('chef_admin_data')
          .upsert({
            chef_profile_id: chefId,
            admin_status: status,
            crm_updated_by: currentAdminId,
            crm_last_contact_date: now,
          }, { onConflict: 'chef_profile_id' });

        if (error) throw error;

        // Log activity in background
        supabase.from('chef_activities').insert({
          chef_id: chefId,
          activity_type: 'status_change',
          description: `Status changed to ${status}`,
          admin_user_id: currentAdminId,
          admin_name: adminName,
        });
      } catch (err) {
        console.error('Failed to update status:', err);
        if (previousChef) {
          optimisticUpdate(chefId, { admin_status: previousChef.admin_status });
        }
      }
    })();

    return { error: null };
  };

  const updateChefNotes = async (chefId: string, notes: string, currentAdminId: string) => {
    optimisticUpdate(chefId, { admin_notes: notes });

    // Fire-and-forget
    (async () => {
      try {
        const { error } = await supabase
          .from('chef_admin_data')
          .upsert({
            chef_profile_id: chefId,
            admin_notes: notes,
            crm_updated_by: currentAdminId,
          }, { onConflict: 'chef_profile_id' });

        if (error) throw error;
      } catch (err) {
        console.error('Failed to update notes:', err);
      }
    })();

    return { error: null };
  };

  const assignAdmin = async (chefId: string, newAdminId: string | null, currentAdminId: string, adminName?: string) => {
    const previousChef = chefs.find(c => c.id === chefId);
    
    // Optimistic update - happens immediately
    optimisticUpdate(chefId, { assigned_admin_id: newAdminId });

    // Fire-and-forget DB operations
    (async () => {
      try {
        const { error } = await supabase
          .from('chef_admin_data')
          .upsert({
            chef_profile_id: chefId,
            assigned_admin_id: newAdminId,
          }, { onConflict: 'chef_profile_id' });

        if (error) throw error;

        // Log activity in background
        supabase.from('chef_activities').insert({
          chef_id: chefId,
          activity_type: 'admin_assigned',
          description: newAdminId ? `Assigned to admin` : 'Unassigned from admin',
          admin_user_id: currentAdminId,
          admin_name: adminName,
        });
      } catch (err) {
        console.error('Failed to assign admin:', err);
        if (previousChef) {
          optimisticUpdate(chefId, { assigned_admin_id: previousChef.assigned_admin_id });
        }
      }
    })();

    return { error: null };
  };

  const incrementCallAttempts = async (chefId: string, currentAdminId: string, adminName?: string) => {
    const chef = chefs.find(c => c.id === chefId);
    const newCount = (chef?.call_attempts || 0) + 1;
    const now = new Date().toISOString();
    
    // Optimistic update - happens immediately
    optimisticUpdate(chefId, { 
      call_attempts: newCount,
      crm_last_contact_date: now
    });

    // Fire-and-forget DB operations
    (async () => {
      try {
        const { error } = await supabase
          .from('chef_admin_data')
          .upsert({
            chef_profile_id: chefId,
            call_attempts: newCount,
            crm_last_contact_date: now,
            crm_updated_by: currentAdminId,
          }, { onConflict: 'chef_profile_id' });

        if (error) throw error;

        // Log activity in background
        supabase.from('chef_activities').insert({
          chef_id: chefId,
          activity_type: 'call_attempt',
          description: `Call attempt #${newCount}`,
          admin_user_id: currentAdminId,
          admin_name: adminName,
        });
      } catch (err) {
        console.error('Failed to log call:', err);
        if (chef) {
          optimisticUpdate(chefId, { call_attempts: chef.call_attempts });
        }
      }
    })();

    return { error: null };
  };

  const updateFollowUpDate = async (chefId: string, date: Date | null, currentAdminId: string, adminName?: string) => {
    const previousChef = chefs.find(c => c.id === chefId);
    const dateStr = date ? date.toISOString() : null;
    
    // Optimistic update - happens immediately
    optimisticUpdate(chefId, { crm_follow_up_date: dateStr });

    // Fire-and-forget DB operations
    (async () => {
      try {
        const { error } = await supabase
          .from('chef_admin_data')
          .upsert({
            chef_profile_id: chefId,
            crm_follow_up_date: dateStr,
            crm_updated_by: currentAdminId,
          }, { onConflict: 'chef_profile_id' });

        if (error) throw error;

        // Log activity in background
        supabase.from('chef_activities').insert({
          chef_id: chefId,
          activity_type: 'follow_up_scheduled',
          description: date ? `Follow-up scheduled for ${date.toLocaleDateString()}` : 'Follow-up cleared',
          admin_user_id: currentAdminId,
          admin_name: adminName,
        });
      } catch (err) {
        console.error('Failed to update follow-up:', err);
        if (previousChef) {
          optimisticUpdate(chefId, { crm_follow_up_date: previousChef.crm_follow_up_date });
        }
      }
    })();

    return { error: null };
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