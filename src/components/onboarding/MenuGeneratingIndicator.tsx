import { useTranslation } from 'react-i18next';
import { ChefHat, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';

interface MenuGeneratingIndicatorProps {
  isVisible: boolean;
}

const ESTIMATED_TIME_SECONDS = 15;

export function MenuGeneratingIndicator({ isVisible }: MenuGeneratingIndicatorProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        // Progress approaches 95% asymptotically to never reach 100% before completion
        const newProgress = Math.min(95, (next / ESTIMATED_TIME_SECONDS) * 100);
        setProgress(newProgress);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const remainingSeconds = Math.max(0, ESTIMATED_TIME_SECONDS - elapsedSeconds);
  const timeText = remainingSeconds > 0 
    ? t('onboarding.menuTimeRemaining', '~{{seconds}}s remaining', { seconds: remainingSeconds })
    : t('onboarding.menuAlmostDone', 'Almost done...');

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 flex flex-col gap-3 w-72">
        <div className="flex items-center gap-3">
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
              {timeText}
            </p>
          </div>

          {/* Animated dots */}
          <div className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0s' }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0.1s' }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>
        
        {/* Progress bar */}
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  );
}
