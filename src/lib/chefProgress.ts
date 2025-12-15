import { ChefWithStats } from '@/hooks/useChefProfiles';

export interface VerificationData {
  menu_reviewed: boolean;
  food_safety_viewed: boolean;
  documents_uploaded: boolean;
}

// Calculate chef progress based on onboarding fields only (for table view)
export const calculateOnboardingProgress = (chef: ChefWithStats): number => {
  const tasks = [
    !!chef.city,
    (chef.cuisines?.length || 0) > 0,
    !!chef.contact_email && !!chef.contact_phone,
    !!chef.address,
    !!chef.business_name,
    !!chef.logo_url,
    !!chef.service_type && chef.service_type !== 'unsure',
    (chef.availability?.length || 0) > 0,
    (chef.dish_types?.length || 0) > 0,
    !!chef.food_safety_status,
    !!chef.kvk_status,
    !!chef.plan,
  ];
  const completed = tasks.filter(Boolean).length;
  return Math.round((completed / tasks.length) * 100);
};

// Calculate full progress including verification tasks (for detail modal)
export const calculateFullProgress = (
  chef: ChefWithStats,
  verification?: VerificationData | null
): number => {
  const onboardingTasks = [
    !!chef.city,
    (chef.cuisines?.length || 0) > 0,
    !!chef.contact_email && !!chef.contact_phone,
    !!chef.address,
    !!chef.business_name,
    !!chef.logo_url,
    !!chef.service_type && chef.service_type !== 'unsure',
    (chef.availability?.length || 0) > 0,
    (chef.dish_types?.length || 0) > 0,
    !!chef.food_safety_status,
    !!chef.kvk_status,
    !!chef.plan,
  ];

  const verificationTasks = [
    verification?.menu_reviewed || false,
    verification?.food_safety_viewed || false,
    verification?.documents_uploaded || false,
  ];

  const allTasks = [...onboardingTasks, ...verificationTasks];
  const completed = allTasks.filter(Boolean).length;
  return Math.round((completed / allTasks.length) * 100);
};
