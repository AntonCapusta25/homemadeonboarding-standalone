import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GeneratedMenu, MenuDish } from '@/types/onboarding';

interface DbMenu {
  id: string;
  chef_profile_id: string;
  summary: string | null;
  average_margin: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

interface DbDish {
  id: string;
  menu_id: string;
  name: string;
  description: string | null;
  price: number;
  estimated_cost: number | null;
  margin: number | null;
  category: string | null;
  restaurant_comparison_price: number | null;
  is_upsell: boolean | null;
  sort_order: number | null;
}

// Map category string to valid MenuDish category type
function mapCategory(category: string | null): MenuDish['category'] {
  if (category === 'main' || category === 'side' || category === 'drink' || category === 'dessert') {
    return category;
  }
  return 'main'; // default
}

export interface DashboardDish {
  id: string;
  name: string;
  price: string;
  description: string;
  estimatedCost?: number;
  margin?: number;
  menuId?: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

export function useMenu() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());

  const saveMenu = useCallback(async (
    chefProfileId: string,
    menu: GeneratedMenu
  ): Promise<DbMenu | null> => {
    setLoading(true);
    setError(null);

    try {
      // First, deactivate any existing active menus
      await supabase
        .from('menus')
        .update({ is_active: false })
        .eq('chef_profile_id', chefProfileId);

      // Create the new menu
      const { data: menuData, error: menuError } = await supabase
        .from('menus')
        .insert({
          chef_profile_id: chefProfileId,
          summary: menu.summary,
          average_margin: menu.avgMargin,
          is_active: true,
        })
        .select()
        .single();

      if (menuError) throw menuError;

      // Insert all dishes (both regular dishes and upsells)
      const dishesToInsert = menu.dishes.map((dish, index) => ({
        menu_id: menuData.id,
        name: dish.name,
        description: dish.description,
        price: dish.price,
        estimated_cost: dish.estimatedCost,
        margin: dish.margin,
        category: dish.category || null,
        restaurant_comparison_price: dish.restaurantPrice || null,
        is_upsell: false,
        sort_order: index,
      }));

      // Add upsells as dishes with is_upsell flag
      if (menu.upsells) {
        menu.upsells.forEach((upsell, index) => {
          // Map upsell type to valid category
          const upsellCategory = upsell.type === 'extra' ? 'side' : upsell.type;
          dishesToInsert.push({
            menu_id: menuData.id,
            name: upsell.name,
            description: null,
            price: upsell.price,
            estimated_cost: null,
            margin: null,
            category: upsellCategory || null,
            restaurant_comparison_price: null,
            is_upsell: true,
            sort_order: menu.dishes.length + index,
          });
        });
      }

      const { error: dishesError } = await supabase
        .from('dishes')
        .insert(dishesToInsert);

      if (dishesError) throw dishesError;

      return menuData;
    } catch (err) {
      console.error('Error saving menu:', err);
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActiveMenu = useCallback(async (
    chefProfileId: string
  ): Promise<{ menu: DbMenu; dishes: DbDish[] } | null> => {
    setLoading(true);
    setError(null);

    try {
      // Get active menu for this chef
      const { data: menuData, error: menuError } = await supabase
        .from('menus')
        .select('*')
        .eq('chef_profile_id', chefProfileId)
        .eq('is_active', true)
        .maybeSingle();

      if (menuError) throw menuError;
      if (!menuData) return null;

      // Get dishes for this menu
      const { data: dishesData, error: dishesError } = await supabase
        .from('dishes')
        .select('*')
        .eq('menu_id', menuData.id)
        .order('sort_order');

      if (dishesError) throw dishesError;

      return {
        menu: menuData,
        dishes: dishesData || [],
      };
    } catch (err) {
      console.error('Error loading menu:', err);
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a single dish optimistically (fires DB update in background)
  const updateDish = useCallback(async (
    dishId: string,
    updates: { name?: string; price?: number; description?: string },
    isNewDish: boolean = false
  ): Promise<boolean> => {
    // Skip DB update for new dishes that haven't been saved yet
    if (isNewDish || dishId.startsWith('new-')) {
      return true;
    }

    setPendingChanges(prev => new Set(prev).add(dishId));

    try {
      const { error } = await supabase
        .from('dishes')
        .update({
          ...(updates.name !== undefined && { name: updates.name }),
          ...(updates.price !== undefined && { price: updates.price }),
          ...(updates.description !== undefined && { description: updates.description }),
        })
        .eq('id', dishId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error updating dish:', err);
      return false;
    } finally {
      setPendingChanges(prev => {
        const next = new Set(prev);
        next.delete(dishId);
        return next;
      });
    }
  }, []);

  // Add a new dish to the database
  const addDish = useCallback(async (
    menuId: string,
    dish: { name: string; price: number; description: string },
    sortOrder: number
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('dishes')
        .insert({
          menu_id: menuId,
          name: dish.name,
          price: dish.price,
          description: dish.description,
          sort_order: sortOrder,
          is_upsell: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (err) {
      console.error('Error adding dish:', err);
      return null;
    }
  }, []);

  // Delete a dish from the database
  const deleteDish = useCallback(async (dishId: string): Promise<boolean> => {
    // Skip for new dishes that haven't been saved
    if (dishId.startsWith('new-')) {
      return true;
    }

    try {
      const { error } = await supabase
        .from('dishes')
        .delete()
        .eq('id', dishId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error deleting dish:', err);
      return false;
    }
  }, []);

  // Batch save all dishes (for manual save button)
  const saveDishes = useCallback(async (
    menuId: string,
    dishes: DashboardDish[]
  ): Promise<boolean> => {
    setLoading(true);
    
    try {
      // Process deletions
      const deletedDishes = dishes.filter(d => d.isDeleted && !d.id.startsWith('new-'));
      for (const dish of deletedDishes) {
        await deleteDish(dish.id);
      }

      // Process new dishes
      const newDishes = dishes.filter(d => d.isNew && d.name && d.price);
      for (let i = 0; i < newDishes.length; i++) {
        const dish = newDishes[i];
        await addDish(menuId, {
          name: dish.name,
          price: parseFloat(dish.price) || 0,
          description: dish.description,
        }, dishes.length + i);
      }

      // Process updates for existing dishes
      const existingDishes = dishes.filter(d => !d.isNew && !d.isDeleted && d.name && d.price);
      for (const dish of existingDishes) {
        await updateDish(dish.id, {
          name: dish.name,
          price: parseFloat(dish.price) || 0,
          description: dish.description,
        });
      }

      return true;
    } catch (err) {
      console.error('Error saving dishes:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [addDish, deleteDish, updateDish]);

  // Convert DB format to GeneratedMenu format for display
  const toGeneratedMenu = (menu: DbMenu, dishes: DbDish[]): GeneratedMenu => {
    const regularDishes = dishes.filter(d => !d.is_upsell);
    const upsellDishes = dishes.filter(d => d.is_upsell);

    return {
      summary: menu.summary || '',
      avgMargin: menu.average_margin || 0,
      dishes: regularDishes.map(dish => ({
        name: dish.name,
        description: dish.description || '',
        price: dish.price,
        estimatedCost: dish.estimated_cost || 0,
        margin: dish.margin || 0,
        category: mapCategory(dish.category),
        restaurantPrice: dish.restaurant_comparison_price || undefined,
      })),
      upsells: upsellDishes.map(dish => ({
        name: dish.name,
        price: dish.price,
        type: (dish.category as 'drink' | 'side' | 'dessert' | 'extra') || 'extra',
      })),
    };
  };

  return {
    saveMenu,
    loadActiveMenu,
    toGeneratedMenu,
    updateDish,
    addDish,
    deleteDish,
    saveDishes,
    loading,
    error,
    pendingChanges,
  };
}
