import React, { useState, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoUploaderProps {
  onUploadComplete: (videoUrl: string) => void;
  onUploadError: (error: string) => void;
  maxSizeMB?: number;
  acceptedFormats?: string[];
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onUploadComplete,
  onUploadError,
  maxSizeMB = 500,
  acceptedFormats = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const validateFile = (file: File): string | null => {
    // Verificar tipo de arquivo
    if (!acceptedFormats.includes(file.type)) {
      return `Formato não suportado. Use: ${acceptedFormats.map(f => f.split('/')[1]).join(', ')}`;
    }

    // Verificar tamanho (converter MB para bytes)
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `Arquivo muito grande. Máximo: ${maxSizeMB}MB`;
    }

    return null;
  };

  const uploadVideo = async (file: File) => {
    setUploading(true);
    setProgress(0);

    try {
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}.${fileExt}`;
      const filePath = `videos/${fileName}`;

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            setProgress(percent);
          }
        });

      if (error) {
        throw error;
      }

      // Obter URL pública do vídeo
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      const videoUrl = urlData.publicUrl;

      toast.success('Vídeo enviado com sucesso!');
      onUploadComplete(videoUrl);
      setSelectedFile(null);

    } catch (error: any) {
      console.error('Erro no upload:', error);
      const errorMessage = error.message || 'Erro desconhecido no upload';
      toast.error(`Erro no upload: ${errorMessage}`);
      onUploadError(errorMessage);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Film className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Upload de Vídeo</h3>
        </div>

        {!selectedFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-primary/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Arraste o vídeo aqui ou clique para selecionar
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Formatos suportados: MP4, WebM, QuickTime, AVI
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Tamanho máximo: {maxSizeMB}MB
            </p>
            
            <input
              type="file"
              accept={acceptedFormats.join(',')}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
              id="video-upload"
            />
            <label htmlFor="video-upload">
              <Button variant="outline" className="cursor-pointer">
                Selecionar Arquivo
              </Button>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Informações do arquivo selecionado */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Film className="w-8 h-8 text-primary mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                
                {!uploading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Barra de progresso durante upload */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Enviando vídeo...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex gap-2">
              <Button
                onClick={() => uploadVideo(selectedFile)}
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar Vídeo
                  </>
                )}
              </Button>
              
              {!uploading && (
                <Button
                  variant="outline"
                  onClick={() => setSelectedFile(null)}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Informações sobre limites */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Limites do Plano Pro:</p>
              <ul className="text-xs space-y-1">
                <li>• Tamanho máximo: {maxSizeMB}MB por arquivo</li>
                <li>• Formatos: MP4, WebM, QuickTime, AVI</li>
                <li>• Storage: 100GB incluído</li>
                <li>• Bandwidth: 200GB incluído</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
