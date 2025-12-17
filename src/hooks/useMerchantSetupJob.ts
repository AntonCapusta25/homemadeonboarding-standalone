import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MerchantSetupJob {
    id: string;
    chef_profile_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    current_step: string | null;
    merchant_id: string | null;
    progress_message: string | null;
    error_message: string | null;
    error_details: any;
    started_at: string;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

interface UseMerchantSetupJobOptions {
    jobId: string | null;
    onStatusUpdate?: (job: MerchantSetupJob) => void;
    onComplete?: (job: MerchantSetupJob) => void;
    onError?: (job: MerchantSetupJob) => void;
    pollInterval?: number; // milliseconds
}

export function useMerchantSetupJob({
    jobId,
    onStatusUpdate,
    onComplete,
    onError,
    pollInterval = 2000, // Poll every 2 seconds
}: UseMerchantSetupJobOptions) {
    const [job, setJob] = useState<MerchantSetupJob | null>(null);
    const [isPolling, setIsPolling] = useState(false);

    const fetchJob = useCallback(async () => {
        if (!jobId) return;

        try {
            const { data, error } = await supabase
                .from('merchant_setup_jobs')
                .select('*')
                .eq('id', jobId)
                .single();

            if (error) {
                console.error('Error fetching job:', error);
                return;
            }

            if (data) {
                const jobData = data as MerchantSetupJob;
                setJob(jobData);

                // Call status update callback
                onStatusUpdate?.(jobData);

                // Check if job is complete
                if (jobData.status === 'completed') {
                    setIsPolling(false);
                    onComplete?.(jobData);
                } else if (jobData.status === 'failed') {
                    setIsPolling(false);
                    onError?.(jobData);
                }
            }
        } catch (err) {
            console.error('Error in fetchJob:', err);
        }
    }, [jobId, onStatusUpdate, onComplete, onError]);

    // Start polling when jobId is set
    useEffect(() => {
        if (jobId && !isPolling) {
            setIsPolling(true);
        }
    }, [jobId, isPolling]);

    // Polling effect
    useEffect(() => {
        if (!isPolling || !jobId) return;

        // Fetch immediately
        fetchJob();

        // Set up interval
        const interval = setInterval(fetchJob, pollInterval);

        return () => {
            clearInterval(interval);
        };
    }, [isPolling, jobId, pollInterval, fetchJob]);

    const stopPolling = useCallback(() => {
        setIsPolling(false);
    }, []);

    return {
        job,
        isPolling,
        stopPolling,
        refetch: fetchJob,
    };
}
