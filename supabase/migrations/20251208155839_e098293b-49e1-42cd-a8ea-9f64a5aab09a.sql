-- Create storage bucket for chef logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload logos (during anonymous onboarding)
CREATE POLICY "Anyone can upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'logos');

-- Allow public read access to logos
CREATE POLICY "Anyone can view logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'logos');

-- Allow users to update their own logos (based on folder structure user_id/filename)
CREATE POLICY "Users can update their own logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own logos
CREATE POLICY "Users can delete their own logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);