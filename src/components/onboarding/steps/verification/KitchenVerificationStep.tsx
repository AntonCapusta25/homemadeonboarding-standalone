import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, CheckCircle, AlertTriangle, XCircle, Loader2, ChefHat, Refrigerator, Home, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface KitchenAnalysis {
  overallScore: number;
  status: 'pass' | 'conditional' | 'fail';
  categories: {
    hygieneReadiness: { score: number; feedback: string };
    crossContaminationControl: { score: number; feedback: string };
    fridgeSafety: { score: number; feedback: string };
    cleaningSystemReadiness: { score: number; feedback: string };
    storageDiscipline: { score: number; feedback: string };
    packingAreaReadiness: { score: number; feedback: string };
  };
  issues: Array<{
    severity: 'critical' | 'moderate' | 'minor';
    description: string;
    fix: string;
  }>;
  zoneRecommendations: {
    rawPrepZone: string;
    readyToEatZone: string;
    packingZone: string;
    cleanToolsZone: string;
    workflow: string;
  };
  fridgeOrganization: {
    topShelf: string;
    middleShelf: string;
    bottomShelf: string;
    drawers: string;
    door: string;
    weeklyRoutine: string;
  };
  efficiencyTips: string[];
  checklist: string[];
}

interface KitchenVerificationStepProps {
  chefProfileId: string;
  onComplete: () => void;
  onPrevious?: () => void;
}

type PhotoType = 'kitchen1' | 'kitchen2' | 'fridge';

interface PhotoState {
  file: File | null;
  preview: string | null;
  uploading: boolean;
  url: string | null;
}

const PHOTO_STEPS: { type: PhotoType; title: string; description: string; tip: string; icon: React.ElementType }[] = [
  {
    type: 'kitchen1',
    title: 'Main Cooking Area',
    description: 'Take a wide shot of your main cooking and prep area',
    tip: 'Show your stove, main countertop, and where you prepare food',
    icon: ChefHat,
  },
  {
    type: 'kitchen2',
    title: 'Kitchen Overview',
    description: 'Capture a different angle of your kitchen',
    tip: 'Include your sink, storage areas, and countertops',
    icon: Home,
  },
  {
    type: 'fridge',
    title: 'Inside Your Fridge',
    description: 'Open your fridge and take a photo of the interior',
    tip: 'Make sure all shelves and contents are clearly visible',
    icon: Refrigerator,
  },
];

export function KitchenVerificationStep({ chefProfileId, onComplete, onPrevious }: KitchenVerificationStepProps) {
  const { t } = useTranslation();
  const [currentPhotoStep, setCurrentPhotoStep] = useState(0);
  const [photos, setPhotos] = useState<Record<PhotoType, PhotoState>>({
    kitchen1: { file: null, preview: null, uploading: false, url: null },
    kitchen2: { file: null, preview: null, uploading: false, url: null },
    fridge: { file: null, preview: null, uploading: false, url: null },
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<KitchenAnalysis | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentStep = PHOTO_STEPS[currentPhotoStep];
  const currentPhoto = photos[currentStep.type];

  const handleFileSelect = async (file: File) => {
    const type = currentStep.type;
    const preview = URL.createObjectURL(file);
    setPhotos(prev => ({
      ...prev,
      [type]: { ...prev[type], file, preview, uploading: true },
    }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${user.id}/${type}-${Date.now()}.${file.name.split('.').pop()}`;
      
      const { data, error } = await supabase.storage
        .from('kitchen-photos')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('kitchen-photos')
        .getPublicUrl(data.path);

      // For private bucket, we need signed URL
      const { data: signedData } = await supabase.storage
        .from('kitchen-photos')
        .createSignedUrl(data.path, 3600); // 1 hour expiry

      setPhotos(prev => ({
        ...prev,
        [type]: { ...prev[type], uploading: false, url: signedData?.signedUrl || urlData.publicUrl },
      }));

      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
      setPhotos(prev => ({
        ...prev,
        [type]: { ...prev[type], uploading: false },
      }));
    }
  };

  const handleNext = () => {
    if (currentPhotoStep < PHOTO_STEPS.length - 1) {
      setCurrentPhotoStep(prev => prev + 1);
    } else {
      // All photos done, trigger analysis
      handleAnalyze();
    }
  };

  const handleBack = () => {
    if (currentPhotoStep > 0) {
      setCurrentPhotoStep(prev => prev - 1);
    } else if (onPrevious) {
      onPrevious();
    }
  };

  const handleAnalyze = async () => {
    if (!photos.kitchen1.url || !photos.kitchen2.url || !photos.fridge.url) {
      toast.error('Please upload all three photos first');
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-kitchen', {
        body: {
          kitchenPhoto1Url: photos.kitchen1.url,
          kitchenPhoto2Url: photos.kitchen2.url,
          fridgePhotoUrl: photos.fridge.url,
          chefProfileId,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAnalysis(data.analysis);
      
      if (data.analysis.status === 'pass') {
        toast.success('Congratulations! Your kitchen passed the safety check!');
      } else if (data.analysis.status === 'conditional') {
        toast.info('Your kitchen needs a few improvements to pass.');
      } else {
        toast.warning('Some critical issues need to be addressed.');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze photos. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-500';
      case 'conditional': return 'bg-yellow-500';
      case 'fail': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'conditional': return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'fail': return <XCircle className="h-6 w-6 text-red-500" />;
      default: return null;
    }
  };

  const getCategoryScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const progressPercent = ((currentPhotoStep + (currentPhoto.url ? 1 : 0)) / PHOTO_STEPS.length) * 100;

  // Photo upload flow view
  if (!analysis && !analyzing) {
    const Icon = currentStep.icon;
    
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Kitchen Safety Check</h2>
          <p className="text-muted-foreground">
            Photo {currentPhotoStep + 1} of {PHOTO_STEPS.length}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {PHOTO_STEPS.map((step, index) => (
            <div
              key={step.type}
              className={`w-3 h-3 rounded-full transition-colors ${
                photos[step.type].url
                  ? 'bg-green-500'
                  : index === currentPhotoStep
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Photo upload card */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            
            {currentPhoto.preview ? (
              <div className="relative">
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={currentPhoto.preview} 
                    alt={currentStep.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
                {currentPhoto.uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Loader2 className="h-10 w-10 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Uploading...</p>
                    </div>
                  </div>
                )}
                {currentPhoto.url && !currentPhoto.uploading && (
                  <div className="absolute top-3 right-3">
                    <div className="bg-green-500 text-white rounded-full p-1">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  </div>
                )}
                {/* Retake button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm text-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-background transition-colors"
                >
                  Retake
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[4/3] bg-muted/50 hover:bg-muted transition-colors flex flex-col items-center justify-center gap-4 cursor-pointer"
              >
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="h-10 w-10 text-primary" />
                </div>
                <div className="text-center px-6">
                  <p className="font-semibold text-lg mb-1">{currentStep.title}</p>
                  <p className="text-muted-foreground text-sm">{currentStep.description}</p>
                </div>
                <div className="flex items-center gap-2 text-primary font-medium">
                  <Camera className="h-5 w-5" />
                  <span>Tap to take photo</span>
                </div>
              </button>
            )}
          </CardContent>
        </Card>

        {/* Tip card */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Tip:</strong> {currentStep.tip}
          </p>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!currentPhoto.url || currentPhoto.uploading}
            className="flex-1"
          >
            {currentPhotoStep === PHOTO_STEPS.length - 1 ? 'Analyze Kitchen' : 'Next'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Analyzing state
  if (analyzing) {
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="text-center space-y-4 py-12">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
          <h2 className="text-2xl font-bold">Analyzing Your Kitchen</h2>
          <p className="text-muted-foreground">
            Our AI is reviewing your photos for food safety compliance...
          </p>
          <div className="flex justify-center gap-2 pt-4">
            {PHOTO_STEPS.map((step) => (
              <div key={step.type} className="w-16 h-16 rounded-lg overflow-hidden border-2 border-primary">
                <img 
                  src={photos[step.type].preview!} 
                  alt={step.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Analysis results view
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Kitchen Safety Check</h2>
        <p className="text-muted-foreground">
          Here are your results
        </p>
      </div>

      {/* Score Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(analysis!.status)}
              <div>
                <h3 className="text-xl font-bold capitalize">{analysis!.status}</h3>
                <p className="text-sm text-muted-foreground">
                  {analysis!.status === 'pass' && 'Your kitchen meets safety standards!'}
                  {analysis!.status === 'conditional' && 'A few improvements needed'}
                  {analysis!.status === 'fail' && 'Critical issues to address'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{analysis!.overallScore}</div>
              <div className="text-sm text-muted-foreground">/100</div>
            </div>
          </div>
          <Progress value={analysis!.overallScore} className={`h-3 ${getStatusColor(analysis!.status)}`} />
        </CardContent>
      </Card>

      {/* Category Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category Scores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(analysis!.categories).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className={`font-medium ${getCategoryScoreColor(value.score)}`}>{value.score}/100</span>
              </div>
              <Progress value={value.score} className="h-2" />
              <p className="text-xs text-muted-foreground">{value.feedback}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Issues Found */}
      {analysis!.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Issues Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis!.issues.map((issue, index) => (
              <div key={index} className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={issue.severity === 'critical' ? 'destructive' : issue.severity === 'moderate' ? 'secondary' : 'outline'}>
                    {issue.severity}
                  </Badge>
                  <span className="font-medium text-sm">{issue.description}</span>
                </div>
                <p className="text-sm text-muted-foreground ml-1">
                  <strong>Fix:</strong> {issue.fix}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Kitchen Upgrade Plan */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="zones">
          <AccordionTrigger>Zone Setup Recommendations</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="grid gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-sm text-red-600">Raw Prep Zone</p>
                <p className="text-sm">{analysis!.zoneRecommendations.rawPrepZone}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-sm text-green-600">Ready-to-Eat Zone</p>
                <p className="text-sm">{analysis!.zoneRecommendations.readyToEatZone}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-sm text-blue-600">Packing Zone</p>
                <p className="text-sm">{analysis!.zoneRecommendations.packingZone}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-sm text-purple-600">Clean Tools Zone</p>
                <p className="text-sm">{analysis!.zoneRecommendations.cleanToolsZone}</p>
              </div>
            </div>
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="font-medium text-sm">Recommended Workflow</p>
              <p className="text-sm text-muted-foreground">{analysis!.zoneRecommendations.workflow}</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="fridge">
          <AccordionTrigger>Fridge Organization</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Badge variant="outline">Top</Badge>
                <span className="text-sm">{analysis!.fridgeOrganization.topShelf}</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">Middle</Badge>
                <span className="text-sm">{analysis!.fridgeOrganization.middleShelf}</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">Bottom</Badge>
                <span className="text-sm">{analysis!.fridgeOrganization.bottomShelf}</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">Drawers</Badge>
                <span className="text-sm">{analysis!.fridgeOrganization.drawers}</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">Door</Badge>
                <span className="text-sm">{analysis!.fridgeOrganization.door}</span>
              </div>
            </div>
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="font-medium text-sm">Weekly Reset Routine</p>
              <p className="text-sm text-muted-foreground">{analysis!.fridgeOrganization.weeklyRoutine}</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="efficiency">
          <AccordionTrigger>Efficiency Tips</AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2">
              {analysis!.efficiencyTips.map((tip, index) => (
                <li key={index} className="flex gap-2 text-sm">
                  <span className="text-primary">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        {analysis!.checklist.length > 0 && (
          <AccordionItem value="checklist">
            <AccordionTrigger>Checklist to Pass</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2">
                {analysis!.checklist.map((item, index) => (
                  <li key={index} className="flex gap-2 text-sm items-start">
                    <input type="checkbox" className="mt-1" />
                    {item}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={() => {
            setAnalysis(null);
            setCurrentPhotoStep(0);
          }} 
          className="flex-1"
        >
          Retake Photos
        </Button>
        <Button onClick={onComplete} className="flex-1">
          {analysis!.status === 'pass' ? 'Continue' : 'Continue Anyway'}
        </Button>
      </div>
    </div>
  );
}
