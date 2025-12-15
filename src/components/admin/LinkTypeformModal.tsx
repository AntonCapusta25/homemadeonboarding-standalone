import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link2, Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface TypeformResponse {
  responseId: string;
  email: string | null;
  score: number | null;
  maxScore: number | null;
  scorePercentage: number | null;
  passed: boolean | null;
  submittedAt: string;
  matchedChef: {
    id: string;
    name: string;
  } | null;
  alreadyLinked: boolean;
}

interface LinkTypeformModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LinkTypeformModal({ open, onOpenChange, onSuccess }: LinkTypeformModalProps) {
  const [responses, setResponses] = useState<TypeformResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, matched: 0, linked: 0, unlinked: 0 });

  const fetchResponses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-typeform-responses');

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setResponses(data.responses || []);
      setStats({
        total: data.total || 0,
        matched: data.matched || 0,
        linked: data.linked || 0,
        unlinked: data.unlinked || 0,
      });
    } catch (err: any) {
      console.error('Fetch error:', err);
      toast.error(err.message || 'Failed to fetch responses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchResponses();
    }
  }, [open]);

  const handleLink = async (response: TypeformResponse) => {
    if (!response.matchedChef || response.scorePercentage === null) return;

    setLinkingId(response.responseId);
    try {
      const { data, error } = await supabase.functions.invoke('link-quiz-by-email', {
        body: {
          chefProfileId: response.matchedChef.id,
          score: response.scorePercentage,
          passed: response.passed,
          submittedAt: response.submittedAt,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Linked quiz to ${response.matchedChef.name}!`);
      
      // Update local state
      setResponses(prev => prev.map(r => 
        r.responseId === response.responseId 
          ? { ...r, alreadyLinked: true }
          : r
      ));
      setStats(prev => ({ ...prev, linked: prev.linked + 1, unlinked: prev.unlinked - 1 }));
      onSuccess();
    } catch (err: any) {
      console.error('Link error:', err);
      toast.error(err.message || 'Failed to link');
    } finally {
      setLinkingId(null);
    }
  };

  const unlinkableResponses = responses.filter(r => r.matchedChef && !r.alreadyLinked && r.scorePercentage !== null);
  const linkedResponses = responses.filter(r => r.alreadyLinked);
  const unmatchedResponses = responses.filter(r => !r.matchedChef);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Typeform Quiz Responses
          </DialogTitle>
          <DialogDescription>
            View all quiz submissions and link them to chef profiles by email.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline">{stats.total} total</Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700">{stats.linked} linked</Badge>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">{stats.unlinked} to link</Badge>
          <Badge variant="outline" className="bg-gray-50 text-gray-700">{unmatchedResponses.length} no match</Badge>
          <Button variant="ghost" size="sm" onClick={fetchResponses} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Unlinkable responses - action needed */}
              {unlinkableResponses.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-yellow-700">Ready to Link ({unlinkableResponses.length})</h4>
                  {unlinkableResponses.map((r) => (
                    <div key={r.responseId} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{r.matchedChef?.name}</span>
                          <Badge variant={r.passed ? "default" : "destructive"} className="text-xs">
                            {r.scorePercentage}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(r.submittedAt), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleLink(r)}
                        disabled={linkingId === r.responseId}
                      >
                        {linkingId === r.responseId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="h-4 w-4" />
                        )}
                        <span className="ml-1">Link</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Already linked */}
              {linkedResponses.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-green-700">Already Linked ({linkedResponses.length})</h4>
                  {linkedResponses.map((r) => (
                    <div key={r.responseId} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg opacity-75">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-sm">{r.matchedChef?.name}</span>
                          <Badge variant={r.passed ? "default" : "destructive"} className="text-xs">
                            {r.scorePercentage}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No match */}
              {unmatchedResponses.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-500">No Matching Chef ({unmatchedResponses.length})</h4>
                  {unmatchedResponses.map((r) => (
                    <div key={r.responseId} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-60">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{r.email || 'No email'}</span>
                          {r.scorePercentage !== null && (
                            <Badge variant="outline" className="text-xs">
                              {r.scorePercentage}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(r.submittedAt), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {responses.length === 0 && !loading && (
                <p className="text-center text-muted-foreground py-8">No quiz responses found</p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
