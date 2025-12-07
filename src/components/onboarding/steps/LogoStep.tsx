import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StepLayout } from '../StepLayout';
import { Sparkles, Upload, SkipForward, Loader2, Image as ImageIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoMethod } from '@/types/onboarding';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  restaurantName,
  cuisines,
  chefName,
  logoUrl, 
  method, 
  onChange, 
  onNext, 
  onPrevious 
}: LogoStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLogo, setGeneratedLogo] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate logo on mount
  useEffect(() => {
    if (restaurantName && cuisines.length > 0 && !generatedLogo && !isGenerating && method === 'placeholder') {
      generateLogo();
    }
  }, [restaurantName, cuisines]);

  const generateLogo = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-logo', {
        body: { 
          restaurantName, 
          cuisines,
          chefName 
        }
      });

      if (error) {
        console.error('Logo generation error:', error);
        // Fall back to placeholder
        generatePlaceholderLogo();
        return;
      }

      if (data?.logoUrl) {
        setGeneratedLogo(data.logoUrl);
        onChange(data.logoUrl, 'ai');
      } else {
        generatePlaceholderLogo();
      }
    } catch (err) {
      console.error('Logo generation failed:', err);
      toast({
        title: "Couldn't generate AI logo",
        description: "Using a simple logo instead. You can upload your own later.",
        variant: "destructive"
      });
      generatePlaceholderLogo();
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePlaceholderLogo = () => {
    // Generate a simple placeholder logo using canvas
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 200, 200);
      gradient.addColorStop(0, '#E07A5F');
      gradient.addColorStop(1, '#F2A35E');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(0, 0, 200, 200, 30);
      ctx.fill();
      
      // Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 48px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const initials = restaurantName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
      ctx.fillText(initials || 'HC', 100, 100);
    }
    
    const logoDataUrl = canvas.toDataURL('image/png');
    setGeneratedLogo(logoDataUrl);
    onChange(logoDataUrl, 'ai');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please choose a file under 5MB",
          variant: "destructive"
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setUploadedFile(file);
        setGeneratedLogo(null);
        onChange(url, 'upload');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSkip = () => {
    onChange(undefined, 'placeholder');
    onNext();
  };

  const currentLogo = generatedLogo || logoUrl;

  // Auto-advance after logo is generated
  useEffect(() => {
    if (currentLogo && method === 'ai' && !isGenerating) {
      const timer = setTimeout(() => {
        onNext();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentLogo, method, isGenerating, onNext]);

  return (
    <StepLayout
      title="Create your logo"
      subtitle="We're generating a logo based on your restaurant. You can change it anytime."
      onNext={onNext}
      onPrevious={onPrevious}
      showNext={!isGenerating}
    >
      <div className="max-w-xl mx-auto">
        {/* Logo Preview */}
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Generating your logo with AI...</p>
          </div>
        ) : currentLogo ? (
          <div className="flex flex-col items-center mb-8 animate-scale-in">
            <img 
              src={currentLogo} 
              alt="Your logo" 
              className="w-32 h-32 rounded-2xl shadow-glow mb-4 object-cover"
            />
            <div className="flex items-center gap-2 text-forest">
              <Check className="w-5 h-5" />
              <span className="font-medium">Logo ready!</span>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4">
          {/* Regenerate Option */}
          {currentLogo && (
            <Button
              onClick={generateLogo}
              disabled={isGenerating}
              variant="outline"
              className="w-full"
            >
              <Sparkles className="w-4 h-4" />
              Generate a different logo
            </Button>
          )}

          {/* Upload Option */}
          <div className={cn(
            "bg-card border-2 rounded-2xl p-6 transition-all",
            method === 'upload' ? "border-primary shadow-soft" : "border-border hover:border-primary/50"
          )}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-forest-light rounded-xl flex items-center justify-center flex-shrink-0">
                <Upload className="w-6 h-6 text-forest" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-foreground mb-1">Upload my own logo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  PNG, JPG, or SVG • Max 5 MB
                </p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {uploadedFile && method === 'upload' ? (
                  <div className="flex items-center gap-4">
                    {logoUrl && (
                      <img 
                        src={logoUrl} 
                        alt="Uploaded logo" 
                        className="w-20 h-20 rounded-xl shadow-soft object-cover"
                      />
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary hover:underline text-sm"
                    >
                      Replace file
                    </button>
                  </div>
                ) : (
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Choose file
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Skip Option */}
        <div className="text-center mt-6">
          <button
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground text-sm inline-flex items-center gap-2 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
            Skip, I'll add a logo later
          </button>
        </div>
      </div>
    </StepLayout>
  );
}
