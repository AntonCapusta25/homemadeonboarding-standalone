import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link2, Loader2 } from 'lucide-react';

interface Chef {
  id: string;
  business_name: string | null;
  chef_name: string | null;
  contact_email: string | null;
}

interface LinkTypeformModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chefs: Chef[];
  onSuccess: () => void;
}

export function LinkTypeformModal({ open, onOpenChange, chefs, onSuccess }: LinkTypeformModalProps) {
  const [submissionToken, setSubmissionToken] = useState('');
  const [selectedChefId, setSelectedChefId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    if (!submissionToken.trim() || !selectedChefId) {
      toast.error('Please enter submission token and select a chef');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('link-typeform-submission', {
        body: {
          submissionToken: submissionToken.trim(),
          chefProfileId: selectedChefId,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Quiz linked successfully! Score: ${data.score}% (${data.passed ? 'Passed' : 'Failed'})`);
      setSubmissionToken('');
      setSelectedChefId('');
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error('Link error:', err);
      toast.error(err.message || 'Failed to link submission');
    } finally {
      setLoading(false);
    }
  };

  const getChefLabel = (chef: Chef) => {
    const parts = [];
    if (chef.business_name) parts.push(chef.business_name);
    if (chef.chef_name) parts.push(chef.chef_name);
    if (chef.contact_email) parts.push(`(${chef.contact_email})`);
    return parts.join(' - ') || 'Unknown Chef';
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
            Manually link a quiz submission to a chef profile when automatic matching fails.
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

          <div className="space-y-2">
            <Label>Select Chef</Label>
            <Select value={selectedChefId} onValueChange={setSelectedChefId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a chef..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {chefs.map((chef) => (
                  <SelectItem key={chef.id} value={chef.id}>
                    {getChefLabel(chef)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleLink} 
            disabled={loading || !submissionToken.trim() || !selectedChefId}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking...
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
