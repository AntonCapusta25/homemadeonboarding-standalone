import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminStats {
  adminId: string;
  adminName: string;
  adminEmail: string;
  assignedChefs: number;
  successRate: number;
  successfulConversions: number;
  averageCompletion: number;
  totalCalls: number;
  totalFollowUps: number;
  statusBreakdown: Record<string, number>;
  lastActivity: string | null;
}

interface AdminUser {
  id: string;
  email: string;
  raw_user_meta_data?: { name?: string };
}

export function useAdminStatistics() {
  const [stats, setStats] = useState<AdminStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all admin user IDs from user_roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      if (!adminRoles || adminRoles.length === 0) {
        setStats([]);
        return;
      }

      const adminIds = adminRoles.map(r => r.user_id);

      // Get chef profiles with assigned admins
      const { data: profiles, error: profilesError } = await supabase
        .from('chef_profiles')
        .select('*')
        .in('assigned_admin_id', adminIds);

      if (profilesError) throw profilesError;

      // Get latest activities per admin
      const { data: activities, error: activitiesError } = await supabase
        .from('chef_activities')
        .select('admin_user_id, admin_name, created_at')
        .in('admin_user_id', adminIds)
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      // Build admin stats
      const adminStatsMap: Record<string, AdminStats> = {};

      // Initialize stats for each admin
      for (const adminId of adminIds) {
        // Try to get admin name from activities
        const adminActivity = activities?.find(a => a.admin_user_id === adminId);
        
        adminStatsMap[adminId] = {
          adminId,
          adminName: adminActivity?.admin_name || 'Unknown Admin',
          adminEmail: '', // We'll try to get this from profiles or activities
          assignedChefs: 0,
          successRate: 0,
          successfulConversions: 0,
          averageCompletion: 0,
          totalCalls: 0,
          totalFollowUps: 0,
          statusBreakdown: {},
          lastActivity: null,
        };
      }

      // Process profiles
      const successStatuses = ['interested', 'meeting_set', 'active'];
      
      for (const profile of profiles || []) {
        const adminId = profile.assigned_admin_id;
        if (!adminId || !adminStatsMap[adminId]) continue;

        const stat = adminStatsMap[adminId];
        stat.assignedChefs++;

        // Status breakdown
        const status = profile.admin_status || 'new';
        stat.statusBreakdown[status] = (stat.statusBreakdown[status] || 0) + 1;

        // Success tracking
        if (successStatuses.includes(status)) {
          stat.successfulConversions++;
        }

        // Call attempts
        stat.totalCalls += profile.call_attempts || 0;

        // Follow-ups (count profiles with follow-up dates)
        if (profile.crm_follow_up_date) {
          stat.totalFollowUps++;
        }

        // Calculate completion based on filled fields
        const completionFields = [
          profile.business_name,
          profile.chef_name,
          profile.city,
          profile.address,
          profile.contact_email,
          profile.contact_phone,
          profile.cuisines?.length > 0,
          profile.dish_types?.length > 0,
          profile.service_type,
          profile.availability?.length > 0,
        ];
        const filledFields = completionFields.filter(Boolean).length;
        const completion = Math.round((filledFields / completionFields.length) * 100);
        stat.averageCompletion = stat.assignedChefs === 1 
          ? completion 
          : Math.round((stat.averageCompletion * (stat.assignedChefs - 1) + completion) / stat.assignedChefs);
      }

      // Calculate success rates and get last activity
      for (const adminId of Object.keys(adminStatsMap)) {
        const stat = adminStatsMap[adminId];
        
        if (stat.assignedChefs > 0) {
          stat.successRate = Math.round((stat.successfulConversions / stat.assignedChefs) * 100);
        }

        // Get last activity
        const adminActivity = activities?.find(a => a.admin_user_id === adminId);
        if (adminActivity) {
          stat.lastActivity = adminActivity.created_at;
        }
      }

      // Convert to array and sort by assigned chefs
      const statsArray = Object.values(adminStatsMap)
        .filter(s => s.assignedChefs > 0) // Only show admins with assigned chefs
        .sort((a, b) => b.assignedChefs - a.assignedChefs);

      setStats(statsArray);
    } catch (err) {
      console.error('Error fetching admin statistics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load admin statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
