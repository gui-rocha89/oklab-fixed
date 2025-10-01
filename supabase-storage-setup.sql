-- =====================================================
-- CONFIGURAÇÃO SUPABASE STORAGE PARA OKLAB
-- Plano Pro - Upload até 500MB
-- =====================================================

-- 1. CRIAR BUCKET PARA VÍDEOS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  524288000, -- 500MB em bytes
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi']
);

-- 2. POLÍTICAS RLS PARA BUCKET DE VÍDEOS

-- Permitir upload para usuários autenticados
CREATE POLICY "Authenticated users can upload videos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'videos' 
  AND auth.role() = 'authenticated'
);

-- Permitir leitura pública dos vídeos
CREATE POLICY "Public can view videos" ON storage.objects
FOR SELECT USING (bucket_id = 'videos');

-- Permitir que usuários deletem seus próprios vídeos
CREATE POLICY "Users can delete own videos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. CRIAR BUCKET PARA THUMBNAILS/SCREENSHOTS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true,
  10485760, -- 10MB em bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- 4. POLÍTICAS RLS PARA THUMBNAILS

-- Permitir upload para usuários autenticados
CREATE POLICY "Authenticated users can upload thumbnails" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'thumbnails' 
  AND auth.role() = 'authenticated'
);

-- Permitir leitura pública dos thumbnails
CREATE POLICY "Public can view thumbnails" ON storage.objects
FOR SELECT USING (bucket_id = 'thumbnails');

-- Permitir que usuários deletem seus próprios thumbnails
CREATE POLICY "Users can delete own thumbnails" ON storage.objects
FOR DELETE USING (
  bucket_id = 'thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. FUNÇÃO PARA LIMPAR ARQUIVOS ÓRFÃOS
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deletar vídeos sem projeto associado
  DELETE FROM storage.objects 
  WHERE bucket_id = 'videos' 
  AND name NOT IN (
    SELECT video_url FROM projects 
    WHERE video_url IS NOT NULL
  );
  
  -- Deletar thumbnails sem anotação associada
  DELETE FROM storage.objects 
  WHERE bucket_id = 'thumbnails' 
  AND name NOT IN (
    SELECT screenshot_url FROM video_annotations 
    WHERE screenshot_url IS NOT NULL
  );
END;
$$;

-- 6. TRIGGER PARA LIMPEZA AUTOMÁTICA (OPCIONAL)
-- Executar limpeza diariamente
-- SELECT cron.schedule('cleanup-orphaned-files', '0 2 * * *', 'SELECT cleanup_orphaned_files();');

-- 7. VERIFICAR CONFIGURAÇÕES
SELECT 
  id,
  name,
  public,
  file_size_limit / 1024 / 1024 as size_limit_mb,
  allowed_mime_types
FROM storage.buckets 
WHERE id IN ('videos', 'thumbnails');
