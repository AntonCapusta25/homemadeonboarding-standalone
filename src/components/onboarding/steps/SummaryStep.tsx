import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChefProfile } from '@/types/onboarding';
import { Check, Square, ArrowRight, Phone, MapPin, Store, Loader2, Sparkles, UtensilsCrossed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fireCelebration } from '@/components/confetti';
import { supabase } from '@/integrations/supabase/client';
import { MenuPreview } from '@/components/menu/MenuPreview';

interface SummaryStepProps { 
  profile: ChefProfile; 
  onGoToDashboard: () => void; 
  onBookCall: () => void;
  onUpdateProfile?: (updates: Partial<ChefProfile>) => void;
}

export function SummaryStep({ profile, onGoToDashboard, onBookCall, onUpdateProfile }: SummaryStepProps) {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [menuLoading, setMenuLoading] = useState(true);
  const [generatedMenu, setGeneratedMenu] = useState(profile.generatedMenu);

  useEffect(() => { 
    const generateMenu = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-menu', {
          body: {
            city: profile.city,
            cuisines: profile.primaryCuisines,
            dishTypes: profile.dishTypes,
            serviceType: profile.serviceType,
            restaurantName: profile.restaurantName,
            chefName: profile.firstName
          }
        });

        if (error) {
          console.error('Menu generation error:', error);
        } else if (data?.menu) {
          setGeneratedMenu(data.menu);
          if (onUpdateProfile) {
            onUpdateProfile({ generatedMenu: data.menu });
          }
          // Save to localStorage
          const savedProfile = localStorage.getItem('chefProfile');
          if (savedProfile) {
            const parsed = JSON.parse(savedProfile);
            parsed.generatedMenu = data.menu;
            localStorage.setItem('chefProfile', JSON.stringify(parsed));
          }
        }
      } catch (err) {
        console.error('Failed to generate menu:', err);
      } finally {
        setMenuLoading(false);
      }
    };

    generateMenu();

    const timer = setTimeout(() => { 
      setIsCreating(false); 
      fireCelebration();
      setTimeout(() => setShowContent(true), 200); 
    }, 2500); 
    return () => clearTimeout(timer); 
  }, []);

  const checklist = [
    { label: t('summary.checklist.location'), completed: true },
    { label: t('summary.checklist.branding'), completed: true },
    { label: t('summary.checklist.foodSafety'), completed: true },
    { label: t('summary.checklist.menu'), completed: !!generatedMenu },
    { label: t('summary.checklist.hours'), completed: false },
  ];

  if (isCreating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in px-4">
        <div className="mb-8">
          {profile.logoUrl ? (
            <img src={profile.logoUrl} alt="Your logo" className="w-24 h-24 rounded-3xl shadow-glow animate-pulse-soft object-cover" />
          ) : (
            <div className="w-24 h-24 bg-gradient-warm rounded-3xl flex items-center justify-center shadow-glow animate-pulse-soft">
              <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
            </div>
          )}
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">{t('summary.creating')} ✨</h1>
        <p className="text-lg text-muted-foreground max-w-md">{profile.restaurantName}</p>
        <p className="text-sm text-muted-foreground mt-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 animate-pulse" />
          {t('summary.generatingMenu')}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center min-h-[70vh] text-center px-4 ${showContent ? 'animate-fade-in' : 'opacity-0'}`}>
      <div className="mb-8 relative">
        {profile.logoUrl ? (
          <img src={profile.logoUrl} alt="Your logo" className="w-24 h-24 rounded-3xl shadow-glow animate-scale-in object-cover border-4 border-primary/20" />
        ) : (
          <div className="w-24 h-24 bg-gradient-warm rounded-3xl flex items-center justify-center shadow-glow animate-scale-in">
            <Store className="w-12 h-12 text-primary-foreground" />
          </div>
        )}
        <div className="absolute -top-2 -right-2 w-10 h-10 bg-forest rounded-full flex items-center justify-center animate-pulse-soft">
          <Check className="w-5 h-5 text-accent-foreground" />
        </div>
      </div>

      <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4 animate-slide-up">{t('summary.ready')} 🎉</h1>
      
      <div className="bg-card border border-border rounded-2xl p-6 mb-8 max-w-md w-full shadow-soft animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
          {profile.logoUrl ? (
            <img src={profile.logoUrl} alt="Your logo" className="w-20 h-20 rounded-xl object-cover shadow-soft" />
          ) : (
            <div className="w-20 h-20 bg-gradient-warm rounded-xl flex items-center justify-center">
              <Store className="w-10 h-10 text-primary-foreground" />
            </div>
          )}
          <div className="text-left flex-1">
            <h3 className="font-display font-bold text-xl text-foreground">{profile.restaurantName || t('summary.yourRestaurant')}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{t('summary.basedIn')} {profile.city}</p>
            {profile.firstName && <p className="text-sm text-muted-foreground mt-1">by {profile.firstName} {profile.lastName}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {profile.primaryCuisines.slice(0, 3).map(c => (
            <span key={c} className="bg-terracotta-light text-primary px-3 py-1 rounded-full text-sm font-medium">{c}</span>
          ))}
        </div>
      </div>

      {/* AI Generated Menu Preview */}
      {generatedMenu && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-8 max-w-md w-full shadow-soft animate-slide-up" style={{ animationDelay: '0.18s' }}>
          <h3 className="font-display font-semibold text-foreground mb-4 text-left flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            {t('menu.aiGenerated')}
          </h3>
          <div className="text-left mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{t('menu.dishesGenerated', { count: generatedMenu.dishes.length })}</span>
              <span className="text-sm font-medium text-forest">{generatedMenu.avgMargin}% {t('menu.avgMarginShort')}</span>
            </div>
            <p className="text-sm text-muted-foreground">{generatedMenu.summary}</p>
          </div>
          <MenuPreview menu={generatedMenu} compact onEdit={onGoToDashboard} />
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-6 mb-8 max-w-md w-full shadow-soft animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <h3 className="font-display font-semibold text-foreground mb-4 text-left flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />{t('summary.whatNext')}
        </h3>
        <ul className="space-y-3">
          {checklist.map((item, idx) => (
            <li key={idx} className="flex items-center gap-3 text-left">
              {item.completed ? (
                <div className="w-6 h-6 bg-forest rounded-md flex items-center justify-center"><Check className="w-4 h-4 text-accent-foreground" /></div>
              ) : (
                <Square className="w-6 h-6 text-muted-foreground" />
              )}
              <span className={item.completed ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <Button size="xl" onClick={onGoToDashboard} className="shadow-glow">
          {t('summary.goToDashboard')} 🚀
          <ArrowRight className="w-5 h-5" />
        </Button>
        <Button size="lg" variant="outline" onClick={onBookCall} className="gap-2">
          <Phone className="w-4 h-4" />{t('summary.bookCall')}
        </Button>
      </div>

      {/* IP Disclaimer */}
      <p className="text-[10px] text-muted-foreground/60 mt-8 max-w-sm text-center">
        {t('disclaimer.ip')}
      </p>
    </div>
  );
}
