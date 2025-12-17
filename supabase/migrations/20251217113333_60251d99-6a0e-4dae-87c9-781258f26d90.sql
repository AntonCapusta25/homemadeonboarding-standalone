-- Create storage bucket for menu images
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for menu-images bucket
CREATE POLICY "Menu images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

CREATE POLICY "Service role can upload menu images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Service role can update menu images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'menu-images');

CREATE POLICY "Service role can delete menu images"
ON storage.objects FOR DELETE
USING (bucket_id = 'menu-images');

-- Add image_url column to dishes table
ALTER TABLE public.dishes ADD COLUMN IF NOT EXISTS image_url text;