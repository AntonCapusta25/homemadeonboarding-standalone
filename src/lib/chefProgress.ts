import { ChefWithStats } from '@/hooks/useChefProfiles';

interface TaskStatus {
  name: string;
  completed: boolean;
}

// Get onboarding tasks with their status
export const getOnboardingTasks = (chef: ChefWithStats): TaskStatus[] => [
  { name: 'City', completed: !!chef.city },
  { name: 'Cuisines', completed: (chef.cuisines?.length || 0) > 0 },
  { name: 'Contact Info', completed: !!chef.contact_email && !!chef.contact_phone },
  { name: 'Address', completed: !!chef.address },
  { name: 'Business Name', completed: !!chef.business_name },
  { name: 'Logo', completed: !!chef.logo_url },
  { name: 'Service Type', completed: !!chef.service_type && chef.service_type !== 'unsure' },
  { name: 'Availability', completed: (chef.availability?.length || 0) > 0 },
  { name: 'Dish Types', completed: (chef.dish_types?.length || 0) > 0 },
  { name: 'Food Safety', completed: !!chef.food_safety_status },
  { name: 'KVK Status', completed: !!chef.kvk_status },
  { name: 'Plan', completed: !!chef.plan },
];

// Get verification tasks with their status
export const getVerificationTasks = (chef: ChefWithStats): TaskStatus[] => [
  { name: 'Menu Review', completed: chef.verification_menu_reviewed || false },
  { name: 'Food Safety Training', completed: chef.verification_food_safety_viewed || false },
  { name: 'Documents Upload', completed: chef.verification_documents_uploaded || false },
];

// Get incomplete task names
export const getIncompleteTasks = (tasks: TaskStatus[]): string[] => 
  tasks.filter(t => !t.completed).map(t => t.name);

// Calculate chef progress based on onboarding fields only
export const calculateOnboardingProgress = (chef: ChefWithStats): number => {
  const tasks = getOnboardingTasks(chef);
  const completed = tasks.filter(t => t.completed).length;
  return Math.round((completed / tasks.length) * 100);
};

// Calculate verification progress from ChefWithStats
export const calculateVerificationProgress = (chef: ChefWithStats): number => {
  const tasks = getVerificationTasks(chef);
  const completed = tasks.filter(t => t.completed).length;
  return Math.round((completed / tasks.length) * 100);
};
