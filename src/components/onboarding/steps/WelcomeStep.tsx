import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Clock, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/Logo';

interface WelcomeStepProps {
  onStart: () => void;
}

export function WelcomeStep({ onStart }: WelcomeStepProps) {
  const { t } = useTranslation();
  
  return (
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

      <Button 
        size="xl" 
        onClick={onStart}
        className="animate-slide-up shadow-glow hover:shadow-medium"
        style={{ animationDelay: '0.3s' }}
      >
        {t('welcome.getStarted')} 👨‍🍳
        <ArrowRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
