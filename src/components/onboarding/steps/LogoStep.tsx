import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { StepLayout } from '../StepLayout';
import { Sparkles, Upload, SkipForward, Loader2, Image as ImageIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoMethod } from '@/types/onboarding';

interface LogoStepProps {
  restaurantName: string;
  logoUrl?: string;
  method: LogoMethod;
  onChange: (url: string | undefined, method: LogoMethod) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function LogoStep({ 
  restaurantName, 
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

  const generateLogo = async () => {
    setIsGenerating(true);
    
    // Simulate AI logo generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a simple placeholder logo
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
    setIsGenerating(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
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
  const hasLogo = method !== 'placeholder' && currentLogo;

  return (
    <StepLayout
      title="Create your logo"
      subtitle="Get a simple logo now – you can upgrade it later."
      onNext={onNext}
      onPrevious={onPrevious}
    >
      <div className="max-w-xl mx-auto">
        <div className="grid gap-4">
          {/* AI Generation Option */}
          <div className={cn(
            "bg-card border-2 rounded-2xl p-6 transition-all",
            method === 'ai' ? "border-primary shadow-soft" : "border-border hover:border-primary/50"
          )}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-warm rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-foreground mb-1">Generate a simple logo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We'll create a clean logo with your restaurant name and Homemade colors.
                </p>
                
                {generatedLogo ? (
                  <div className="flex items-center gap-4">
                    <img 
                      src={generatedLogo} 
                      alt="Generated logo" 
                      className="w-20 h-20 rounded-xl shadow-soft"
                    />
                    <div className="flex items-center gap-2 text-forest">
                      <Check className="w-5 h-5" />
                      <span className="font-medium">Logo generated!</span>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={generateLogo}
                    disabled={isGenerating}
                    variant="outline"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate logo
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

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
