import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ArrowLeft, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { FrameIOStylePlayer } from "@/components/FrameIOStylePlayer";
import { toast } from 'sonner';
import logoOrange from '@/assets/logo-orange-bg.png';
import logoWhite from '@/assets/logo-white-bg.png';

interface Project {
  id: string;
  title: string;
  client: string;
  client_email: string;
  status: string;
  video_url: string;
  description?: string;
}

interface VideoAnnotation {
  id: string;
  timestamp_ms: number;
  comment: string | null;
  canvas_data: any;
  created_at: string;
  client_name?: string;
  client_email?: string;
}

const AudiovisualApproval = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [project, setProject] = useState<Project | null>(null);
  const [annotations, setAnnotations] = useState<VideoAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);

      // Buscar projeto
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Buscar anotações existentes
      const { data: annotationsData } = await supabase
        .from('video_annotations')
        .select('*')
        .eq('project_id', projectId)
        .order('timestamp_ms', { ascending: true });

      setAnnotations(annotationsData || []);
    } catch (error) {
      console.error('Erro ao buscar projeto:', error);
      toast.error('Erro ao carregar projeto');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: 'approved',
          approval_date: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) throw error;

      // Salvar avaliação se fornecida
      if (rating > 0) {
        await supabase
          .from('platform_reviews')
          .insert([{
            project_id: projectId,
            rating: rating,
            client_name: project?.client,
            client_email: project?.client_email,
          }]);
      }

      setProject(prev => prev ? { ...prev, status: 'approved' } : null);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Erro ao aprovar projeto:', error);
      toast.error('Erro ao aprovar projeto');
    }
  };

  const handleReject = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'feedback-sent' })
        .eq('id', projectId);

      if (error) throw error;

      // Salvar avaliação se fornecida
      if (rating > 0) {
        await supabase
          .from('platform_reviews')
          .insert([{
            project_id: projectId,
            rating: rating,
            client_name: project?.client,
            client_email: project?.client_email,
          }]);
      }

      setProject(prev => prev ? { ...prev, status: 'feedback-sent' } : null);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      toast.error('Erro ao enviar feedback');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-primary mb-2">Carregando projeto...</h2>
          <div className="mt-12 h-1 w-32 bg-gradient-to-r from-primary to-primary/60 mx-auto rounded-full" />
        </motion.div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Projeto não encontrado</h2>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  if (showConfirmation) {
    const isApproved = project.status === 'approved';

    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-3xl"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-12 inline-block"
          >
            <img 
              src={logoWhite} 
              alt="OK Lab Logo" 
              className="h-32 w-auto"
            />
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-6xl font-bold text-primary mb-8 font-['Inter']"
          >
            {isApproved ? "Projeto Aprovado!" : "Feedback Enviado!"}
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-xl text-gray-600 mb-12 leading-relaxed"
          >
            {isApproved 
              ? "Obrigado por aprovar o projeto! Nossa equipe foi notificada e entrará em contato em breve."
              : "Seu feedback foi enviado com sucesso! Nossa equipe analisará suas observações e retornará com as correções."
            }
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-12 h-1 w-32 bg-gradient-to-r from-primary to-primary/60 mx-auto rounded-full"
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Helmet>
        <title>Aprovação de Vídeo - {project.title}</title>
      </Helmet>

      {/* Header Premium Clean com Logo, Título e Badge */}
      <header className={`bg-gradient-to-r from-primary to-primary/90 shadow-lg ${isMobile ? 'py-3' : 'py-4'}`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4">
            <img 
              src={logoOrange} 
              alt="OK Lab Logo" 
              className={`w-auto ${isMobile ? 'h-10' : 'h-14'}`}
            />
            
            <div className="flex-1 text-center">
              <h1 className={`font-bold text-white tracking-tight ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                APROVE SEU CONTEÚDO
              </h1>
            </div>

            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {project.status === 'pending' ? 'Aguardando' : 'Revisão'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-8">
        {/* Project Info */}
        <Card className="mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{project.title}</h2>
              <p className="text-gray-600">Cliente: {project.client}</p>
            </div>
          </div>
          
          {project.description && (
            <p className="text-gray-700 mb-4">{project.description}</p>
          )}

          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-primary">Como revisar:</span> 
              Assista ao vídeo, adicione comentários nos momentos específicos ou desenhe diretamente no vídeo para marcar correções. Depois, aprove ou envie feedback.
            </p>
          </div>
        </Card>

        {/* Frame.io Style Video Player */}
        <div className="mb-8">
          <FrameIOStylePlayer
            videoUrl={project.video_url}
            annotations={annotations}
            isClientView={true}
            onAddAnnotation={async (annotation) => {
              try {
                const { data, error } = await supabase
                  .from('video_annotations')
                  .insert([{
                    project_id: project.id,
                    timestamp_ms: annotation.timestamp_ms,
                    comment: annotation.comment,
                    canvas_data: annotation.canvas_data,
                    client_name: annotation.client_name,
                    client_email: annotation.client_email,
                  }])
                  .select()
                  .single();

                if (error) throw error;

                setAnnotations(prev => [...prev, data]);
                toast.success('Comentário adicionado com sucesso!');
              } catch (error) {
                console.error('Erro ao salvar anotação:', error);
                toast.error('Erro ao salvar comentário');
              }
            }}
            clientName={project.client}
            clientEmail={project.client_email}
          />
        </div>

        {/* Rating Section */}
        <Card className="mb-6 p-6">
          <h3 className="text-lg font-semibold mb-4">Avalie nossa plataforma (opcional)</h3>
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`p-1 transition-colors ${
                  star <= rating ? 'text-yellow-400' : 'text-gray-300'
                }`}
              >
                <Star className="w-6 h-6 fill-current" />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-gray-600">
              Obrigado pela avaliação de {rating} estrela{rating > 1 ? 's' : ''}!
            </p>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={handleReject}
            variant="outline"
            size="lg"
            className="min-w-[200px]"
          >
            <XCircle className="w-5 h-5 mr-2" />
            Enviar Feedback
          </Button>
          
          <Button
            onClick={handleApprove}
            size="lg"
            className="min-w-[200px] bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Aprovar Projeto
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AudiovisualApproval;
