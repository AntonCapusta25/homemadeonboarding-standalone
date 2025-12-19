-- Create storage bucket for kitchen verification photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('kitchen-photos', 'kitchen-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own kitchen photos
CREATE POLICY "Users can upload kitchen photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kitchen-photos' 
  AND auth.uid() IS NOT NULL
);

-- Allow users to view their own kitchen photos (based on path structure: user_id/filename)
CREATE POLICY "Users can view own kitchen photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kitchen-photos'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin(auth.uid())
  )
);

-- Allow admins full access
CREATE POLICY "Admins can manage all kitchen photos"
ON storage.objects FOR ALL
USING (
  bucket_id = 'kitchen-photos'
  AND public.is_admin(auth.uid())
);