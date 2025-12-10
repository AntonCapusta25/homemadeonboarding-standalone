import { useTranslation } from 'react-i18next';
import { ChefHat, Sparkles, Utensils } from 'lucide-react';

interface MenuGeneratingIndicatorProps {
  isVisible: boolean;
}

export function MenuGeneratingIndicator({ isVisible }: MenuGeneratingIndicatorProps) {
  const { t } = useTranslation();

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 flex items-center gap-3 max-w-xs">
        {/* Animated icon */}
        <div className="relative w-10 h-10 flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30 animate-[spin_4s_linear_infinite]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-primary animate-[bounce_1.5s_ease-in-out_infinite]" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-amber-400 animate-[ping_1.5s_ease-in-out_infinite]" />
        </div>
        
        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {t('onboarding.menuGenerating', 'Generating your menu...')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('onboarding.menuGeneratingSubtitle', 'This may take a moment')}
          </p>
        </div>

        {/* Animated dots */}
        <div className="flex items-center gap-0.5">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0s' }} />
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0.1s' }} />
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
}
