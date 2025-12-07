import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface StepLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  onNext?: () => void;
  onPrevious?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  nextLabel?: string;
  isNextDisabled?: boolean;
  showNext?: boolean;
  className?: string;
}

export function StepLayout({
  title,
  subtitle,
  children,
  onNext,
  onPrevious,
  canGoNext = true,
  canGoPrevious = true,
  nextLabel,
  isNextDisabled = false,
  showNext = true,
  className,
}: StepLayoutProps) {
  const { t } = useTranslation();
  
  return (
    <div className={cn("flex flex-col h-full animate-fade-in", className)}>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 animate-slide-up">
          {title}
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {subtitle}
        </p>
      </div>

      <div className="flex-1 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        {children}
      </div>

      <div className="flex justify-between items-center pt-8 mt-auto border-t border-border">
        {canGoPrevious && onPrevious ? (
          <Button
            variant="ghost"
            onClick={onPrevious}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('steps.back')}
          </Button>
        ) : (
          <div />
        )}

        {canGoNext && onNext && showNext && (
          <Button
            onClick={onNext}
            disabled={isNextDisabled}
            size="lg"
            className="gap-2 min-w-[140px]"
          >
            {nextLabel || t('steps.next')}
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
