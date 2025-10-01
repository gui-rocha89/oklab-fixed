import React, { useRef, useEffect, useState } from 'react';
import { Canvas as FabricCanvas, util } from 'fabric';
import { X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { convertFromReferenceResolution, REFERENCE_WIDTH, REFERENCE_HEIGHT } from '@/lib/annotationUtils';

interface Annotation {
  id: string;
  timestamp_ms: number;
  canvas_data: any;
  comment: string | null;
  created_at: string;
}

interface AnnotationViewerProps {
  annotation: Annotation | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  onClose: () => void;
}

export const AnnotationViewer: React.FC<AnnotationViewerProps> = ({
  annotation,
  videoRef,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Update canvas dimensions based on video element
  useEffect(() => {
    if (!videoRef.current || !containerRef.current) return;

    const updateDimensions = () => {
      const video = videoRef.current;
      const container = containerRef.current;
      if (!video || !container) return;

      // Get the actual rendered dimensions of the video
      const videoRect = video.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Calculate the offset to position canvas exactly over video
      const offsetLeft = videoRect.left - containerRect.left;
      const offsetTop = videoRect.top - containerRect.top;

      setDimensions({
        width: Math.floor(videoRect.width),
        height: Math.floor(videoRect.height),
      });

      // Position the canvas container exactly over the video
      if (canvasRef.current) {
        const canvasContainer = canvasRef.current.parentElement;
        if (canvasContainer) {
          canvasContainer.style.left = `${offsetLeft}px`;
          canvasContainer.style.top = `${offsetTop}px`;
          canvasContainer.style.width = `${videoRect.width}px`;
          canvasContainer.style.height = `${videoRect.height}px`;
          canvasContainer.style.position = 'absolute';
          canvasContainer.style.zIndex = '200';
        }
      }
    };

    // Initial update with delay to ensure video is rendered
    setTimeout(updateDimensions, 100);

    // Update on resize
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(videoRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [videoRef, annotation]);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    // Dispose existing canvas
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
    }

    const canvas = new FabricCanvas(canvasRef.current, {
      width: dimensions.width,
      height: dimensions.height,
      backgroundColor: 'transparent',
      selection: false,
      hoverCursor: 'default',
      moveCursor: 'default',
      interactive: false,
    });

    // Disable all interactions
    canvas.forEachObject((obj) => {
      obj.set({
        selectable: false,
        evented: false,
      });
    });

    fabricCanvasRef.current = canvas;

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [dimensions]);

  // Load annotation data into canvas
  useEffect(() => {
    if (!annotation || !fabricCanvasRef.current || dimensions.width === 0) return;

    const loadAnnotation = async () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      try {
        canvas.clear();

        if (!annotation.canvas_data?.objects || annotation.canvas_data.objects.length === 0) {
          return;
        }

        // Convert objects from reference resolution to current canvas size
        const convertedObjects = convertFromReferenceResolution(
          annotation.canvas_data.objects,
          dimensions.width,
          dimensions.height
        );

        console.log('🎯 Carregando anotação para visualização:', {
          annotationId: annotation.id,
          reference: `${REFERENCE_WIDTH}x${REFERENCE_HEIGHT}`,
          current: `${dimensions.width}x${dimensions.height}`,
          objectCount: convertedObjects.length,
          canvasData: annotation.canvas_data,
          originalObjects: annotation.canvas_data.objects,
          convertedObjects: convertedObjects,
        });

        // Enliven objects and add to canvas
        const objects = await util.enlivenObjects(convertedObjects);

        objects.forEach((obj: any, index: number) => {
          if (obj) {
            console.log(`🎨 Adicionando objeto ${index}:`, {
              type: obj.type,
              left: obj.left,
              top: obj.top,
              width: obj.width,
              height: obj.height,
              originalStroke: obj.stroke,
              originalFill: obj.fill,
            });

            // Style the annotation objects for maximum visibility
            obj.set({
              selectable: false,
              evented: false,
              stroke: '#ff0000', // Bright red for visibility
              strokeWidth: 4,
              fill: obj.type === 'path' ? undefined : 'rgba(255, 0, 0, 0.3)', // Semi-transparent red
              opacity: 1,
              visible: true,
            });
            
            obj.setCoords();
            canvas.add(obj);
          }
        });

        canvas.renderAll();
        console.log(`✅ Anotação carregada com ${objects.length} objetos`);
      } catch (error) {
        console.error('Erro ao carregar anotação para visualização:', error);
      }
    };

    loadAnnotation();
  }, [annotation, dimensions]);

  if (!annotation) {
    return null;
  }

  console.log('🔍 AnnotationViewer renderizando:', {
    hasAnnotation: !!annotation,
    annotationId: annotation?.id,
    hasCanvasData: !!annotation?.canvas_data,
    objectCount: annotation?.canvas_data?.objects?.length || 0,
    dimensions: dimensions,
  });

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 100 }}
    >
      {/* Canvas positioned exactly over video */}
      <div 
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          width: dimensions.width,
          height: dimensions.height,
        }}
      >
        <canvas
          ref={canvasRef}
          className="block"
          style={{
            width: dimensions.width,
            height: dimensions.height,
            position: 'absolute',
            top: 0,
            left: 0,
            border: '2px solid red', // Debug border
            backgroundColor: 'rgba(255, 0, 0, 0.1)', // Debug background
          }}
        />
      </div>

      {/* Annotation info overlay */}
      <div className="absolute top-4 right-4 bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm pointer-events-auto max-w-xs">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Visualizando Anotação</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 text-white hover:bg-white/20 -mt-1 -mr-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="text-xs text-gray-300 space-y-1">
          <div>
            <span className="text-primary font-medium">Tempo:</span> {formatTime(annotation.timestamp_ms)}
          </div>
          {annotation.comment && (
            <div>
              <span className="text-primary font-medium">Comentário:</span>
              <div className="text-white mt-1 text-sm">{annotation.comment}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
