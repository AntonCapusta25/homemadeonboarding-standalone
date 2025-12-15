import { useState, useEffect } from 'react';
import { ChefProfile } from '@/types/onboarding';
import { MenuReviewStep } from './verification/MenuReviewStep';
import { DocumentUploadStep } from './verification/DocumentUploadStep';
import { FoodSafetyInfoStep } from './verification/FoodSafetyInfoStep';
import { ProgressBar } from '../ProgressBar';
import { supabase } from '@/integrations/supabase/client';
import { useVerification } from '@/hooks/useVerification';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ContactButtons } from '@/components/onboarding/ContactButtons';
import { TosAcceptanceData } from '@/components/onboarding/TermsOfServiceModal';

interface FastVerificationFlowProps {
  profile: ChefProfile;
  onUpdateProfile: (updates: Partial<ChefProfile>) => void;
  onComplete: () => void;
}

// Reordered: Menu Review -> Food Safety -> Upload ID
type VerificationStep = 'menu-review' | 'food-safety' | 'upload-id';

const STEPS: VerificationStep[] = ['menu-review', 'food-safety', 'upload-id'];

export function FastVerificationFlow({ profile, onUpdateProfile, onComplete }: FastVerificationFlowProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [chefProfileId, setChefProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { getOrCreateProgress, updateProgress, progress } = useVerification();
  
  const currentStep = STEPS[currentStepIndex];
  const progressPercent = ((currentStepIndex + 1) / STEPS.length) * 100;

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
          
          // If already completed, call onComplete immediately
          if (verificationProgress?.verificationCompleted) {
            onComplete();
            return;
          }
          
          // Resume from last completed step
          if (verificationProgress) {
            if (verificationProgress.documentsUploaded) {
              // All done - go to last step to confirm
              setCurrentStepIndex(2);
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
  }, [getOrCreateProgress, onComplete]);

  const goToNext = async (tosData?: TosAcceptanceData) => {
    // Save progress for current step
    if (chefProfileId) {
      const updates: Record<string, boolean> = {};
      if (currentStep === 'menu-review') updates.menuReviewed = true;
      if (currentStep === 'food-safety') updates.foodSafetyViewed = true;
      if (currentStep === 'upload-id') updates.documentsUploaded = true;
      
      await updateProgress(chefProfileId, updates);

      // Save TOS data if provided (from food safety step)
      if (tosData) {
        await supabase
          .from('chef_profiles')
          .update({
            tos_signature: tosData.signature,
            tos_accepted_at: tosData.acceptedAt,
            tos_plan_accepted: tosData.planAccepted,
          })
          .eq('id', chefProfileId);
      }
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
            onComplete={goToNext}
            onPrevious={goToPrevious}
            onSkip={(tosData) => goToNext(tosData)}
            chefProfileId={chefProfileId}
            chefEmail={profile.email}
            chefName={profile.firstName || profile.restaurantName}
            plan={profile.plan}
          />
        );
      case 'upload-id':
        return (
          <DocumentUploadStep
            profile={profile}
            onUpdateProfile={onUpdateProfile}
            onNext={goToNext}
            onPrevious={goToPrevious}
            onSkip={goToNext}
            onDocumentUpload={handleDocumentUpload}
            verificationProgress={progress}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header with logo */}
        <div className="flex items-center justify-between mb-6">
          <Logo chefLogo={profile.logoUrl} size="sm" />
        </div>

        <div className="mb-8 animate-fade-in">
          <ProgressBar
            progress={progressPercent}
            currentStep={currentStepIndex + 1}
            totalSteps={STEPS.length}
          />
        </div>

        <div className="min-h-[calc(100vh-16rem)]">
          {renderStep()}
        </div>
      </div>
      
      {/* Contact buttons */}
      <ContactButtons />
    </div>
  );
}
