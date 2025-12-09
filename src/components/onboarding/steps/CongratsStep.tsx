import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChefProfile } from '@/types/onboarding';
import { useTranslation } from 'react-i18next';
import { ChefHat, FileCheck, ShieldCheck, Zap } from 'lucide-react';
import { fireCelebration } from '@/components/confetti';
import { Logo } from '@/components/Logo';

interface CongratsStepProps {
  profile: ChefProfile;
  onStartFastVerification: () => void;
}

export function CongratsStep({ profile, onStartFastVerification }: CongratsStepProps) {
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

  const verificationItems = [
    {
      icon: ShieldCheck,
      title: t('congrats.foodSafetyQuiz', 'Complete Food Safety Quiz'),
      description: t('congrats.foodSafetyDesc', 'Pass a quick quiz to show you understand food safety basics'),
    },
    {
      icon: FileCheck,
      title: t('congrats.uploadDocs', 'Upload Required Documents'),
      description: t('congrats.uploadDocsDesc', 'Upload your KVK registration and other required documents'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className={`text-center transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Logo chefLogo={profile.logoUrl} size="lg" showText={false} />
          </div>

          {/* Chef hat icon with animation */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-bounce-slow">
              <ChefHat className="w-10 h-10 text-primary" />
            </div>
          </div>

          {/* Welcome message */}
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t('congrats.welcome', 'Welcome on board, Chef!')} 🎉
          </h1>

          {/* Chef name */}
          {profile.firstName && (
            <p className="text-2xl font-semibold text-primary mb-8">
              {profile.firstName} {profile.lastName}
            </p>
          )}

          {/* Fast verification section */}
          <div className="bg-card rounded-xl border border-border p-6 mb-8 text-left">
            <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              {t('congrats.getApprovedFaster', 'Get approved faster!')}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t('congrats.completeSteps', 'Complete these steps to speed up your verification:')}
            </p>
            
            <ul className="space-y-4">
              {verificationItems.map((item, index) => (
                <li key={index} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center">
            <Button 
              size="xl" 
              onClick={onStartFastVerification}
              className="shadow-glow hover:shadow-medium"
            >
              <Zap className="w-5 h-5 mr-2" />
              {t('congrats.startVerification', 'Start Verification')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
