export type ServiceType = 'delivery' | 'pickup' | 'both' | 'unsure';
export type FoodSafetyStatus = 'has_certificate' | 'needs_training';
export type KvkStatus = 'kvk_nvwa_both' | 'kvk_only' | 'none' | 'try_first';
export type PlanType = 'basic' | 'pro' | 'advanced' | 'auto_recommend';
export type LogoMethod = 'ai' | 'upload' | 'placeholder';
export type NameMethod = 'ai' | 'manual';

export interface MenuDish {
  name: string;
  description: string;
  price: number;
  estimatedCost: number;
  margin: number;
  category: 'main' | 'side' | 'drink' | 'dessert';
  restaurantPrice?: number;
}

export interface MenuUpsell {
  name: string;
  price: number;
  type: 'drink' | 'side' | 'dessert' | 'extra';
}

export interface GeneratedMenu {
  dishes: MenuDish[];
  upsells: MenuUpsell[];
  avgMargin: number;
  summary?: string;
  generatedAt?: string;
}

export interface ChefProfile {
  id?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  city: string;
  zipCode?: string;
  streetAddress: string;
  country: string;
  restaurantName: string;
  primaryCuisines: string[];
  dishTypes: string[];
  serviceType: ServiceType;
  availabilityBuckets: string[];
  logoUrl?: string;
  logoGenerationMethod: LogoMethod;
  nameGenerationMethod: NameMethod;
  foodSafetyStatus: FoodSafetyStatus;
  haccpCertificateUrl?: string;
  kvkStatus: KvkStatus;
  kvkDocsUrl?: string;
  plan: PlanType;
  onboardingCompleted: boolean;
  onboardingCompletedAt?: Date;
  generatedMenu?: GeneratedMenu;
}

export type StepId = 
  | 'welcome'
  | 'city'
  | 'cuisine'
  | 'contact'
  | 'address'
  | 'business-name'
  | 'logo'
  | 'service-type'
  | 'availability'
  | 'dish-types'
  | 'food-safety-status'
  | 'kvk-nvwa-status'
  | 'plan'
  | 'summary';

export interface OnboardingStep {
  id: StepId;
  title: string;
  subtitle: string;
  isCompleted: boolean;
}

export const CITIES = [
  'Amsterdam',
  'Rotterdam', 
  'Enschede',
  'Haarlem',
  'Den Haag',
] as const;

export const CUISINES = [
  'Italian',
  'Indian',
  'Pakistani',
  'Middle Eastern',
  'African',
  'Surinamese',
  'Central Asian',
  'Thai',
  'Japanese',
  'Mexican',
  'Bakery & Desserts',
  'Healthy & Meal Prep',
  'Home-style / European',
  'Other / Fusion',
] as const;

export const DISH_TYPES = [
  'Curries',
  'Rice dishes',
  'Pasta',
  'Grills & BBQ',
  'Salads & bowls',
  'Desserts & cakes',
  'Street food / wraps',
  'Soups & stews',
  'Drinks',
  'Other',
] as const;

export const AVAILABILITY_OPTIONS = [
  'Weekday evenings',
  'Weekend evenings',
  'Lunchtime',
  'Flexible / not sure yet',
] as const;
