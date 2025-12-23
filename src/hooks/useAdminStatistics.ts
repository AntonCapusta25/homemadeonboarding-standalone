import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateOnboardingProgress, calculateVerificationProgress } from '@/lib/chefProgress';
import { ChefWithStats } from './useChefProfiles';

export interface ClosedChef {
  id: string;
  name: string;
  businessName: string | null;
  closedAt: string;
  progress: number;
}

export interface ChefProgressInfo {
  id: string;
  name: string;
  businessName: string | null;
  progress: number;
  status: string;
  lastContact: string | null;
}

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
  // New fields for motivation
  closedChefs: ClosedChef[];
  chefsByProgress: {
    high: ChefProgressInfo[];   // 75%+
    medium: ChefProgressInfo[]; // 50-74%
    low: ChefProgressInfo[];    // <50%
  };
  progressScore: number; // Weighted score based on chef progress
}

interface ChefAdminData {
  chef_profile_id: string;
  admin_notes: string | null;
  admin_status: string | null;
  crm_last_contact_date: string | null;
  crm_follow_up_date: string | null;
  call_attempts: number | null;
  assigned_admin_id: string | null;
  updated_at: string;
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
        .select('user_id, email')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      if (!adminRoles || adminRoles.length === 0) {
        setStats([]);
        return;
      }

      const adminIds = adminRoles.map(r => r.user_id);

      // Get admin data with assigned admins
      const { data: adminDataRows, error: adminDataError } = await supabase
        .from('chef_admin_data')
        .select('*')
        .in('assigned_admin_id', adminIds);

      if (adminDataError) throw adminDataError;

      // Get chef profiles for completion stats
      const profileIds = (adminDataRows || []).map(a => a.chef_profile_id);
      let profilesMap: Record<string, {
        id: string;
        business_name: string | null;
        chef_name: string | null;
        city: string | null;
        address: string | null;
        contact_email: string | null;
        contact_phone: string | null;
        cuisines: string[] | null;
        dish_types: string[] | null;
        service_type: string | null;
        availability: string[] | null;
        logo_url: string | null;
        food_safety_status: string | null;
        kvk_status: string | null;
        plan: string | null;
        onboarding_completed: boolean | null;
      }> = {};

      // Also get verification data for success calculation
      let verificationMap: Record<string, {
        menu_reviewed: boolean | null;
        food_safety_viewed: boolean | null;
        documents_uploaded: boolean | null;
        kitchen_verified_at: string | null;
        verification_completed: boolean | null;
      }> = {};

      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('chef_profiles')
          .select('id, business_name, chef_name, city, address, contact_email, contact_phone, cuisines, dish_types, service_type, availability, logo_url, food_safety_status, kvk_status, plan, onboarding_completed')
          .in('id', profileIds);

        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as typeof profilesMap);
        }

        // Fetch verification data
        const { data: verifications } = await supabase
          .from('chef_verification')
          .select('chef_profile_id, menu_reviewed, food_safety_viewed, documents_uploaded, kitchen_verified_at, verification_completed')
          .in('chef_profile_id', profileIds);

        if (verifications) {
          verificationMap = verifications.reduce((acc, v) => {
            acc[v.chef_profile_id] = v;
            return acc;
          }, {} as typeof verificationMap);
        }
      }

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
      for (const adminRole of adminRoles) {
        const adminId = adminRole.user_id;
        const adminActivity = activities?.find(a => a.admin_user_id === adminId);
        
        adminStatsMap[adminId] = {
          adminId,
          adminName: adminActivity?.admin_name || adminRole.email || 'Unknown Admin',
          adminEmail: adminRole.email || '',
          assignedChefs: 0,
          successRate: 0,
          successfulConversions: 0,
          averageCompletion: 0,
          totalCalls: 0,
          totalFollowUps: 0,
          statusBreakdown: {},
          lastActivity: null,
          closedChefs: [],
          chefsByProgress: { high: [], medium: [], low: [] },
          progressScore: 0,
        };
      }

      // Process admin data
      for (const adminData of adminDataRows || []) {
        const adminId = adminData.assigned_admin_id;
        if (!adminId || !adminStatsMap[adminId]) continue;

        const stat = adminStatsMap[adminId];
        stat.assignedChefs++;

        // Status breakdown
        const status = adminData.admin_status || 'new';
        stat.statusBreakdown[status] = (stat.statusBreakdown[status] || 0) + 1;

        // Call attempts
        stat.totalCalls += adminData.call_attempts || 0;

        // Follow-ups (count profiles with follow-up dates)
        if (adminData.crm_follow_up_date) {
          stat.totalFollowUps++;
        }

        // Calculate completion based on profile fields
        const profile = profilesMap[adminData.chef_profile_id];
        const verification = verificationMap[adminData.chef_profile_id];
        
        if (profile) {
          // Build a ChefWithStats-like object for progress calculation
          const chefForProgress = {
            ...profile,
            verification_menu_reviewed: verification?.menu_reviewed || false,
            verification_food_safety_viewed: verification?.food_safety_viewed || false,
            verification_documents_uploaded: verification?.documents_uploaded || false,
            verification_kitchen_verified: !!verification?.kitchen_verified_at,
          } as ChefWithStats;

          const onboardingProgress = calculateOnboardingProgress(chefForProgress);
          const verificationProgress = calculateVerificationProgress(chefForProgress);
          
          // Combined progress (weighted: 60% onboarding, 40% verification)
          const totalProgress = Math.round(onboardingProgress * 0.6 + verificationProgress * 0.4);
          
          stat.averageCompletion = stat.assignedChefs === 1 
            ? totalProgress 
            : Math.round((stat.averageCompletion * (stat.assignedChefs - 1) + totalProgress) / stat.assignedChefs);

          const chefInfo: ChefProgressInfo = {
            id: profile.id,
            name: profile.chef_name || profile.contact_email || 'Unknown',
            businessName: profile.business_name,
            progress: totalProgress,
            status: status,
            lastContact: adminData.crm_last_contact_date,
          };

          // Categorize by progress
          if (totalProgress >= 75) {
            stat.chefsByProgress.high.push(chefInfo);
          } else if (totalProgress >= 50) {
            stat.chefsByProgress.medium.push(chefInfo);
          } else {
            stat.chefsByProgress.low.push(chefInfo);
          }

          // Success = status is "active" (they became a paying customer) OR onboarding + verification complete
          const isActive = status === 'active';
          const isFullyComplete = onboardingProgress === 100 && verificationProgress === 100;
          
          if (isActive || isFullyComplete) {
            stat.successfulConversions++;
            stat.closedChefs.push({
              id: profile.id,
              name: profile.chef_name || profile.business_name || 'Unknown',
              businessName: profile.business_name,
              closedAt: adminData.updated_at,
              progress: totalProgress,
            });
          }
        }
      }

      // Calculate success rates, progress scores, and get last activity
      for (const adminId of Object.keys(adminStatsMap)) {
        const stat = adminStatsMap[adminId];
        
        if (stat.assignedChefs > 0) {
          stat.successRate = Math.round((stat.successfulConversions / stat.assignedChefs) * 100);
          
          // Progress score: weighted by how many chefs are in high/medium progress
          // High progress chefs = 3 points, medium = 2 points, low = 1 point
          const highPoints = stat.chefsByProgress.high.length * 3;
          const mediumPoints = stat.chefsByProgress.medium.length * 2;
          const lowPoints = stat.chefsByProgress.low.length * 1;
          const maxPoints = stat.assignedChefs * 3;
          stat.progressScore = Math.round(((highPoints + mediumPoints + lowPoints) / maxPoints) * 100);
        }

        // Sort closed chefs by date (most recent first)
        stat.closedChefs.sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());

        // Sort progress lists by progress (highest first)
        stat.chefsByProgress.high.sort((a, b) => b.progress - a.progress);
        stat.chefsByProgress.medium.sort((a, b) => b.progress - a.progress);
        stat.chefsByProgress.low.sort((a, b) => b.progress - a.progress);

        // Get last activity
        const adminActivity = activities?.find(a => a.admin_user_id === adminId);
        if (adminActivity) {
          stat.lastActivity = adminActivity.created_at;
        }
      }

      // Convert to array and sort by progress score (best performers first)
      const statsArray = Object.values(adminStatsMap)
        .sort((a, b) => b.progressScore - a.progressScore || b.assignedChefs - a.assignedChefs);

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