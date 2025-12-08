import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChefProfile } from '@/hooks/useChefProfile';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Clock, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/Logo';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { hasCompletedOnboarding, loading: profileLoading } = useChefProfile();

  // Redirect authenticated users
  useEffect(() => {
    if (!authLoading && !profileLoading && user) {
      if (hasCompletedOnboarding) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    }
  }, [user, authLoading, profileLoading, hasCompletedOnboarding, navigate]);

  const handleGetStarted = () => {
    navigate('/onboarding');
  };

  // Show loading while checking auth
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Join Home-Made-Chef - Start Your Home Restaurant</title>
        <meta name="description" content="Launch your home restaurant with Home-Made-Chef. Simple onboarding, AI-powered tools, and full support to get you cooking and selling in no time." />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-soft">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in px-4">
            <div className="mb-8 relative">
              <Logo size="lg" showText={false} />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-forest rounded-full flex items-center justify-center animate-pulse-soft">
                <Sparkles className="w-4 h-4 text-accent-foreground" />
              </div>
            </div>

            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-2 animate-slide-up">
              Home-Made-Chef
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-lg animate-slide-up" style={{ animationDelay: '0.1s' }}>
              {t('welcome.subtitle')}
            </p>

            <div className="flex flex-wrap justify-center gap-6 mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-5 h-5 text-primary" />
                <span>~5 min</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="w-5 h-5 text-forest" />
                <span>✓</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Button 
                size="xl" 
                onClick={handleGetStarted}
                className="shadow-glow hover:shadow-medium"
              >
                {t('welcome.getStarted')} 👨‍🍳
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted-foreground animate-slide-up" style={{ animationDelay: '0.4s' }}>
              {t('welcome.alreadyHaveAccount', 'Already a chef?')}{' '}
              <button 
                onClick={handleGetStarted}
                className="text-primary hover:underline font-medium"
              >
                {t('welcome.signIn', 'Continue your journey')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Index;
