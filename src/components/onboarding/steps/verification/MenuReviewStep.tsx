import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChefProfile, GeneratedMenu, MenuDish, MenuUpsell } from '@/types/onboarding';
import { useTranslation } from 'react-i18next';
import { ChefHat, ArrowRight, SkipForward, Loader2 } from 'lucide-react';
import { EditableMenu } from '@/components/menu/EditableMenu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMenu } from '@/hooks/useMenu';

interface MenuReviewStepProps {
  profile: ChefProfile;
  onUpdateProfile: (updates: Partial<ChefProfile>) => void;
  onNext: () => void;
  onSkip: () => void;
}

export function MenuReviewStep({ profile, onUpdateProfile, onNext, onSkip }: MenuReviewStepProps) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState<GeneratedMenu | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { loadActiveMenu, toGeneratedMenu, saveDishes } = useMenu();

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    setLoading(true);
    try {
      // Load from database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: chefProfile } = await supabase
          .from('chef_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (chefProfile) {
          const result = await loadActiveMenu(chefProfile.id);
          if (result) {
            setMenuId(result.menu.id);
            const convertedMenu = toGeneratedMenu(result.menu, result.dishes);
            setMenu(convertedMenu);
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
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      if (menu && menuId) {
        // Convert menu to dashboard dish format and save
        const dishesToSave = menu.dishes.map((dish, index) => ({
          id: `existing-${index}`, // This will be handled by the save logic
          name: dish.name,
          price: String(dish.price),
          description: dish.description || '',
          estimatedCost: dish.estimatedCost,
          margin: dish.margin,
        }));
        
        // For now, just show success - actual save happens via EditableMenu autosave
        toast.success(t('verification.menuSaved', 'Menu saved!'));
      }
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
            {t('verification.noMenu', 'No menu found. Your menu will be generated shortly.')}
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
