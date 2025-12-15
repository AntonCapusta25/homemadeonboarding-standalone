import { ChefWithStats } from '@/hooks/useChefProfiles';

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

// Calculate verification progress from ChefWithStats (for table view)
export const calculateVerificationProgress = (chef: ChefWithStats): number => {
  const tasks = [
    chef.verification_menu_reviewed || false,
    chef.verification_food_safety_viewed || false,
    chef.verification_documents_uploaded || false,
  ];
  const completed = tasks.filter(Boolean).length;
  return Math.round((completed / tasks.length) * 100);
};
