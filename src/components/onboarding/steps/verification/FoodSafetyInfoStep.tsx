import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ArrowLeft, ExternalLink, CheckCircle } from 'lucide-react';

interface FoodSafetyInfoStepProps {
  onComplete: () => void;
  onPrevious: () => void;
}

export function FoodSafetyInfoStep({ onComplete, onPrevious }: FoodSafetyInfoStepProps) {
  const { t } = useTranslation();

  const safetyPoints = [
    t('verification.safetyPoint1', 'Proper food storage temperatures'),
    t('verification.safetyPoint2', 'Cross-contamination prevention'),
    t('verification.safetyPoint3', 'Personal hygiene requirements'),
    t('verification.safetyPoint4', 'Allergen information labeling'),
    t('verification.safetyPoint5', 'Kitchen cleanliness standards'),
  ];

  const handleOpenFoodSafety = () => {
    // Open external food safety training website
    window.open('https://www.nvwa.nl/onderwerpen/hygienecode', '_blank');
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
          {t('verification.foodSafetyTitle', 'Food Safety is Important')}
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          {t('verification.foodSafetyDesc', 'As a home chef, food safety is your top priority. Learn about the requirements.')}
        </p>
      </div>

      <div className="flex-1">
        {/* Info card */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-3">
            {t('verification.whyImportant', 'Why is food safety important?')}
          </h3>
          <p className="text-amber-700 dark:text-amber-300 text-sm mb-4">
            {t('verification.safetyExplanation', 'Food safety ensures your customers stay healthy and your business stays compliant with Dutch regulations. All home chefs must follow HACCP guidelines.')}
          </p>
        </div>

        {/* Key points */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h3 className="font-semibold text-foreground mb-4">
            {t('verification.keyTopics', 'Key topics you should know:')}
          </h3>
          <ul className="space-y-3">
            {safetyPoints.map((point, index) => (
              <li key={index} className="flex items-center gap-3 text-muted-foreground">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA to external site */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {t('verification.learnMore', 'Ready to learn more about food safety requirements?')}
          </p>
          <Button 
            onClick={handleOpenFoodSafety}
            size="lg"
            className="mb-6"
          >
            <ShieldCheck className="w-5 h-5 mr-2" />
            {t('verification.openFoodSafetyGuide', 'Open Food Safety Guide')}
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <div className="flex justify-between pt-8 mt-auto border-t border-border">
        <Button variant="ghost" onClick={onPrevious}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back', 'Back')}
        </Button>
        <Button onClick={onComplete} size="lg" variant="default">
          {t('verification.finishAndGo', 'Finish & Go to Dashboard')}
        </Button>
      </div>
    </div>
  );
}
