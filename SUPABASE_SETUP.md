# 🚀 Configuração Supabase para OKLab

## 📋 Resumo da Infraestrutura

### ✅ **Plano Pro - Capacidades Disponíveis**
- **Storage:** 100GB incluído
- **Bandwidth:** 200GB incluído  
- **Upload máximo:** 500MB por arquivo
- **Database:** Postgres completo
- **Edge Functions:** Ilimitadas
- **Realtime:** Incluído

## 🔧 **Configuração Necessária**

### 1. **Storage Buckets**

Execute o SQL abaixo no **SQL Editor** do Supabase:

```sql
-- Executar o arquivo: supabase-storage-setup.sql
```

### 2. **Verificar Configuração CORS**

No painel do Supabase, vá em **Settings > API** e adicione:

```json
{
  "allowedOrigins": ["*"],
  "allowedMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "allowedHeaders": ["*"],
  "maxAge": 3600
}
```

### 3. **Configurar Edge Functions**

As Edge Functions já estão no projeto:
- `upload-audiovisual-video`
- `complete-project`
- `generate-delivery-kit`
- `cleanup-orphaned-files`

## 📊 **Estrutura de Storage**

### **Bucket: `videos`**
- **Tamanho máximo:** 500MB por arquivo
- **Formatos:** MP4, WebM, QuickTime, AVI
- **Estrutura:** `videos/{project_id}/{timestamp}.{ext}`
- **Público:** Sim (URLs diretas)

### **Bucket: `thumbnails`**
- **Tamanho máximo:** 10MB por arquivo
- **Formatos:** JPEG, PNG, WebP
- **Estrutura:** `thumbnails/{project_id}/{annotation_id}.{ext}`
- **Público:** Sim

## 🔐 **Políticas RLS (Row Level Security)**

### **Videos Bucket:**
```sql
-- Upload: Apenas usuários autenticados
-- Leitura: Público
-- Deleção: Apenas proprietário
```

### **Thumbnails Bucket:**
```sql
-- Upload: Apenas usuários autenticados  
-- Leitura: Público
-- Deleção: Apenas proprietário
```

## 🚀 **Como Aplicar**

### **Opção A - SQL Editor (Recomendado)**
1. Acesse **SQL Editor** no Supabase
2. Cole o conteúdo de `supabase-storage-setup.sql`
3. Execute o script
4. Verifique se os buckets foram criados

### **Opção B - CLI (Avançado)**
```bash
supabase db push
supabase storage ls
```

## 📈 **Monitoramento**

### **Verificar Usage:**
- **Dashboard > Settings > Usage**
- **Storage:** Acompanhar uso dos 100GB
- **Bandwidth:** Acompanhar transferência

### **Logs:**
- **Dashboard > Logs**
- **Storage logs:** Uploads/downloads
- **Database logs:** Queries

## 🔧 **Configurações Adicionais**

### **Otimização de Performance:**
```sql
-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_projects_video_url ON projects(video_url);
CREATE INDEX IF NOT EXISTS idx_video_annotations_project_id ON video_annotations(project_id);
CREATE INDEX IF NOT EXISTS idx_video_annotations_timestamp ON video_annotations(timestamp_ms);
```

### **Limpeza Automática:**
```sql
-- Agendar limpeza de arquivos órfãos (opcional)
SELECT cron.schedule(
  'cleanup-orphaned-files',
  '0 2 * * *', -- Todo dia às 2h
  'SELECT cleanup_orphaned_files();'
);
```

## ⚠️ **Limites e Considerações**

### **Upload Limits:**
- **Arquivo único:** 500MB
- **Timeout:** 10 minutos
- **Concurrent uploads:** 10

### **Bandwidth:**
- **200GB/mês incluído**
- **$0.09/GB adicional**
- **CDN global incluído**

### **Storage:**
- **100GB incluído**
- **$0.021/GB adicional**
- **Backup automático**

## 🎯 **Status Atual**

- ✅ **Credenciais:** Configuradas
- ✅ **Database:** Funcionando
- ⏳ **Storage:** Aguardando configuração
- ⏳ **CORS:** Aguardando configuração
- ✅ **Edge Functions:** Disponíveis

## 🚀 **Próximos Passos**

1. **Execute o SQL** de configuração do Storage
2. **Configure CORS** se necessário
3. **Teste upload** de vídeo pequeno
4. **Valide políticas** RLS
5. **Monitor usage** no dashboard

---

**📞 Suporte:** Se precisar de ajuda, posso configurar via MCP ou orientar passo a passo!
