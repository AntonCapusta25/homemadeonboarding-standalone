import { useTranslation } from 'react-i18next';
import { Utensils, ChefHat, Sparkles } from 'lucide-react';

interface CoolLoaderProps {
  message?: string;
}

export const CoolLoader = ({ message }: CoolLoaderProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      {/* Animated plates */}
      <div className="relative w-32 h-32 mb-8">
        {/* Outer rotating ring */}
        <div className="absolute inset-0 rounded-full border-4 border-dashed border-primary/30 animate-[spin_8s_linear_infinite]" />
        
        {/* Middle pulsing ring */}
        <div className="absolute inset-3 rounded-full bg-primary/10 animate-[pulse_2s_ease-in-out_infinite]" />
        
        {/* Center chef hat */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <ChefHat className="w-12 h-12 text-primary animate-[bounce_2s_ease-in-out_infinite]" />
            <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-amber-400 animate-[ping_1.5s_ease-in-out_infinite]" />
          </div>
        </div>

        {/* Orbiting utensils */}
        <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
          <Utensils className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 text-forest" />
        </div>
        <div className="absolute inset-0 animate-[spin_4s_linear_infinite_reverse]">
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary rounded-full" />
        </div>
      </div>

      {/* Loading text with typing effect */}
      <div className="text-center space-y-2">
        <p className="font-display text-lg font-semibold text-foreground">
          {message || t('dashboard.loading')}
        </p>
        <div className="flex items-center justify-center gap-1">
          <span className="w-2 h-2 bg-primary rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0s' }} />
          <span className="w-2 h-2 bg-primary rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0.1s' }} />
          <span className="w-2 h-2 bg-primary rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
};
