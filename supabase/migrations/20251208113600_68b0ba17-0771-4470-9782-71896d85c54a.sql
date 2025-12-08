-- Create enum types for better data integrity
CREATE TYPE public.service_type AS ENUM ('delivery', 'pickup', 'both', 'unsure');
CREATE TYPE public.food_safety_status AS ENUM ('have_certificate', 'getting_certificate', 'need_help');
CREATE TYPE public.kvk_status AS ENUM ('have_both', 'in_progress', 'need_help');
CREATE TYPE public.plan_type AS ENUM ('starter', 'growth', 'pro');

-- Chef profiles table
CREATE TABLE public.chef_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name TEXT,
  chef_name TEXT,
  city TEXT,
  address TEXT,
  cuisines TEXT[] DEFAULT '{}',
  dish_types TEXT[] DEFAULT '{}',
  service_type service_type DEFAULT 'unsure',
  food_safety_status food_safety_status,
  kvk_status kvk_status,
  plan plan_type DEFAULT 'starter',
  availability TEXT[] DEFAULT '{}',
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Generated menus table
CREATE TABLE public.menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_profile_id UUID REFERENCES public.chef_profiles(id) ON DELETE CASCADE NOT NULL,
  average_margin NUMERIC(5,2),
  summary TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Menu dishes table
CREATE TABLE public.dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID REFERENCES public.menus(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  estimated_cost NUMERIC(10,2),
  margin NUMERIC(5,2),
  category TEXT,
  restaurant_comparison_price NUMERIC(10,2),
  is_upsell BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Packaging suppliers cache table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  url TEXT,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_chef_profiles_user_id ON public.chef_profiles(user_id);
CREATE INDEX idx_chef_profiles_city ON public.chef_profiles(city);
CREATE INDEX idx_chef_profiles_onboarding ON public.chef_profiles(onboarding_completed);
CREATE INDEX idx_menus_chef_profile_id ON public.menus(chef_profile_id);
CREATE INDEX idx_menus_active ON public.menus(is_active) WHERE is_active = true;
CREATE INDEX idx_dishes_menu_id ON public.dishes(menu_id);
CREATE INDEX idx_dishes_category ON public.dishes(category);
CREATE INDEX idx_dishes_upsell ON public.dishes(is_upsell);
CREATE INDEX idx_suppliers_city ON public.suppliers(city);

-- Enable RLS
ALTER TABLE public.chef_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chef_profiles
CREATE POLICY "Users can view their own profile"
  ON public.chef_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.chef_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.chef_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for menus
CREATE POLICY "Users can view their own menus"
  ON public.menus FOR SELECT
  USING (chef_profile_id IN (SELECT id FROM public.chef_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own menus"
  ON public.menus FOR INSERT
  WITH CHECK (chef_profile_id IN (SELECT id FROM public.chef_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own menus"
  ON public.menus FOR UPDATE
  USING (chef_profile_id IN (SELECT id FROM public.chef_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own menus"
  ON public.menus FOR DELETE
  USING (chef_profile_id IN (SELECT id FROM public.chef_profiles WHERE user_id = auth.uid()));

-- RLS Policies for dishes
CREATE POLICY "Users can view their own dishes"
  ON public.dishes FOR SELECT
  USING (menu_id IN (
    SELECT m.id FROM public.menus m 
    JOIN public.chef_profiles cp ON m.chef_profile_id = cp.id 
    WHERE cp.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own dishes"
  ON public.dishes FOR INSERT
  WITH CHECK (menu_id IN (
    SELECT m.id FROM public.menus m 
    JOIN public.chef_profiles cp ON m.chef_profile_id = cp.id 
    WHERE cp.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own dishes"
  ON public.dishes FOR UPDATE
  USING (menu_id IN (
    SELECT m.id FROM public.menus m 
    JOIN public.chef_profiles cp ON m.chef_profile_id = cp.id 
    WHERE cp.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own dishes"
  ON public.dishes FOR DELETE
  USING (menu_id IN (
    SELECT m.id FROM public.menus m 
    JOIN public.chef_profiles cp ON m.chef_profile_id = cp.id 
    WHERE cp.user_id = auth.uid()
  ));

-- Suppliers are public (cached data)
CREATE POLICY "Anyone can view suppliers"
  ON public.suppliers FOR SELECT
  USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers
CREATE TRIGGER update_chef_profiles_updated_at
  BEFORE UPDATE ON public.chef_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menus_updated_at
  BEFORE UPDATE ON public.menus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();