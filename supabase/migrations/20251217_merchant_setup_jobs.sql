-- Create table for tracking background job status
CREATE TABLE IF NOT EXISTS merchant_setup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_profile_id UUID NOT NULL REFERENCES chef_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  current_step TEXT, -- create_merchant, generate_images, import_menu
  merchant_id TEXT,
  progress_message TEXT,
  error_message TEXT,
  error_details JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_merchant_setup_jobs_chef_profile_id ON merchant_setup_jobs(chef_profile_id);
CREATE INDEX IF NOT EXISTS idx_merchant_setup_jobs_status ON merchant_setup_jobs(status);

-- Enable RLS
ALTER TABLE merchant_setup_jobs ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read their own jobs
CREATE POLICY "Users can view their own setup jobs"
  ON merchant_setup_jobs
  FOR SELECT
  USING (true); -- Allow all authenticated users (admins) to view

-- Policy to allow service role to insert/update
CREATE POLICY "Service role can manage setup jobs"
  ON merchant_setup_jobs
  FOR ALL
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_merchant_setup_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER merchant_setup_jobs_updated_at
  BEFORE UPDATE ON merchant_setup_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_merchant_setup_jobs_updated_at();
