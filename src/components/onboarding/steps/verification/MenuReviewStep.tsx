import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChefProfile, GeneratedMenu, MenuDish, MenuUpsell } from '@/types/onboarding';
import { useTranslation } from 'react-i18next';
import { ChefHat, ArrowRight, SkipForward, Loader2 } from 'lucide-react';
import { EditableMenu } from '@/components/menu/EditableMenu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MenuReviewStepProps {
  profile: ChefProfile;
  onUpdateProfile: (updates: Partial<ChefProfile>) => void;
  onNext: () => void;
  onSkip: () => void;
}

export function MenuReviewStep({ profile, onUpdateProfile, onNext, onSkip }: MenuReviewStepProps) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState<GeneratedMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    setLoading(true);
    try {
      // First try to load from localStorage (generated during onboarding)
      const savedMenu = localStorage.getItem('hmc_generated_menu');
      if (savedMenu) {
        const parsed = JSON.parse(savedMenu);
        if (parsed.dishes && Array.isArray(parsed.dishes)) {
          setMenu(parsed);
          setLoading(false);
          return;
        }
      }

      // If not in localStorage, try to load from database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: chefProfile } = await supabase
          .from('chef_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (chefProfile) {
          const { data: dbMenu } = await supabase
            .from('menus')
            .select('id, summary, average_margin')
            .eq('chef_profile_id', chefProfile.id)
            .eq('is_active', true)
            .maybeSingle();

          if (dbMenu) {
            const { data: dbDishes } = await supabase
              .from('dishes')
              .select('*')
              .eq('menu_id', dbMenu.id)
              .order('sort_order');

            if (dbDishes) {
              const dishes: MenuDish[] = dbDishes.filter(d => !d.is_upsell).map(d => ({
                name: d.name,
                description: d.description || '',
                price: Number(d.price),
                estimatedCost: Number(d.estimated_cost || 0),
                margin: Number(d.margin || 0),
                category: (d.category as 'main' | 'side' | 'drink' | 'dessert') || 'main',
              }));

              const upsells: MenuUpsell[] = dbDishes.filter(d => d.is_upsell).map(d => ({
                name: d.name,
                price: Number(d.price),
                type: (d.category as 'drink' | 'side' | 'dessert' | 'extra') || 'extra',
              }));

              setMenu({
                dishes,
                upsells,
                summary: dbMenu.summary || '',
                avgMargin: Number(dbMenu.average_margin || 0),
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMenu = (updatedMenu: GeneratedMenu) => {
    setMenu(updatedMenu);
    // Save to localStorage for persistence
    localStorage.setItem('hmc_generated_menu', JSON.stringify(updatedMenu));
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      if (menu) {
        localStorage.setItem('hmc_generated_menu', JSON.stringify(menu));
      }
      toast.success(t('verification.menuSaved', 'Menu saved!'));
      onNext();
    } catch (error) {
      console.error('Error saving menu:', error);
      toast.error(t('verification.saveError', 'Failed to save menu'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full animate-fade-in">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            {t('verification.menuReview', 'Review Your Menu')}
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            {t('verification.loadingMenu', 'Loading your menu...')}
          </p>
        </div>
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!menu || menu.dishes.length === 0) {
    return (
      <div className="flex flex-col h-full animate-fade-in">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            {t('verification.menuReview', 'Review Your Menu')}
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            {t('verification.noMenu', 'No menu found. You can create one in your dashboard.')}
          </p>
        </div>
        <div className="flex justify-center gap-4 mt-8">
          <Button onClick={onSkip} size="lg">
            {t('common.continue', 'Continue')}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-primary" />
          </div>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
          {t('verification.menuReview', 'Review Your Menu')}
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          {t('verification.menuReviewDesc', 'Adjust your AI-generated menu. You can edit dishes, prices, and descriptions.')}
        </p>
      </div>

      <div className="flex-1">
        <EditableMenu menu={menu} onUpdateMenu={handleUpdateMenu} saving={saving} />
      </div>

      <div className="flex justify-between pt-8 mt-auto border-t border-border">
        <Button variant="ghost" onClick={onSkip}>
          <SkipForward className="w-4 h-4 mr-2" />
          {t('common.skip', 'Skip')}
        </Button>
        <Button onClick={handleSaveAndContinue} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('common.saving', 'Saving...')}
            </>
          ) : (
            <>
              {t('common.saveAndContinue', 'Save & Continue')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
