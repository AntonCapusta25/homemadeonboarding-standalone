import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChefProfile } from '@/types/onboarding';
import { useTranslation } from 'react-i18next';
import { PartyPopper, Rocket, ArrowRight } from 'lucide-react';
import { fireCelebration } from '@/components/confetti';
import { Logo } from '@/components/Logo';

interface CongratsStepProps {
  profile: ChefProfile;
  onGoToDashboard: () => void;
}

export function CongratsStep({ profile, onGoToDashboard }: CongratsStepProps) {
  const { t } = useTranslation();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Trigger confetti celebration
    const timer = setTimeout(() => {
      fireCelebration();
      setShowContent(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className={`text-center transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Logo chefLogo={profile.logoUrl} size="lg" showText={false} />
          </div>

          {/* Celebration icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-bounce-slow">
              <PartyPopper className="w-10 h-10 text-primary" />
            </div>
          </div>

          {/* Title */}
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t('congrats.title', 'Congratulations!')} 🎉
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-muted-foreground mb-4">
            {t('congrats.subtitle', 'Your profile is complete!')}
          </p>

          {/* Business name */}
          {profile.restaurantName && (
            <p className="text-2xl font-semibold text-primary mb-8">
              {profile.restaurantName}
            </p>
          )}

          {/* What's next section */}
          <div className="bg-card rounded-xl border border-border p-6 mb-8 text-left">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              {t('congrats.whatsNext', "What's next?")}
            </h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <span>{t('congrats.step1', 'Review and customize your AI-generated menu')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <span>{t('congrats.step2', 'Set your dish prices and availability')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <span>{t('congrats.step3', 'Start receiving orders from customers!')}</span>
              </li>
            </ul>
          </div>

          {/* CTA Button */}
          <Button 
            size="xl" 
            onClick={onGoToDashboard}
            className="shadow-glow hover:shadow-medium"
          >
            {t('congrats.goToDashboard', 'Go to Dashboard')}
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
