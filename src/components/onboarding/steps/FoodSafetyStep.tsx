import { useRef, useState } from 'react';
import { StepLayout } from '../StepLayout';
import { ShieldCheck, GraduationCap, Upload, Check, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FoodSafetyStatus } from '@/types/onboarding';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface FoodSafetyStepProps {
  value: FoodSafetyStatus;
  certificateUrl?: string;
  onChange: (status: FoodSafetyStatus, certificateUrl?: string) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function FoodSafetyStep({ value, certificateUrl, onChange, onNext, onPrevious }: FoodSafetyStepProps) {
  const { t } = useTranslation();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => { setUploadedFile(file); onChange('has_certificate', event.target?.result as string); };
      reader.readAsDataURL(file);
    }
  };

  return (
    <StepLayout title={t('foodSafety.title')} subtitle={t('foodSafety.subtitle')} onNext={onNext} onPrevious={onPrevious}>
      <div className="max-w-xl mx-auto">
        <div className="grid gap-4">
          <label className={cn("block p-5 rounded-2xl border-2 cursor-pointer transition-all", value === 'has_certificate' ? "border-primary bg-terracotta-light shadow-soft" : "border-border bg-card hover:border-primary/50")}>
            <div className="flex items-start gap-4">
              <input type="radio" name="food-safety" checked={value === 'has_certificate'} onChange={() => onChange('has_certificate', certificateUrl)} className="sr-only" />
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors", value === 'has_certificate' ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}><ShieldCheck className="w-6 h-6" /></div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-foreground mb-1">{t('foodSafety.haveCertificate')}</h3>
                {value === 'has_certificate' && (
                  <div className="mt-4 animate-slide-up">
                    <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} className="hidden" />
                    {uploadedFile ? (
                      <div className="flex items-center gap-3 p-3 bg-forest-light rounded-xl"><FileText className="w-5 h-5 text-forest" /><span className="text-sm text-forest font-medium flex-1 truncate">{uploadedFile.name}</span><Check className="w-5 h-5 text-forest" /></div>
                    ) : <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4" />{t('foodSafety.uploadCertificate')}</Button>}
                  </div>
                )}
              </div>
              <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0", value === 'has_certificate' ? "border-primary bg-primary" : "border-muted-foreground")}>{value === 'has_certificate' && <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />}</div>
            </div>
          </label>
          <label className={cn("block p-5 rounded-2xl border-2 cursor-pointer transition-all", value === 'needs_training' ? "border-primary bg-terracotta-light shadow-soft" : "border-border bg-card hover:border-primary/50")}>
            <div className="flex items-start gap-4">
              <input type="radio" name="food-safety" checked={value === 'needs_training'} onChange={() => { setUploadedFile(null); onChange('needs_training', undefined); }} className="sr-only" />
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors", value === 'needs_training' ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}><GraduationCap className="w-6 h-6" /></div>
              <div className="flex-1"><h3 className="font-display font-semibold text-foreground mb-1">{t('foodSafety.noCertificate')}</h3></div>
              <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0", value === 'needs_training' ? "border-primary bg-primary" : "border-muted-foreground")}>{value === 'needs_training' && <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />}</div>
            </div>
          </label>
        </div>
      </div>
    </StepLayout>
  );
}
