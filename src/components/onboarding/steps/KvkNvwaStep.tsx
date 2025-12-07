import { StepLayout } from '../StepLayout';
import { Building2, AlertCircle, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KvkStatus } from '@/types/onboarding';
import { useTranslation } from 'react-i18next';

interface KvkNvwaStepProps {
  value: KvkStatus;
  docsUrl?: string;
  onChange: (status: KvkStatus, docsUrl?: string) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function KvkNvwaStep({ value, docsUrl, onChange, onNext, onPrevious }: KvkNvwaStepProps) {
  const { t } = useTranslation();

  const OPTIONS: { value: KvkStatus; titleKey: string; descKey: string; icon: React.ReactNode }[] = [
    {
      value: 'kvk_nvwa_both',
      titleKey: 'kvk.haveKvkNvwa',
      descKey: 'kvk.haveKvkNvwaDesc',
      icon: <Check className="w-6 h-6" />,
    },
    {
      value: 'kvk_only',
      titleKey: 'kvk.haveKvk',
      descKey: 'kvk.haveKvkDesc',
      icon: <Building2 className="w-6 h-6" />,
    },
    {
      value: 'none',
      titleKey: 'kvk.noKvk',
      descKey: 'kvk.noKvkDesc',
      icon: <AlertCircle className="w-6 h-6" />,
    },
    {
      value: 'try_first',
      titleKey: 'kvk.tryFirst',
      descKey: 'kvk.tryFirstDesc',
      icon: <Clock className="w-6 h-6" />,
    },
  ];

  return (
    <StepLayout
      title={t('kvk.title')}
      subtitle={t('kvk.subtitle')}
      onNext={onNext}
      onPrevious={onPrevious}
    >
      <div className="max-w-xl mx-auto">
        <div className="grid gap-4">
          {OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "block p-5 rounded-2xl border-2 cursor-pointer transition-all",
                value === option.value
                  ? "border-primary bg-terracotta-light shadow-soft"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div className="flex items-start gap-4">
                <input
                  type="radio"
                  name="kvk-status"
                  checked={value === option.value}
                  onChange={() =>
                    onChange(
                      option.value,
                      option.value === 'kvk_nvwa_both' ? docsUrl : undefined
                    )
                  }
                  className="sr-only"
                />
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                    value === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {option.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-foreground">
                    {t(option.titleKey)}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t(option.descKey)}
                  </p>
                </div>
                <div
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                    value === option.value
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  )}
                >
                  {value === option.value && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </StepLayout>
  );
}
