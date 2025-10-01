import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle2, Clock, Star, MessageSquare, Video, User, Mail, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { FrameIOStylePlayer } from "@/components/FrameIOStylePlayer";

interface Project {
  id: string;
  title: string;
  client: string;
  status: string;
  type: string;
  description: string | null;
  created_at: string;
  completed_at: string | null;
  approval_date: string | null;
  video_url: string | null;
}

interface PlatformReview {
  id: string;
  rating: number;
  comment: string | null;
  client_name: string | null;
  client_email: string;
  created_at: string;
}

interface VideoAnnotation {
  id: string;
  timestamp_ms: number;
  comment: string | null;
  canvas_data: any;
  created_at: string;
}

const ClientReturn = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [review, setReview] = useState<PlatformReview | null>(null);
  const [annotations, setAnnotations] = useState<VideoAnnotation[]>([]);

  useEffect(() => {
    fetchProjectReturn();
  }, [projectId]);

  const fetchProjectReturn = async () => {
    try {
      setLoading(true);

      // Buscar projeto
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Buscar review/rating
      const { data: reviewData } = await supabase
        .from("platform_reviews")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setReview(reviewData);

      // Buscar anotações visuais (feedback detalhado do cliente)
      const { data: annotationsData } = await supabase
        .from("video_annotations")
        .select("*")
        .eq("project_id", projectId)
        .order("timestamp_ms", { ascending: true });

      console.log('🔍 Anotações carregadas do banco:', {
        projectId,
        count: annotationsData?.length || 0,
        annotations: annotationsData?.map(ann => ({
          id: ann.id,
          timestamp: ann.timestamp_ms,
          hasCanvasData: !!ann.canvas_data,
          objectCount: ann.canvas_data?.objects?.length || 0,
          comment: ann.comment,
        })) || []
      });

      setAnnotations(annotationsData || []);
    } catch (error: any) {
      console.error("Erro ao buscar retorno do cliente:", error);
      toast.error("Erro ao carregar retorno do cliente");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "success" | "warning", label: string }> = {
      pending: { variant: "warning", label: "Aguardando" },
      approved: { variant: "success", label: "Aprovado" },
      in_review: { variant: "secondary", label: "Em Revisão" },
      completed: { variant: "success", label: "Concluído" },
    };
    
    const config = variants[status] || { variant: "default", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating ? "fill-warning text-warning" : "text-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  const formatTimestamp = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando retorno do cliente...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Projeto não encontrado</CardTitle>
            <CardDescription>
              Não foi possível encontrar o projeto solicitado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/projetos")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Projetos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasClientReturn = project.completed_at || review || annotations.length > 0;

  return (
    <>
      <Header title="Retorno do Cliente" />
      
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/projetos")}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Projetos
        </Button>

        {/* Informações do Projeto */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{project.title}</CardTitle>
                <CardDescription className="text-base">
                  Cliente: {project.client}
                </CardDescription>
              </div>
              {getStatusBadge(project.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Criado em</p>
                  <p className="text-muted-foreground">
                    {format(new Date(project.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {project.completed_at && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <div>
                    <p className="font-medium">Retorno recebido em</p>
                    <p className="text-muted-foreground">
                      {format(new Date(project.completed_at), "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}

              {project.approval_date && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <div>
                    <p className="font-medium">Aprovado em</p>
                    <p className="text-muted-foreground">
                      {format(new Date(project.approval_date), "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {project.description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estatísticas do Retorno */}
        {hasClientReturn && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{annotations.length}</p>
                    <p className="text-sm text-muted-foreground">
                      Anotações Visuais
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-warning/10 rounded-lg">
                    <Star className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {review?.rating || "N/A"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Avaliação Geral
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Video className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {annotations.length > 0
                        ? formatTimestamp(
                            Math.max(...annotations.map((a) => a.timestamp_ms))
                          )
                        : "00:00"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Último Comentário
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Status sem Retorno */}
        {!hasClientReturn && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-warning" />
                Aguardando Retorno do Cliente
              </CardTitle>
              <CardDescription>
                O cliente ainda não enviou feedback para este projeto.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Vídeo Aprovado pelo Cliente com Anotações */}
        {project.video_url && (
          <>
            {console.log('🎬 Renderizando ClientVideoAnnotationViewer:', {
              videoUrl: project.video_url,
              annotationsCount: annotations.length,
              firstAnnotation: annotations[0],
              hasAnnotations: annotations.length > 0,
            })}
            <FrameIOStylePlayer 
              videoUrl={project.video_url}
              annotations={annotations}
              isClientView={false}
            />
          </>
        )}

        {/* Debug: Informações das Anotações */}
        {annotations.length > 0 && (
          <Card className="border-blue-500 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-700">🔍 Debug: Anotações Encontradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Total de anotações:</strong> {annotations.length}</p>
                {annotations.map((ann, index) => (
                  <div key={ann.id} className="p-2 bg-white rounded border">
                    <p><strong>Anotação {index + 1}:</strong></p>
                    <p>• ID: {ann.id}</p>
                    <p>• Tempo: {ann.timestamp_ms}ms</p>
                    <p>• Comentário: {ann.comment || 'Sem comentário'}</p>
                    <p>• Canvas Data: {ann.canvas_data ? 'Presente' : 'Ausente'}</p>
                    <p>• Objetos: {ann.canvas_data?.objects?.length || 0}</p>
                    {ann.canvas_data?.objects && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-600">Ver dados do canvas</summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                          {JSON.stringify(ann.canvas_data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Avaliação do Cliente - Sempre mostrar se houver review */}
        {false && project.video_url && annotations.length === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Vídeo sem anotações - Coluna Esquerda (60%) */}
            <div className="lg:col-span-3">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Video className="w-5 h-5 text-primary" />
                      Vídeo Aprovado pelo Cliente
                    </CardTitle>
                    <Badge variant="success" className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Aprovado na íntegra
                    </Badge>
                  </div>
                  <CardDescription>
                    Este vídeo foi aprovado sem comentários ou modificações sugeridas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <video 
                      controls 
                      className="w-full rounded-lg aspect-video"
                      src={project.video_url}
                    >
                      Seu navegador não suporta a reprodução de vídeos.
                    </video>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <p>
                        O cliente aprovou este vídeo sem solicitar alterações. 
                        Não há anotações visuais ou comentários adicionais.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Avaliação do Cliente - Coluna Direita (40%) */}
            {review && (
              <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-warning" />
                    Avaliação do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Classificação</p>
                    {renderStars(review.rating)}
                  </div>

                  {review.comment && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Comentário Geral
                      </p>
                      <p className="text-sm bg-muted/50 p-4 rounded-lg leading-relaxed">
                        {review.comment}
                      </p>
                    </div>
                  )}

                  <Separator />

                  <div className="grid grid-cols-1 gap-4">
                    {review.client_name && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Cliente
                        </p>
                        <p className="text-sm font-medium flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {review.client_name}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">E-mail</p>
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {review.client_email}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      Avaliado em {format(new Date(review.created_at), "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            )}
          </div>
        )}

        {/* Feedback Visual Detalhado (Lista) */}
        {annotations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                Feedback Visual Detalhado
              </CardTitle>
              <CardDescription>
                Lista completa de todas as {annotations.length} anotações visuais e comentários do cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {annotations.map((annotation, index) => {
                const hasDrawing = annotation.canvas_data?.objects?.length > 0;
                const drawingCount = annotation.canvas_data?.objects?.length || 0;
                
                return (
                  <div
                    key={annotation.id}
                    className="p-4 border rounded-lg hover:bg-muted/30 transition-colors space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono font-bold text-base">
                              {formatTimestamp(annotation.timestamp_ms)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(annotation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {hasDrawing && (
                          <Badge variant="secondary" className="text-xs">
                            <Pencil className="w-3 h-3 mr-1" />
                            {drawingCount} desenho{drawingCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {annotation.comment && (
                          <Badge variant="outline" className="text-xs">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Comentário
                          </Badge>
                        )}
                      </div>
                    </div>

                    {annotation.comment && (
                      <div className="ml-13 pl-4 border-l-2 border-primary/20">
                        <p className="text-sm leading-relaxed">
                          {annotation.comment}
                        </p>
                      </div>
                    )}

                    {hasDrawing && (
                      <div className="ml-13 pl-4 border-l-2 border-blue-500/20">
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <Pencil className="w-3 h-3" />
                          Cliente desenhou {drawingCount} elemento{drawingCount > 1 ? 's' : ''} na tela para indicar o feedback visual
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default ClientReturn;