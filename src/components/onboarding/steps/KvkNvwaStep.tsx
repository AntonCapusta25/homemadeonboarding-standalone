import { useRef, useState, useEffect } from 'react';
import { StepLayout } from '../StepLayout';
import { Building2, AlertCircle, FileText, Upload, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KvkStatus } from '@/types/onboarding';
import { Button } from '@/components/ui/button';

interface KvkNvwaStepProps {
  value: KvkStatus;
  docsUrl?: string;
  onChange: (status: KvkStatus, docsUrl?: string) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const OPTIONS: { value: KvkStatus; title: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'kvk_nvwa_both',
    title: 'I already have KVK & NVWA',
    description: 'Great! You\'re ready to start selling.',
    icon: <Check className="w-6 h-6" />,
  },
  {
    value: 'kvk_only',
    title: 'I have KVK but not NVWA',
    description: 'You\'re halfway there. We\'ll help you complete NVWA registration.',
    icon: <Building2 className="w-6 h-6" />,
  },
  {
    value: 'none',
    title: 'I\'m not registered yet',
    description: 'No problem. Homemade will guide you step by step before you start selling.',
    icon: <AlertCircle className="w-6 h-6" />,
  },
  {
    value: 'try_first',
    title: 'I want to try it out first',
    description: 'Explore the platform before starting registration. We\'ll remind you later.',
    icon: <Clock className="w-6 h-6" />,
  },
];

export function KvkNvwaStep({ value, docsUrl, onChange, onNext, onPrevious }: KvkNvwaStepProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setUploadedFile(file);
        onChange(value, url);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelect = (status: KvkStatus) => {
    onChange(status, status === 'kvk_nvwa_both' ? docsUrl : undefined);
  };

  // Auto-advance for simple options
  useEffect(() => {
    if (value && value !== 'kvk_nvwa_both') {
      const timer = setTimeout(() => {
        onNext();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [value, onNext]);

  return (
    <StepLayout
      title="KVK & NVWA registration"
      subtitle="Don't worry if you're not registered yet – we'll guide you."
      onNext={onNext}
      onPrevious={onPrevious}
    >
      <div className="max-w-xl mx-auto">
        <p className="text-center text-foreground font-medium mb-6">
          What is your current registration status?
        </p>

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
                  value={option.value}
                  checked={value === option.value}
                  onChange={() => handleSelect(option.value)}
                  className="sr-only"
                />
                
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                  value === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}>
                  {option.icon}
                </div>
                
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-foreground mb-1">
                    {option.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>

                  {value === 'kvk_nvwa_both' && option.value === 'kvk_nvwa_both' && (
                    <div className="mt-4 animate-slide-up">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      
                      {uploadedFile ? (
                        <div className="flex items-center gap-3 p-3 bg-forest-light rounded-xl">
                          <FileText className="w-5 h-5 text-forest" />
                          <span className="text-sm text-forest font-medium flex-1 truncate">
                            {uploadedFile.name}
                          </span>
                          <Check className="w-5 h-5 text-forest" />
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4" />
                          Upload documents (optional)
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                  value === option.value ? "border-primary bg-primary" : "border-muted-foreground"
                )}>
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
