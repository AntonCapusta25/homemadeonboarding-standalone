import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChefProfile } from '@/types/onboarding';
import { useTranslation } from 'react-i18next';
import { FileCheck, ArrowRight, ArrowLeft, Upload, Loader2, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VerificationProgress } from '@/hooks/useVerification';
import { TermsOfServiceModal, TosAcceptanceData } from '@/components/onboarding/TermsOfServiceModal';

interface DocumentUploadStepProps {
  profile: ChefProfile;
  onUpdateProfile: (updates: Partial<ChefProfile>) => void;
  onNext: (tosData?: TosAcceptanceData) => void;
  onPrevious: () => void;
  onSkip: () => void;
  onDocumentUpload?: (docType: 'kvk' | 'haccp' | 'nvwa', url: string) => Promise<void>;
  verificationProgress?: VerificationProgress | null;
  chefProfileId?: string | null;
}

interface DocumentType {
  id: 'id';
  label: string;
  description: string;
  required: boolean;
  uploaded: boolean;
  uploading: boolean;
  url?: string;
}

export function DocumentUploadStep({ 
  profile, 
  onUpdateProfile, 
  onNext, 
  onPrevious, 
  onSkip,
  onDocumentUpload,
  verificationProgress,
  chefProfileId
}: DocumentUploadStepProps) {
  const { t } = useTranslation();
  const [showTosModal, setShowTosModal] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  
  const [document, setDocument] = useState<DocumentType>({
    id: 'id',
    label: t('verification.idDocument', 'ID Document'),
    description: t('verification.idDesc', 'Upload your passport or ID card for identity verification'),
    required: true,
    uploaded: false,
    uploading: false,
  });

  // Load existing document URL from verification progress
  useEffect(() => {
    const url = verificationProgress?.kvkDocumentUrl;
    if (url) {
      setDocument(prev => ({ ...prev, uploaded: true, url }));
    }
  }, [verificationProgress]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setDocument(prev => ({ ...prev, uploading: true }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('verification.loginRequired', 'Please log in to upload documents'));
        setDocument(prev => ({ ...prev, uploading: false }));
        return;
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/id-${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('verification-documents')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      const storedPath = `verification-documents/${filePath}`;
      setDocument(prev => ({ ...prev, uploading: false, uploaded: true, url: storedPath }));

      if (onDocumentUpload) {
        await onDocumentUpload('kvk', storedPath);
      }

      toast.success(t('verification.uploadSuccess', 'ID uploaded successfully!'));
    } catch (error: unknown) {
      console.error('Upload error:', error);
      setDocument(prev => ({ ...prev, uploading: false }));
      toast.error(t('verification.uploadError', 'Failed to upload document'));
    }
  };

  const handleFinishClick = () => {
    setShowTosModal(true);
  };

  const handleSkipClick = () => {
    setIsSkipping(true);
    setShowTosModal(true);
  };

  const handleTosAccept = async (tosData: TosAcceptanceData) => {
    setShowTosModal(false);
    
    // Save TOS data to database
    if (chefProfileId) {
      await supabase
        .from('chef_profiles')
        .update({
          tos_signature: tosData.signature,
          tos_accepted_at: tosData.acceptedAt,
          tos_plan_accepted: tosData.planAccepted,
        })
        .eq('id', chefProfileId);
    }

    if (isSkipping) {
      setIsSkipping(false);
      onSkip();
    } else {
      onNext(tosData);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <FileCheck className="w-6 h-6 text-primary" />
          </div>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
          {t('verification.uploadId', 'Upload Your ID')}
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          {t('verification.uploadIdDesc', 'Upload your identification document to complete verification. This helps us verify your identity.')}
        </p>
      </div>

      <div className="flex-1 max-w-md mx-auto w-full">
        <div
          className={`p-6 rounded-xl border-2 border-dashed transition-all ${
            document.uploaded 
              ? 'bg-primary/5 border-primary' 
              : 'bg-card border-border hover:border-primary/50'
          }`}
        >
          <div className="text-center">
            {document.uploaded ? (
              <div className="py-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {t('verification.idUploaded', 'ID Uploaded')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('verification.idUploadedDesc', 'Your ID document has been uploaded successfully')}
                </p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                  />
                  <span className="text-primary hover:text-primary/80 text-sm font-medium">
                    {t('verification.replaceDocument', 'Replace document')}
                  </span>
                </label>
              </div>
            ) : document.uploading ? (
              <div className="py-8">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {t('verification.uploading', 'Uploading...')}
                </p>
              </div>
            ) : (
              <div className="py-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{document.label}</h3>
                <p className="text-sm text-muted-foreground mb-4">{document.description}</p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                  />
                  <Button variant="outline" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {t('verification.chooseFile', 'Choose file')}
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground mt-4">
                  {t('verification.acceptedFormats', 'PDF, JPG, or PNG • Max 10MB')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-8 mt-auto border-t border-border">
        <div className="flex justify-between">
          <Button variant="ghost" onClick={onPrevious}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back', 'Back')}
          </Button>
          <Button 
            onClick={handleFinishClick} 
            size="lg"
            disabled={!document.uploaded}
          >
            {t('verification.finishVerification', 'Finish Verification')}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
        
        {/* Skip button */}
        <div className="flex justify-center">
          <Button 
            variant="link" 
            className="text-muted-foreground hover:text-foreground"
            onClick={handleSkipClick}
          >
            <Clock className="w-4 h-4 mr-2" />
            {t("verification.skipForNow", "Skip for now, I'll do it later")}
          </Button>
        </div>
      </div>

      {/* TOS Modal - shown at the end of verification */}
      <TermsOfServiceModal
        isOpen={showTosModal}
        onClose={() => {
          setShowTosModal(false);
          setIsSkipping(false);
        }}
        onAccept={handleTosAccept}
        plan={(profile.plan as 'basic' | 'pro' | 'advanced') || 'basic'}
      />
    </div>
  );
}
