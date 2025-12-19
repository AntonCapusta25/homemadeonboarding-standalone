import { useState, useEffect } from 'react';
import { ChefProfile } from '@/types/onboarding';
import { MenuReviewStep } from './verification/MenuReviewStep';
import { DocumentUploadStep } from './verification/DocumentUploadStep';
import { FoodSafetyInfoStep } from './verification/FoodSafetyInfoStep';
import { KitchenVerificationStep } from './verification/KitchenVerificationStep';
import { VerificationCongratsStep } from './verification/VerificationCongratsStep';
import { ProgressBar } from '../ProgressBar';
import { supabase } from '@/integrations/supabase/client';
import { useVerification } from '@/hooks/useVerification';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ContactButtons } from '@/components/onboarding/ContactButtons';
import { ApplicationDashboard } from '@/components/onboarding/ApplicationDashboard';

interface FastVerificationFlowProps {
  profile: ChefProfile;
  onUpdateProfile: (updates: Partial<ChefProfile>) => void;
  onComplete: () => void;
}

// Steps: Menu Review -> Food Safety -> Upload ID -> Kitchen Check -> Congrats
type VerificationStep = 'menu-review' | 'food-safety' | 'upload-id' | 'kitchen-check' | 'congrats';

const STEPS: VerificationStep[] = ['menu-review', 'food-safety', 'upload-id', 'kitchen-check', 'congrats'];

export function FastVerificationFlow({ profile, onUpdateProfile, onComplete }: FastVerificationFlowProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [chefProfileId, setChefProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  const { getOrCreateProgress, updateProgress, progress } = useVerification();
  
  const currentStep = STEPS[currentStepIndex];

  // Load chef profile and verification progress
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: chefProfile } = await supabase
          .from('chef_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (chefProfile) {
          setChefProfileId(chefProfile.id);
          const verificationProgress = await getOrCreateProgress(chefProfile.id);
          
          // If already completed, go directly to congrats
          if (verificationProgress?.verificationCompleted) {
            setCurrentStepIndex(4); // congrats step
            setLoading(false);
            return;
          }
          
          // Resume from last completed step
          if (verificationProgress) {
            if (verificationProgress.kitchenVerified) {
              // Kitchen done - go to congrats
              setCurrentStepIndex(4);
            } else if (verificationProgress.documentsUploaded) {
              // Documents done - go to kitchen check
              setCurrentStepIndex(3);
            } else if (verificationProgress.foodSafetyViewed) {
              setCurrentStepIndex(2);
            } else if (verificationProgress.menuReviewed) {
              setCurrentStepIndex(1);
            }
          }
        }
      } catch (error) {
        console.error('Error loading verification data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [getOrCreateProgress]);

  const goToNext = async () => {
    // Save progress for current step
    if (chefProfileId) {
      const updates: Record<string, boolean> = {};
      if (currentStep === 'menu-review') updates.menuReviewed = true;
      if (currentStep === 'food-safety') updates.foodSafetyViewed = true;
      if (currentStep === 'upload-id') updates.documentsUploaded = true;
      if (currentStep === 'kitchen-check') updates.kitchenVerified = true;
      if (currentStep === 'congrats') updates.verificationCompleted = true;
      
      await updateProgress(chefProfileId, updates);
    }

    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Mark verification as completed
      if (chefProfileId) {
        await updateProgress(chefProfileId, { verificationCompleted: true });
      }
      onComplete();
    }
  };

  const handleDocumentStepComplete = async () => {
    // Save progress for document upload step and move to kitchen check
    if (chefProfileId) {
      await updateProgress(chefProfileId, { documentsUploaded: true });
    }
    goToNext();
  };

  const handleCongratsComplete = async () => {
    // Mark verification as fully completed
    if (chefProfileId) {
      await updateProgress(chefProfileId, { verificationCompleted: true });
    }
    onComplete();
  };

  const goToPrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleDocumentUpload = async (docType: 'kvk' | 'haccp' | 'nvwa', url: string) => {
    if (!chefProfileId) return;
    
    const updates: Record<string, string> = {};
    if (docType === 'kvk') updates.kvkDocumentUrl = url;
    if (docType === 'haccp') updates.haccpDocumentUrl = url;
    if (docType === 'nvwa') updates.nvwaDocumentUrl = url;
    
    await updateProgress(chefProfileId, updates);
  };

  // Show application dashboard
  if (showDashboard) {
    return (
      <ApplicationDashboard 
        onBack={() => setShowDashboard(false)} 
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'menu-review':
        return (
          <MenuReviewStep
            profile={profile}
            onUpdateProfile={onUpdateProfile}
            onNext={goToNext}
            onSkip={goToNext}
            chefProfileId={chefProfileId}
          />
        );
      case 'food-safety':
        return (
          <FoodSafetyInfoStep
            onComplete={() => goToNext()}
            onPrevious={goToPrevious}
            onSkip={() => goToNext()}
            chefProfileId={chefProfileId}
            chefEmail={profile.email}
            chefName={profile.firstName || profile.restaurantName}
          />
        );
      case 'upload-id':
        return (
          <DocumentUploadStep
            profile={profile}
            onUpdateProfile={onUpdateProfile}
            onNext={handleDocumentStepComplete}
            onPrevious={goToPrevious}
            onSkip={handleDocumentStepComplete}
            onDocumentUpload={handleDocumentUpload}
            verificationProgress={progress}
            chefProfileId={chefProfileId}
          />
        );
      case 'kitchen-check':
        return chefProfileId ? (
          <KitchenVerificationStep
            chefProfileId={chefProfileId}
            onComplete={goToNext}
            onPrevious={goToPrevious}
          />
        ) : null;
      case 'congrats':
        return (
          <VerificationCongratsStep
            onComplete={handleCongratsComplete}
            onAdjustApplication={() => setShowDashboard(true)}
          />
        );
      default:
        return null;
    }
  };

  // Hide progress bar on congrats step
  const showProgressBar = currentStep !== 'congrats';
  // Don't count congrats in progress (it's a celebration, not a step)
  const actualStepsCount = STEPS.length - 1; // 4 verification steps
  // Progress: step 0 = 25%, step 3 = 100%
  const actualProgressPercent = ((currentStepIndex + 1) / actualStepsCount) * 100;

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header with logo */}
        <div className="flex items-center justify-between mb-6">
          <Logo chefLogo={profile.logoUrl} size="sm" />
        </div>

        {showProgressBar && (
          <div className="mb-8 animate-fade-in">
            <ProgressBar
              progress={Math.min(actualProgressPercent, 100)}
              currentStep={currentStepIndex}
              totalSteps={actualStepsCount}
            />
          </div>
        )}

        <div className="min-h-[calc(100vh-16rem)]">
          {renderStep()}
        </div>
      </div>
      
      {/* Contact buttons */}
      <ContactButtons />
    </div>
  );
}
