import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChefProfile } from '@/types/onboarding';
import { useTranslation } from 'react-i18next';
import { FileCheck, ArrowRight, ArrowLeft, SkipForward, Upload, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocumentUploadStepProps {
  profile: ChefProfile;
  onUpdateProfile: (updates: Partial<ChefProfile>) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

interface DocumentType {
  id: string;
  label: string;
  description: string;
  required: boolean;
  uploaded: boolean;
  uploading: boolean;
  url?: string;
}

export function DocumentUploadStep({ profile, onUpdateProfile, onNext, onPrevious, onSkip }: DocumentUploadStepProps) {
  const { t } = useTranslation();
  
  const [documents, setDocuments] = useState<DocumentType[]>([
    {
      id: 'kvk',
      label: t('verification.kvkRegistration', 'KVK Registration'),
      description: t('verification.kvkDesc', 'Your Chamber of Commerce registration document'),
      required: true,
      uploaded: !!profile.kvkDocsUrl,
      uploading: false,
      url: profile.kvkDocsUrl,
    },
    {
      id: 'haccp',
      label: t('verification.haccpCertificate', 'HACCP Certificate'),
      description: t('verification.haccpDesc', 'Your food safety training certificate'),
      required: false,
      uploaded: !!profile.haccpCertificateUrl,
      uploading: false,
      url: profile.haccpCertificateUrl,
    },
    {
      id: 'nvwa',
      label: t('verification.nvwaRegistration', 'NVWA Registration'),
      description: t('verification.nvwaDesc', 'Food safety authority registration'),
      required: true,
      uploaded: false,
      uploading: false,
    },
  ]);

  const handleFileUpload = async (docId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Update uploading state
    setDocuments(prev => prev.map(d => 
      d.id === docId ? { ...d, uploading: true } : d
    ));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('verification.loginRequired', 'Please log in to upload documents'));
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${docId}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Update document state
      setDocuments(prev => prev.map(d => 
        d.id === docId ? { ...d, uploading: false, uploaded: true, url: publicUrl } : d
      ));

      // Update profile based on document type
      if (docId === 'kvk') {
        onUpdateProfile({ kvkDocsUrl: publicUrl });
      } else if (docId === 'haccp') {
        onUpdateProfile({ haccpCertificateUrl: publicUrl });
      }

      toast.success(t('verification.uploadSuccess', 'Document uploaded successfully!'));
    } catch (error: any) {
      console.error('Upload error:', error);
      setDocuments(prev => prev.map(d => 
        d.id === docId ? { ...d, uploading: false } : d
      ));
      toast.error(t('verification.uploadError', 'Failed to upload document'));
    }
  };

  const uploadedCount = documents.filter(d => d.uploaded).length;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <FileCheck className="w-6 h-6 text-primary" />
          </div>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
          {t('verification.uploadDocuments', 'Upload Documents')}
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          {t('verification.uploadDocsDesc', 'Upload your business documents to speed up verification. You can also do this later.')}
        </p>
      </div>

      <div className="flex-1 space-y-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className={`p-4 rounded-xl border transition-all ${
              doc.uploaded 
                ? 'bg-primary/5 border-primary/30' 
                : 'bg-card border-border hover:border-primary/30'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground">{doc.label}</h3>
                  {doc.required && (
                    <span className="text-xs text-muted-foreground">
                      ({t('common.required', 'Required')})
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
              </div>
              
              <div className="flex-shrink-0">
                {doc.uploaded ? (
                  <div className="flex items-center gap-2 text-primary">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {t('verification.uploaded', 'Uploaded')}
                    </span>
                  </div>
                ) : doc.uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(doc.id, e)}
                    />
                    <div className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
                      <Upload className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {t('verification.upload', 'Upload')}
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>
        ))}

        <p className="text-sm text-muted-foreground text-center mt-6">
          {uploadedCount} / {documents.length} {t('verification.documentsUploaded', 'documents uploaded')}
        </p>
      </div>

      <div className="flex justify-between pt-8 mt-auto border-t border-border">
        <Button variant="ghost" onClick={onPrevious}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back', 'Back')}
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onSkip}>
            <SkipForward className="w-4 h-4 mr-2" />
            {t('common.skip', 'Skip')}
          </Button>
          <Button onClick={onNext} size="lg">
            {t('common.continue', 'Continue')}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
