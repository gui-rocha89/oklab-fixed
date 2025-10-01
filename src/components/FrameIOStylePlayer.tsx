import React, { useState, useRef, useEffect } from 'react';
import { Canvas as FabricCanvas, util } from "fabric";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Maximize, 
  MessageSquare, 
  Pencil, 
  Clock,
  Send,
  Check,
  X,
  Circle,
  Square,
  Minus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { convertFromReferenceResolution, REFERENCE_WIDTH, REFERENCE_HEIGHT } from "@/lib/annotationUtils";
import { useVideoAspectRatio } from "@/hooks/useVideoAspectRatio";

interface VideoAnnotation {
  id: string;
  timestamp_ms: number;
  comment: string | null;
  canvas_data: any;
  created_at: string;
  client_name?: string;
  client_email?: string;
}

interface FrameIOStylePlayerProps {
  videoUrl: string;
  annotations: VideoAnnotation[];
  isClientView?: boolean;
  onAddAnnotation?: (annotation: Omit<VideoAnnotation, 'id' | 'created_at'>) => void;
  clientName?: string;
  clientEmail?: string;
}

export const FrameIOStylePlayer = ({ 
  videoUrl, 
  annotations, 
  isClientView = false,
  onAddAnnotation,
  clientName,
  clientEmail
}: FrameIOStylePlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [currentAnnotationIndex, setCurrentAnnotationIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Drawing states
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pen' | 'circle' | 'rectangle' | 'line'>('pen');
  const [brushColor, setBrushColor] = useState('#ff4444');
  const [newComment, setNewComment] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] = useState<any>(null);

  // Hook para detectar proporção do vídeo automaticamente
  const { aspectRatio, isReady: videoReady } = useVideoAspectRatio(videoRef);

  // Inicializar canvas
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || !containerRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      selection: false,
      hoverCursor: 'default',
      moveCursor: 'default',
      backgroundColor: 'transparent',
    });
    
    fabricCanvasRef.current = canvas;

    const updateCanvasSize = () => {
      const video = videoRef.current;
      if (!video) return;

      const rect = video.getBoundingClientRect();
      canvas.setDimensions({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height)
      });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Configurar ferramentas de desenho
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    if (isDrawingMode) {
      canvas.isDrawingMode = currentTool === 'pen';
      
      if (currentTool === 'pen') {
        canvas.freeDrawingBrush.color = brushColor;
        canvas.freeDrawingBrush.width = 3;
      } else {
        canvas.isDrawingMode = false;
        // Configurar outras ferramentas (círculo, retângulo, linha)
      }
    } else {
      canvas.isDrawingMode = false;
    }
  }, [isDrawingMode, currentTool, brushColor]);

  // Detectar anotações próximas ao tempo atual
  useEffect(() => {
    if (annotations.length === 0) return;

    const closest = annotations.reduce((prev, curr, index) => {
      const prevDiff = Math.abs(prev.annotation.timestamp_ms - currentTime);
      const currDiff = Math.abs(curr.timestamp_ms - currentTime);
      
      return currDiff < prevDiff ? { annotation: curr, index } : prev;
    }, { annotation: annotations[0], index: 0 });

    if (Math.abs(closest.annotation.timestamp_ms - currentTime) < 3000) {
      if (currentAnnotationIndex !== closest.index) {
        setCurrentAnnotationIndex(closest.index);
        loadAnnotationToCanvas(closest.annotation);
      }
    } else if (currentAnnotationIndex !== null) {
      setCurrentAnnotationIndex(null);
      clearCanvas();
    }
  }, [currentTime, annotations]);

  const loadAnnotationToCanvas = async (annotation: VideoAnnotation) => {
    if (!fabricCanvasRef.current || !videoRef.current) return;

    const canvas = fabricCanvasRef.current;
    const video = videoRef.current;
    
    try {
      clearCanvas();
      
      if (!annotation.canvas_data?.objects || annotation.canvas_data.objects.length === 0) {
        return;
      }

      const rect = video.getBoundingClientRect();
      const currentWidth = Math.floor(rect.width);
      const currentHeight = Math.floor(rect.height);

      canvas.setDimensions({
        width: currentWidth,
        height: currentHeight
      });

      const convertedObjects = convertFromReferenceResolution(
        annotation.canvas_data.objects || [],
        currentWidth,
        currentHeight
      );

      const objects = await util.enlivenObjects(convertedObjects);

      objects.forEach((obj: any) => {
        if (obj) {
          obj.set({
            selectable: false,
            evented: false,
            stroke: annotation.canvas_data.brushColor || '#ff4444',
            strokeWidth: 3,
            fill: obj.type === 'path' ? undefined : `${annotation.canvas_data.brushColor || '#ff4444'}20`,
          });
          obj.setCoords();
          canvas.add(obj);
        }
      });

      canvas.renderAll();
    } catch (error) {
      console.error('Erro ao carregar anotação:', error);
    }
  };

  const clearCanvas = () => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.renderAll();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime * 1000);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration * 1000);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const jumpToAnnotation = (annotation: VideoAnnotation, index: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = annotation.timestamp_ms / 1000;
      setCurrentAnnotationIndex(index);
      loadAnnotationToCanvas(annotation);
    }
  };

  const handleAddComment = () => {
    if (!isClientView || !onAddAnnotation) return;
    
    setIsDrawingMode(true);
    setShowCommentInput(true);
  };

  const saveAnnotation = async () => {
    if (!fabricCanvasRef.current || !onAddAnnotation || !newComment.trim()) return;

    const canvas = fabricCanvasRef.current;
    const canvasData = {
      objects: canvas.toObject().objects,
      brushColor: brushColor,
    };

    const annotation = {
      timestamp_ms: currentTime,
      comment: newComment.trim(),
      canvas_data: canvasData,
      client_name: clientName,
      client_email: clientEmail,
    };

    await onAddAnnotation(annotation);
    
    setNewComment('');
    setShowCommentInput(false);
    setIsDrawingMode(false);
    clearCanvas();
  };

  const cancelAnnotation = () => {
    setNewComment('');
    setShowCommentInput(false);
    setIsDrawingMode(false);
    clearCanvas();
  };

  const formatTimestamp = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const currentAnnotation = currentAnnotationIndex !== null ? annotations[currentAnnotationIndex] : null;

  return (
    <div className="w-full bg-black rounded-lg overflow-hidden">
      {/* Video Container - Frame.io Style */}
      <div 
        ref={containerRef} 
        className="relative w-full bg-black group"
        style={{ 
          aspectRatio: aspectRatio.toString(),
          maxHeight: '70vh'
        }}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        {/* Canvas para anotações */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ 
            zIndex: 10,
            width: '100%',
            height: '100%',
            pointerEvents: isDrawingMode ? 'auto' : 'none',
          }}
        />

        {/* Annotation Popup - Frame.io Style */}
        {currentAnnotation && (
          <div 
            className="absolute bg-white rounded-lg shadow-lg p-3 max-w-xs z-20"
            style={{
              bottom: '80px',
              left: '20px',
            }}
          >
            <div className="flex items-start gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary text-white text-xs">
                  {currentAnnotation.client_name?.charAt(0) || 'C'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {currentAnnotation.client_name || 'Cliente'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(currentAnnotation.timestamp_ms)}
                  </span>
                </div>
                <p className="text-sm text-gray-700">
                  {currentAnnotation.comment}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Drawing Tools - Frame.io Style */}
        {isDrawingMode && (
          <div className="absolute top-4 left-4 bg-black/80 rounded-lg p-2 flex items-center gap-2 z-30">
            <Button
              size="sm"
              variant={currentTool === 'pen' ? 'default' : 'ghost'}
              onClick={() => setCurrentTool('pen')}
              className="h-8 w-8 p-0"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={currentTool === 'circle' ? 'default' : 'ghost'}
              onClick={() => setCurrentTool('circle')}
              className="h-8 w-8 p-0"
            >
              <Circle className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={currentTool === 'rectangle' ? 'default' : 'ghost'}
              onClick={() => setCurrentTool('rectangle')}
              className="h-8 w-8 p-0"
            >
              <Square className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={currentTool === 'line' ? 'default' : 'ghost'}
              onClick={() => setCurrentTool('line')}
              className="h-8 w-8 p-0"
            >
              <Minus className="w-4 h-4" />
            </Button>
            
            {/* Color Picker */}
            <div className="flex gap-1 ml-2">
              {['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff'].map(color => (
                <button
                  key={color}
                  onClick={() => setBrushColor(color)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2",
                    brushColor === color ? "border-white" : "border-gray-400"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Controls Overlay - Frame.io Style */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
          {/* Timeline com marcadores */}
          <div className="relative mb-4">
            <div className="w-full h-1 bg-white/20 rounded-full">
              <div 
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            
            {/* Marcadores de anotações */}
            {annotations.map((annotation, index) => (
              <button
                key={annotation.id}
                className={cn(
                  "absolute w-3 h-3 rounded-full border-2 border-white -translate-y-1/2 -translate-x-1/2 transition-all z-10",
                  "hover:scale-150 hover:shadow-xl",
                  currentAnnotationIndex === index 
                    ? "bg-primary scale-125 shadow-primary/50" 
                    : "bg-orange-500 hover:bg-orange-400"
                )}
                style={{ 
                  left: `${(annotation.timestamp_ms / duration) * 100}%`,
                  top: '50%'
                }}
                onClick={() => jumpToAnnotation(annotation, index)}
                title={`${formatTimestamp(annotation.timestamp_ms)} - ${annotation.comment}`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="ghost"
                onClick={togglePlay}
                className="h-10 w-10 text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </Button>
              
              <span className="text-white text-sm font-mono">
                {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isClientView && (
                <Button
                  onClick={handleAddComment}
                  className="bg-primary hover:bg-primary/90 text-white"
                  size="sm"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Adicionar Comentário
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comment Input - Frame.io Style */}
      {showCommentInput && (
        <div className="p-4 bg-gray-50 border-t">
          <div className="flex items-start gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-white text-xs">
                {clientName?.charAt(0) || 'C'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Deixe seu comentário aqui..."
                className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                autoFocus
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {formatTimestamp(currentTime)}
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={cancelAnnotation}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={saveAnnotation}
                    disabled={!newComment.trim()}
                    size="sm"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Enviar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments List - Frame.io Style */}
      {annotations.length > 0 && (
        <div className="p-4 bg-white border-t max-h-60 overflow-y-auto">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Comentários ({annotations.length})
          </h3>
          <div className="space-y-3">
            {annotations.map((annotation, index) => (
              <div
                key={annotation.id}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                  currentAnnotationIndex === index 
                    ? "bg-primary/10 border border-primary/20" 
                    : "hover:bg-gray-50"
                )}
                onClick={() => jumpToAnnotation(annotation, index)}
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-white text-xs">
                    {annotation.client_name?.charAt(0) || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {annotation.client_name || 'Cliente'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(annotation.timestamp_ms)}
                    </span>
                    {annotation.canvas_data?.objects?.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Pencil className="w-3 h-3 mr-1" />
                        Desenho
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    {annotation.comment}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
