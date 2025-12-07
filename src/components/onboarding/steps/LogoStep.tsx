import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StepLayout } from '../StepLayout';
import { Sparkles, Upload, SkipForward, Loader2, Image as ImageIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoMethod } from '@/types/onboarding';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface LogoStepProps {
  restaurantName: string;
  cuisines: string[];
  chefName?: string;
  logoUrl?: string;
  method: LogoMethod;
  onChange: (url: string | undefined, method: LogoMethod) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function LogoStep({ 
  restaurantName, cuisines, chefName, logoUrl, method, onChange, onNext, onPrevious 
}: LogoStepProps) {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLogo, setGeneratedLogo] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (restaurantName && cuisines.length > 0 && !generatedLogo && !isGenerating && method === 'placeholder') {
      generateLogo();
    }
  }, [restaurantName, cuisines]);

  const generateLogo = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-logo', {
        body: { restaurantName, cuisines, chefName }
      });
      if (error) { generatePlaceholderLogo(); return; }
      if (data?.logoUrl) { setGeneratedLogo(data.logoUrl); onChange(data.logoUrl, 'ai'); }
      else { generatePlaceholderLogo(); }
    } catch { generatePlaceholderLogo(); }
    finally { setIsGenerating(false); }
  };

  const generatePlaceholderLogo = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 200; canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 200, 200);
      gradient.addColorStop(0, '#E07A5F'); gradient.addColorStop(1, '#F2A35E');
      ctx.fillStyle = gradient; ctx.beginPath(); ctx.roundRect(0, 0, 200, 200, 30); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 48px Outfit, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const initials = restaurantName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
      ctx.fillText(initials || 'HC', 100, 100);
    }
    const logoDataUrl = canvas.toDataURL('image/png');
    setGeneratedLogo(logoDataUrl); onChange(logoDataUrl, 'ai');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large", variant: "destructive" }); return; }
      const reader = new FileReader();
      reader.onload = (event) => { setUploadedFile(file); setGeneratedLogo(null); onChange(event.target?.result as string, 'upload'); };
      reader.readAsDataURL(file);
    }
  };

  const handleSkip = () => { onChange(undefined, 'placeholder'); onNext(); };
  const currentLogo = generatedLogo || logoUrl;

  return (
    <StepLayout title={t('logo.title')} subtitle={t('logo.subtitle')} onNext={onNext} onPrevious={onPrevious} showNext={!isGenerating}>
      <div className="max-w-xl mx-auto">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative"><Loader2 className="w-16 h-16 animate-spin text-primary mb-4" /><span className="absolute -top-2 -right-2 text-2xl animate-bounce">✨</span></div>
            <p className="text-muted-foreground text-lg">{t('logo.generating')}</p>
          </div>
        ) : currentLogo ? (
          <div className="flex flex-col items-center mb-8 animate-scale-in">
            <div className="relative"><img src={currentLogo} alt="Your logo" className="w-40 h-40 rounded-2xl shadow-glow object-cover border-4 border-primary/20" /><span className="absolute -top-3 -right-3 text-3xl animate-bounce">🎉</span></div>
            <div className="flex items-center gap-2 text-forest mt-4"><Check className="w-6 h-6" /><span className="font-semibold text-lg">{t('logo.ready')}</span></div>
            <p className="text-muted-foreground mt-2 text-center">{t('logo.firstImpression')}</p>
          </div>
        ) : null}
        <div className="grid gap-4">
          {currentLogo && <Button onClick={generateLogo} disabled={isGenerating} variant="outline" className="w-full"><Sparkles className="w-4 h-4" />{t('logo.regenerate')}</Button>}
          <div className={cn("bg-card border-2 rounded-2xl p-6 transition-all", method === 'upload' ? "border-primary shadow-soft" : "border-border hover:border-primary/50")}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-forest-light rounded-xl flex items-center justify-center flex-shrink-0"><Upload className="w-6 h-6 text-forest" /></div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-foreground mb-1">{t('logo.uploadOwn')}</h3>
                <p className="text-sm text-muted-foreground mb-4">PNG, JPG, or SVG • Max 5 MB</p>
                <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.svg" onChange={handleFileChange} className="hidden" />
                {uploadedFile && method === 'upload' ? (
                  <div className="flex items-center gap-4">{logoUrl && <img src={logoUrl} alt="Uploaded logo" className="w-20 h-20 rounded-xl shadow-soft object-cover" />}<button onClick={() => fileInputRef.current?.click()} className="text-primary hover:underline text-sm">Replace</button></div>
                ) : <Button onClick={() => fileInputRef.current?.click()} variant="outline"><ImageIcon className="w-4 h-4" />Choose file</Button>}
              </div>
            </div>
          </div>
        </div>
        <div className="text-center mt-6"><button onClick={handleSkip} className="text-muted-foreground hover:text-foreground text-sm inline-flex items-center gap-2 transition-colors"><SkipForward className="w-4 h-4" />{t('steps.skip')}</button></div>
      </div>
    </StepLayout>
  );
}
