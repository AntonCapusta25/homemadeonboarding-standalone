import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChefProfile } from '@/hooks/useChefProfile';
import { useMenu } from '@/hooks/useMenu';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { MenuPreview } from '@/components/menu/MenuPreview';
import { CoolLoader } from '@/components/dashboard/CoolLoader';
import { fireCelebration } from '@/components/confetti';
import { useTranslation } from 'react-i18next';
import { GeneratedMenu } from '@/types/onboarding';
import { 
  Check, 
  ArrowRight, 
  Phone, 
  MapPin, 
  Store, 
  CircleCheck, 
  Circle,
  Sparkles,
  UtensilsCrossed
} from 'lucide-react';

export default function Summary() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useChefProfile();
  const { loadActiveMenu, toGeneratedMenu } = useMenu();
  const [showContent, setShowContent] = useState(false);
  const [menu, setMenu] = useState<GeneratedMenu | null>(null);
  const [menuLoading, setMenuLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [authLoading, user, navigate]);

  // Load menu when profile is available
  useEffect(() => {
    const fetchMenu = async () => {
      if (profile?.id) {
        setMenuLoading(true);
        const result = await loadActiveMenu(profile.id);
        if (result) {
          setMenu(toGeneratedMenu(result.menu, result.dishes));
        }
        setMenuLoading(false);
      }
    };
    fetchMenu();
  }, [profile?.id, loadActiveMenu, toGeneratedMenu]);

  // Show celebration and content once loaded
  useEffect(() => {
    if (profile && !profileLoading) {
      fireCelebration();
      setTimeout(() => setShowContent(true), 200);
    }
  }, [profile, profileLoading]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <CoolLoader message={t('summary.loading', 'Loading your profile...')} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t('summary.noProfile', 'No profile found')}</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  // Summary of completed steps
  const completedItems = [
    { label: t('summary.completed.city', { city: profile.city }), value: profile.city },
    { label: t('summary.completed.cuisines'), value: profile.cuisines?.join(', ') },
    { label: t('summary.completed.contact'), value: `${profile.contact_email} • ${profile.contact_phone}` },
    { label: t('summary.completed.address'), value: profile.address },
    { label: t('summary.completed.businessName'), value: profile.business_name },
    { label: t('summary.completed.serviceType'), value: profile.service_type },
    { label: t('summary.completed.availability'), value: profile.availability?.join(', ') },
    { label: t('summary.completed.dishTypes'), value: profile.dish_types?.join(', ') },
  ];

  // Next steps / pending items
  const pendingItems = [
    { label: t('summary.pending.verifyEmail'), done: true }, // They verified by clicking magic link
    { label: t('summary.pending.finalizeMenu'), done: !!menu },
    { label: t('summary.pending.setHours'), done: false },
    { label: t('summary.pending.addPhotos'), done: false },
    { label: t('summary.pending.goLive'), done: false },
  ];

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header with logo */}
        <div className="flex items-center justify-between mb-6">
          <Logo chefLogo={profile.logo_url} size="sm" />
        </div>

        <div className={`flex flex-col items-center justify-center min-h-[70vh] text-center px-4 ${showContent ? 'animate-fade-in' : 'opacity-0'}`}>
          {/* Logo with checkmark */}
          <div className="mb-8 relative">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="Your logo" className="w-24 h-24 rounded-3xl shadow-glow animate-scale-in object-cover border-4 border-primary/20" />
            ) : (
              <div className="w-24 h-24 bg-gradient-warm rounded-3xl flex items-center justify-center shadow-glow animate-scale-in">
                <Store className="w-12 h-12 text-primary-foreground" />
              </div>
            )}
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-forest rounded-full flex items-center justify-center animate-pulse-soft">
              <Check className="w-5 h-5 text-accent-foreground" />
            </div>
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4 animate-slide-up">
            {t('summary.welcomeBack', 'Welcome!')} 🎉
          </h1>
          
          {/* Profile Card */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6 max-w-md w-full shadow-soft animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
              {profile.logo_url ? (
                <img src={profile.logo_url} alt="Your logo" className="w-20 h-20 rounded-xl object-cover shadow-soft" />
              ) : (
                <div className="w-20 h-20 bg-gradient-warm rounded-xl flex items-center justify-center">
                  <Store className="w-10 h-10 text-primary-foreground" />
                </div>
              )}
              <div className="text-left flex-1">
                <h3 className="font-display font-bold text-xl text-foreground">{profile.business_name || t('summary.yourRestaurant')}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{t('summary.basedIn')} {profile.city}
                </p>
                {profile.chef_name && <p className="text-sm text-muted-foreground mt-1">by {profile.chef_name}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {profile.cuisines?.slice(0, 3).map(c => (
                <span key={c} className="bg-terracotta-light text-primary px-3 py-1 rounded-full text-sm font-medium">{c}</span>
              ))}
            </div>
          </div>

          {/* Completed Steps Summary */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6 max-w-md w-full shadow-soft animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <h3 className="font-display font-semibold text-foreground mb-4 text-left flex items-center gap-2">
              <CircleCheck className="w-5 h-5 text-forest" />
              {t('summary.completedSteps')}
            </h3>
            <ul className="space-y-2 text-left">
              {completedItems.filter(item => item.value).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-forest mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground">{item.label}:</span>{' '}
                    <span className="text-foreground font-medium">{item.value}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* AI Generated Menu Preview */}
          {menu && (
            <div className="bg-card border border-border rounded-2xl p-6 mb-6 max-w-md w-full shadow-soft animate-slide-up" style={{ animationDelay: '0.18s' }}>
              <h3 className="font-display font-semibold text-foreground mb-4 text-left flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-primary" />
                {t('menu.aiGenerated')}
              </h3>
              <div className="text-left mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('menu.dishesGenerated', { count: menu.dishes?.length || 0 })}</span>
                  {menu.avgMargin && (
                    <span className="text-sm font-medium text-forest">{menu.avgMargin}% {t('menu.avgMarginShort')}</span>
                  )}
                </div>
                {menu.summary && <p className="text-sm text-muted-foreground">{menu.summary}</p>}
              </div>
              <MenuPreview 
                menu={menu} 
                compact 
                onEdit={handleGoToDashboard} 
              />
            </div>
          )}

          {/* Pending / Next Steps */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-8 max-w-md w-full shadow-soft animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="font-display font-semibold text-foreground mb-4 text-left flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />{t('summary.whatNext')}
            </h3>
            <ul className="space-y-3">
              {pendingItems.map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-left">
                  {item.done ? (
                    <div className="w-6 h-6 bg-forest rounded-md flex items-center justify-center">
                      <Check className="w-4 h-4 text-accent-foreground" />
                    </div>
                  ) : (
                    <Circle className="w-6 h-6 text-muted-foreground" />
                  )}
                  <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Button size="xl" onClick={handleGoToDashboard} className="shadow-glow">
              {t('summary.goToDashboard', 'Go to Dashboard')} 🚀
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => window.open('https://calendly.com', '_blank')} className="gap-2">
              <Phone className="w-4 h-4" />{t('summary.bookCall')}
            </Button>
          </div>

          {/* IP Disclaimer */}
          <p className="text-[10px] text-muted-foreground/60 mt-8 max-w-sm text-center">
            {t('disclaimer.ip')}
          </p>
        </div>
      </div>
    </div>
  );
}
