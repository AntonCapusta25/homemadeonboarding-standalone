import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StepLayout } from '../StepLayout';
import { Sparkles, Loader2, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BusinessNameStepProps {
  value: string;
  city: string;
  cuisines: string[];
  onChange: (name: string, method: 'ai' | 'manual') => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function BusinessNameStep({ 
  value, 
  city, 
  cuisines, 
  onChange, 
  onNext, 
  onPrevious 
}: BusinessNameStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNames, setGeneratedNames] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [showManual, setShowManual] = useState(false);

  const generateNames = async () => {
    setIsGenerating(true);
    
    // Simulating AI generation - in production this would call an API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const cuisineStr = cuisines.slice(0, 2).join(' & ');
    const mockNames = [
      `${cuisineStr} Kitchen ${city}`,
      `The ${city} ${cuisines[0] || 'Home'} Table`,
      `Homemade ${cuisines[0] || 'Flavors'} by Chef`,
    ];
    
    setGeneratedNames(mockNames);
    setIsGenerating(false);
  };

  const handleSelectName = (name: string) => {
    setSelectedOption(name);
    setShowManual(false);
    onChange(name, 'ai');
  };

  const handleManualSelect = () => {
    setSelectedOption('manual');
    setShowManual(true);
    onChange(manualName, 'manual');
  };

  const handleManualChange = (val: string) => {
    setManualName(val);
    onChange(val, 'manual');
  };

  const isValid = value.trim().length > 0;

  return (
    <StepLayout
      title="Let's name your restaurant"
      subtitle="We'll suggest a few names based on your cuisine. You can change them anytime."
      onNext={onNext}
      onPrevious={onPrevious}
      isNextDisabled={!isValid}
    >
      <div className="max-w-xl mx-auto">
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-warm rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">Let AI suggest your name</h3>
              <p className="text-sm text-muted-foreground">Based on your city and cuisine</p>
            </div>
          </div>

          {generatedNames.length === 0 ? (
            <Button
              onClick={generateNames}
              disabled={isGenerating}
              variant="outline"
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating names...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate names
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              {generatedNames.map((name, idx) => (
                <label
                  key={idx}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    selectedOption === name
                      ? "border-primary bg-terracotta-light"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <input
                    type="radio"
                    name="restaurant-name"
                    checked={selectedOption === name}
                    onChange={() => handleSelectName(name)}
                    className="sr-only"
                  />
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    selectedOption === name ? "border-primary bg-primary" : "border-muted-foreground"
                  )}>
                    {selectedOption === name && (
                      <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                  <span className="font-medium text-foreground">{name}</span>
                </label>
              ))}

              <label
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  selectedOption === 'manual'
                    ? "border-primary bg-terracotta-light"
                    : "border-border hover:border-primary/50"
                )}
              >
                <input
                  type="radio"
                  name="restaurant-name"
                  checked={selectedOption === 'manual'}
                  onChange={handleManualSelect}
                  className="sr-only"
                />
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  selectedOption === 'manual' ? "border-primary bg-primary" : "border-muted-foreground"
                )}>
                  {selectedOption === 'manual' && (
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
                <span className="font-medium text-foreground">I want to type my own name</span>
              </label>
            </div>
          )}
        </div>

        {(showManual || generatedNames.length === 0) && (
          <div className="animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <Store className="w-5 h-5 text-muted-foreground" />
              <label className="text-sm font-medium text-foreground">
                Restaurant name
              </label>
            </div>
            <Input
              type="text"
              placeholder="Enter your restaurant name"
              value={manualName}
              onChange={(e) => handleManualChange(e.target.value)}
              autoFocus={showManual}
            />
            {generatedNames.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Or <button onClick={generateNames} className="text-primary hover:underline">generate AI suggestions</button>
              </p>
            )}
          </div>
        )}
      </div>
    </StepLayout>
  );
}
