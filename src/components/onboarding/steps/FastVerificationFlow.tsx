import { useState } from 'react';
import { ChefProfile } from '@/types/onboarding';
import { MenuReviewStep } from './verification/MenuReviewStep';
import { DocumentUploadStep } from './verification/DocumentUploadStep';
import { FoodSafetyInfoStep } from './verification/FoodSafetyInfoStep';
import { ProgressBar } from '../ProgressBar';

interface FastVerificationFlowProps {
  profile: ChefProfile;
  onUpdateProfile: (updates: Partial<ChefProfile>) => void;
  onComplete: () => void;
}

type VerificationStep = 'menu-review' | 'documents' | 'food-safety';

const STEPS: VerificationStep[] = ['menu-review', 'documents', 'food-safety'];

export function FastVerificationFlow({ profile, onUpdateProfile, onComplete }: FastVerificationFlowProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = STEPS[currentStepIndex];
  
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const goToNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const goToPrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'menu-review':
        return (
          <MenuReviewStep
            profile={profile}
            onUpdateProfile={onUpdateProfile}
            onNext={goToNext}
            onSkip={goToNext}
          />
        );
      case 'documents':
        return (
          <DocumentUploadStep
            profile={profile}
            onUpdateProfile={onUpdateProfile}
            onNext={goToNext}
            onPrevious={goToPrevious}
            onSkip={goToNext}
          />
        );
      case 'food-safety':
        return (
          <FoodSafetyInfoStep
            onComplete={onComplete}
            onPrevious={goToPrevious}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <ProgressBar
            progress={progress}
            currentStep={currentStepIndex + 1}
            totalSteps={STEPS.length}
          />
        </div>

        <div className="min-h-[calc(100vh-16rem)]">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
