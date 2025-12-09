import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StepLayout } from '../StepLayout';
import { Sparkles, Upload, SkipForward, Loader2, Image as ImageIcon, Check, X, ArrowRight } from 'lucide-react';
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
  const [showGeneratingPopup, setShowGeneratingPopup] = useState(false);
  const [generatedLogo, setGeneratedLogo] = useState<string | null>(logoUrl || null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAutoStarted = useRef(false);

  // Auto-start logo generation when step loads (if no logo exists)
  useEffect(() => {
    if (!logoUrl && !generatedLogo && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      generateLogoInBackground();
    }
  }, [logoUrl, generatedLogo]);

  // Helper to upload base64 to storage and get public URL
  const uploadToStorage = async (base64Data: string, fileType: 'png' | 'svg' | 'jpg'): Promise<string | null> => {
    try {
      const fileName = `${Date.now()}-${restaurantName.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.${fileType}`;
      const filePath = `onboarding/${fileName}`;
      
      // Convert base64 to blob
      const base64Response = await fetch(base64Data);
      const blob = await base64Response.blob();
      
      const { data, error } = await supabase.storage
        .from('logos')
        .upload(filePath, blob, {
          contentType: `image/${fileType === 'svg' ? 'svg+xml' : fileType}`,
          upsert: true
        });

      if (error) {
        console.error('Storage upload error:', error);
        return null;
      }

      // Get public URL
      const { data: publicUrl } = supabase.storage
        .from('logos')
        .getPublicUrl(data.path);

      return publicUrl.publicUrl;
    } catch (err) {
      console.error('Upload to storage failed:', err);
      return null;
    }
  };

  const generateLogoInBackground = async () => {
    setIsGenerating(true);
    setShowGeneratingPopup(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-logo', {
        body: { 
          name: restaurantName, 
          cuisine: cuisines?.join(', '),
          tagline: chefName ? `By Chef ${chefName}` : undefined,
          logoStyle: 'modern minimal',
          primaryColor: '#C65D3B',
          secondaryColor: '#F2A35E',
          uploadToStorage: true,
          storageBucket: 'logos',
          storagePath: `generated/${Date.now()}-${restaurantName.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.png`,
          publicUrl: true
        }
      });

      if (error) { 
        console.error('Logo generation error:', error);
        await generatePlaceholderLogo(); 
        return; 
      }

      // Prefer uploaded URL if available, otherwise use base64
      let logoData: string | null = null;
      
      if (data?.uploaded?.url) {
        logoData = data.uploaded.url;
      } else if (data?.base64) {
        // Upload base64 to storage
        const dataUrl = `data:image/${data.type === 'svg' ? 'svg+xml' : 'png'};base64,${data.base64}`;
        logoData = await uploadToStorage(dataUrl, data.type === 'svg' ? 'svg' : 'png') || dataUrl;
      }

      if (logoData) { 
        setGeneratedLogo(logoData); 
        onChange(logoData, 'ai');
      } else { 
        await generatePlaceholderLogo(); 
      }
    } catch (err) { 
      console.error('Logo generation failed:', err);
      await generatePlaceholderLogo(); 
    } finally { 
      setIsGenerating(false);
      setShowGeneratingPopup(false);
    }
  };

  const generateLogo = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-logo', {
        body: { 
          name: restaurantName, 
          cuisine: cuisines?.join(', '),
          tagline: chefName ? `By Chef ${chefName}` : undefined,
          logoStyle: 'modern minimal',
          primaryColor: '#C65D3B',
          secondaryColor: '#F2A35E',
          uploadToStorage: true,
          storageBucket: 'logos',
          storagePath: `generated/${Date.now()}-${restaurantName.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.png`,
          publicUrl: true
        }
      });

      if (error) { 
        console.error('Logo generation error:', error);
        await generatePlaceholderLogo(); 
        return; 
      }

      let logoData: string | null = null;
      
      if (data?.uploaded?.url) {
        logoData = data.uploaded.url;
      } else if (data?.base64) {
        const dataUrl = `data:image/${data.type === 'svg' ? 'svg+xml' : 'png'};base64,${data.base64}`;
        logoData = await uploadToStorage(dataUrl, data.type === 'svg' ? 'svg' : 'png') || dataUrl;
      }

      if (logoData) { 
        setGeneratedLogo(logoData); 
        onChange(logoData, 'ai');
        toast({ title: "Logo generated!", description: "Your brand logo is ready" });
      } else { 
        await generatePlaceholderLogo(); 
      }
    } catch (err) { 
      console.error('Logo generation failed:', err);
      await generatePlaceholderLogo(); 
    } finally { 
      setIsGenerating(false); 
    }
  };

  const generatePlaceholderLogo = async () => {
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
    
    // Try to upload placeholder to storage
    const storedUrl = await uploadToStorage(logoDataUrl, 'png');
    const finalUrl = storedUrl || logoDataUrl;
    
    setGeneratedLogo(finalUrl); 
    onChange(finalUrl, 'ai');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        toast({ title: "File too large", description: "Maximum file size is 5MB", variant: "destructive" }); 
        return; 
      }
      
      const reader = new FileReader();
      reader.onload = async (event) => { 
        const base64Data = event.target?.result as string;
        setUploadedFile(file);
        setGeneratedLogo(null);
        
        // Upload to storage
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const normalizedExt = fileExt === 'jpeg' ? 'jpg' : (fileExt as 'png' | 'jpg' | 'svg') || 'png';
        const storedUrl = await uploadToStorage(base64Data, normalizedExt);
        const finalUrl = storedUrl || base64Data;
        
        onChange(finalUrl, 'upload'); 
        setGeneratedLogo(finalUrl);
        toast({ title: "Logo uploaded!", description: "Your logo has been saved" });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSkip = () => { onChange(undefined, 'placeholder'); onNext(); };
  const currentLogo = generatedLogo || logoUrl;

  return (
    <StepLayout title={t('logo.title')} subtitle={t('logo.subtitle')} onNext={onNext} onPrevious={onPrevious} showNext={!isGenerating}>
      {/* Generating Popup Notification */}
      {showGeneratingPopup && (
        <div className="fixed top-4 right-4 z-50 bg-card border border-border rounded-xl p-4 shadow-lg animate-slide-in-right max-w-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground text-sm">Creating your logo ✨</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Your logo is being crafted in the background. You can proceed to the next step!
              </p>
              <Button 
                size="sm" 
                className="mt-3" 
                onClick={() => {
                  setShowGeneratingPopup(false);
                  onNext();
                }}
              >
                Continue <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <button 
              onClick={() => setShowGeneratingPopup(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto">
        {isGenerating && !showGeneratingPopup ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
              <span className="absolute -top-2 -right-2 text-2xl animate-bounce">✨</span>
            </div>
            <p className="text-muted-foreground text-lg">{t('logo.generating')}</p>
          </div>
        ) : currentLogo ? (
          <div className="flex flex-col items-center mb-8 animate-scale-in">
            <div className="relative">
              <img src={currentLogo} alt="Your logo" className="w-40 h-40 rounded-2xl shadow-glow object-cover border-4 border-primary/20" />
              <span className="absolute -top-3 -right-3 text-3xl animate-bounce">🎉</span>
            </div>
            <div className="flex items-center gap-2 text-forest mt-4">
              <Check className="w-6 h-6" />
              <span className="font-semibold text-lg">{t('logo.ready')}</span>
            </div>
            <p className="text-muted-foreground mt-2 text-center">{t('logo.firstImpression')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12">
            <div className="relative mb-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <span className="absolute -top-1 -right-1 text-xl animate-bounce">✨</span>
            </div>
            <p className="text-muted-foreground">Generating your logo...</p>
          </div>
        )}
        
        <div className="grid gap-4">
          {currentLogo && (
            <Button onClick={generateLogo} disabled={isGenerating} variant="outline" className="w-full">
              <Sparkles className="w-4 h-4" />{t('logo.regenerate')}
            </Button>
          )}
          <div className={cn("bg-card border-2 rounded-2xl p-6 transition-all", method === 'upload' ? "border-primary shadow-soft" : "border-border hover:border-primary/50")}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-forest-light rounded-xl flex items-center justify-center flex-shrink-0">
                <Upload className="w-6 h-6 text-forest" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-foreground mb-1">{t('logo.uploadOwn')}</h3>
                <p className="text-sm text-muted-foreground mb-4">PNG, JPG, or SVG • Max 5 MB</p>
                <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.svg" onChange={handleFileChange} className="hidden" />
                {uploadedFile && method === 'upload' ? (
                  <div className="flex items-center gap-4">
                    {currentLogo && <img src={currentLogo} alt="Uploaded logo" className="w-20 h-20 rounded-xl shadow-soft object-cover" />}
                    <button onClick={() => fileInputRef.current?.click()} className="text-primary hover:underline text-sm">Replace</button>
                  </div>
                ) : (
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                    <ImageIcon className="w-4 h-4" />Choose file
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-6">
          <button onClick={handleSkip} className="text-muted-foreground hover:text-foreground text-sm inline-flex items-center gap-2 transition-colors">
            <SkipForward className="w-4 h-4" />{t('steps.skip')}
          </button>
        </div>
      </div>
    </StepLayout>
  );
}
