import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link2, Loader2 } from 'lucide-react';

interface LinkTypeformModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LinkTypeformModal({ open, onOpenChange, onSuccess }: LinkTypeformModalProps) {
  const [submissionToken, setSubmissionToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    if (!submissionToken.trim()) {
      toast.error('Please enter submission token');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('link-typeform-submission', {
        body: {
          submissionToken: submissionToken.trim(),
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Linked to ${data.chefName}! Score: ${data.score}% (${data.passed ? 'Passed' : 'Failed'})`);
      setSubmissionToken('');
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error('Link error:', err);
      toast.error(err.message || 'Failed to link submission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Typeform Quiz Submission
          </DialogTitle>
          <DialogDescription>
            Enter the submission token - chef will be found automatically by email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="submission-token">Submission Token/ID</Label>
            <Input
              id="submission-token"
              placeholder="e.g., abc123xyz..."
              value={submissionToken}
              onChange={(e) => setSubmissionToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Find this in Typeform → Responses → Click submission → Copy response ID from URL
            </p>
          </div>

          <Button 
            onClick={handleLink} 
            disabled={loading || !submissionToken.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Finding chef & linking...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Link Submission
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
