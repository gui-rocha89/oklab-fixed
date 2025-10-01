import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseVideoUploadReturn {
  uploading: boolean;
  progress: UploadProgress | null;
  uploadVideo: (file: File, projectId: string) => Promise<string | null>;
  deleteVideo: (videoUrl: string) => Promise<boolean>;
}

export const useVideoUpload = (): UseVideoUploadReturn => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const uploadVideo = useCallback(async (file: File, projectId: string): Promise<string | null> => {
    setUploading(true);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      // Validações
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        throw new Error('Arquivo muito grande. Máximo: 500MB');
      }

      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Formato não suportado. Use: MP4, WebM, QuickTime ou AVI');
      }

      // Gerar nome único
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${timestamp}.${fileExt}`;

      console.log('🎬 Iniciando upload:', {
        fileName,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        type: file.type
      });

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progressEvent) => {
            const percentage = (progressEvent.loaded / progressEvent.total) * 100;
            setProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage
            });
            console.log(`📊 Upload progress: ${percentage.toFixed(1)}%`);
          }
        });

      if (error) {
        console.error('❌ Erro no upload:', error);
        throw error;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      const videoUrl = urlData.publicUrl;
      
      console.log('✅ Upload concluído:', videoUrl);
      toast.success('Vídeo enviado com sucesso!');
      
      return videoUrl;

    } catch (error: any) {
      console.error('❌ Erro no upload:', error);
      toast.error(`Erro no upload: ${error.message}`);
      return null;
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }, []);

  const deleteVideo = useCallback(async (videoUrl: string): Promise<boolean> => {
    try {
      // Extrair o caminho do arquivo da URL
      const url = new URL(videoUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const projectId = pathParts[pathParts.length - 2];
      const filePath = `${projectId}/${fileName}`;

      console.log('🗑️ Deletando vídeo:', filePath);

      const { error } = await supabase.storage
        .from('videos')
        .remove([filePath]);

      if (error) {
        console.error('❌ Erro ao deletar:', error);
        throw error;
      }

      console.log('✅ Vídeo deletado com sucesso');
      toast.success('Vídeo removido com sucesso!');
      return true;

    } catch (error: any) {
      console.error('❌ Erro ao deletar vídeo:', error);
      toast.error(`Erro ao deletar: ${error.message}`);
      return false;
    }
  }, []);

  return {
    uploading,
    progress,
    uploadVideo,
    deleteVideo
  };
};

// Utilitários para validação
export const validateVideoFile = (file: File): string | null => {
  const maxSize = 500 * 1024 * 1024; // 500MB
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

  if (!allowedTypes.includes(file.type)) {
    return 'Formato não suportado. Use: MP4, WebM, QuickTime ou AVI';
  }

  if (file.size > maxSize) {
    return 'Arquivo muito grande. Máximo: 500MB';
  }

  return null;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
