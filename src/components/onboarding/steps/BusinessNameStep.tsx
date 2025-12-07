import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StepLayout } from '../StepLayout';
import { Sparkles, Loader2, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BusinessNameStepProps {
  value: string;
  city: string;
  cuisines: string[];
  chefName?: string;
  onChange: (name: string, method: 'ai' | 'manual') => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function BusinessNameStep({ 
  value, 
  city, 
  cuisines,
  chefName = '',
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
    
    // Generate names based on cuisine and chef name
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const cuisineStr = cuisines.slice(0, 2).join(' & ');
    const primaryCuisine = cuisines[0] || 'Home';
    const namePrefix = chefName ? `${chefName}'s` : 'Chef\'s';
    
    const mockNames = [
      `${namePrefix} ${primaryCuisine} Kitchen`,
      `${cuisineStr} by ${chefName || 'Chef'}`,
      `The ${city} ${primaryCuisine} Table`,
    ];
    
    setGeneratedNames(mockNames);
    setIsGenerating(false);
  };

  // Auto-generate names on mount if we have cuisines
  useEffect(() => {
    if (cuisines.length > 0 && generatedNames.length === 0 && !isGenerating) {
      generateNames();
    }
  }, [cuisines]);

  const handleSelectName = (name: string) => {
    setSelectedOption(name);
    setShowManual(false);
    onChange(name, 'ai');
  };

  // Auto-advance after selecting a name
  useEffect(() => {
    if (selectedOption && selectedOption !== 'manual' && value) {
      const timer = setTimeout(() => {
        onNext();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [selectedOption, value, onNext]);

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
      showNext={showManual || generatedNames.length === 0}
    >
      <div className="max-w-xl mx-auto">
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-warm rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">AI-suggested names</h3>
              <p className="text-sm text-muted-foreground">Based on your cuisine{chefName ? ` and name` : ''}</p>
            </div>
          </div>

          {isGenerating ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Generating names...</span>
            </div>
          ) : generatedNames.length > 0 ? (
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
          ) : (
            <Button
              onClick={generateNames}
              disabled={isGenerating}
              variant="outline"
              className="w-full"
            >
              <Sparkles className="w-4 h-4" />
              Generate names
            </Button>
          )}
        </div>

        {showManual && (
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
              autoFocus
            />
          </div>
        )}
      </div>
    </StepLayout>
  );
}
