# 🚀 GUIA DE COMANDOS - DESENVOLVIMENTO AIOS v2.0

## 🐳 **DOCKER COMMANDS**

### **Inicialização Completa:**
```bash
# Iniciar todos os serviços
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Verificar status
docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps
```

### **Logs e Monitoramento:**
```bash
# Ver logs de todos os serviços
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# Logs de um serviço específico
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f db

# Últimas 50 linhas de log
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=50 backend
```

### **Reinicialização:**
```bash
# Reiniciar um serviço
docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart frontend
docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart backend

# Rebuild e restart (quando há mudanças no Dockerfile)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build frontend
```

### **Parar/Limpar:**
```bash
# Parar todos os serviços
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

# Parar e remover volumes (CUIDADO: perde dados do banco)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

---

## 🗄️ **DATABASE COMMANDS**

### **Acesso ao PostgreSQL:**
```bash
# Conectar ao banco
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec db psql -U postgres -d aios_dev

# Executar query diretamente
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec db psql -U postgres -d aios_dev -c "SELECT * FROM devices LIMIT 5;"
```

### **Queries Úteis:**
```sql
-- Ver todos os devices
SELECT id, name, status, device_type, location FROM devices;

-- Ver usuários
SELECT id, email, role, is_active FROM users;

-- Ver pipelines  
SELECT id, name, status, organization_id FROM pipelines;

-- Contar devices por status
SELECT status, COUNT(*) FROM devices GROUP BY status;
```

### **Reset Database (se necessário):**
```bash
# Parar serviços
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

# Remover volume do banco (CUIDADO!)
docker volume rm vision_mark6_postgres_data

# Iniciar novamente (vai recriar dados)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

---

## 🌐 **API TESTING COMMANDS**

### **Autenticação:**
```bash
# Login
curl -X POST "http://localhost:8000/api/v1/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@aios.com", "password": "admin123"}'

# Salvar token em variável (macOS/Linux)
export TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@aios.com", "password": "admin123"}' | \
     jq -r '.access_token')

echo $TOKEN
```

### **Fleet Management:**
```bash
# Listar devices (com token)
curl -X GET "http://localhost:8000/api/v1/fleet/" \
     -H "Authorization: Bearer $TOKEN"

# Get device específico
curl -X GET "http://localhost:8000/api/v1/fleet/550e8400-e29b-41d4-a716-446655440010" \
     -H "Authorization: Bearer $TOKEN"

# Fleet summary
curl -X GET "http://localhost:8000/api/v1/fleet/summary" \
     -H "Authorization: Bearer $TOKEN"
```

### **Pipelines:**
```bash
# Listar pipelines
curl -X GET "http://localhost:8000/api/v1/pipelines/" \
     -H "Authorization: Bearer $TOKEN"

# Executar pipeline
curl -X POST "http://localhost:8000/api/v1/pipelines/{pipeline_id}/execute" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"action": "start"}'
```

### **Health Checks:**
```bash
# Backend health
curl http://localhost:8000/health

# API docs
curl http://localhost:8000/docs

# Frontend
curl -I http://localhost:5173
```

---

## 🔧 **DEVELOPMENT WORKFLOW**

### **Ao começar o desenvolvimento:**
```bash
# 1. Verificar se Docker está rodando
docker ps

# 2. Iniciar serviços se não estiverem
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 3. Verificar logs
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=10

# 4. Testar endpoints básicos
curl http://localhost:8000/health
curl -I http://localhost:5173
```

### **Durante desenvolvimento:**
```bash
# Quando modificar backend Python
docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart backend

# Quando modificar frontend (geralmente não precisa restart)
# Hot reload é automático no Vite

# Ver logs em tempo real durante desenvolvimento
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f backend frontend
```

### **Para testar mudanças:**
```bash
# 1. Fazer login e pegar token
export TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email": "admin@aios.com", "password": "admin123"}' | jq -r '.access_token')

# 2. Testar endpoint modificado
curl -X GET "http://localhost:8000/api/v1/fleet/" -H "Authorization: Bearer $TOKEN"

# 3. Verificar no frontend
# Abrir http://localhost:5173
```

---

## 🐛 **TROUBLESHOOTING**

### **Frontend não carrega:**
```bash
# Verificar se porta 5173 está livre
lsof -i :5173

# Reiniciar frontend
docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart frontend

# Ver logs detalhados
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs frontend
```

### **Backend não responde:**
```bash
# Verificar se porta 8000 está livre
lsof -i :8000

# Reiniciar backend
docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart backend

# Ver logs detalhados
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs backend
```

### **Problemas de banco:**
```bash
# Verificar conexão
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec db pg_isready

# Ver logs do banco
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs db

# Resetar dados (CUIDADO!)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
docker volume rm vision_mark6_postgres_data
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### **Problemas de CORS:**
```bash
# Verificar se frontend está fazendo request para localhost:8000
# Ver Network tab no DevTools do browser

# Verificar configuração CORS no backend
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs backend | grep -i cors
```

---

## 📊 **MONITORING COMMANDS**

### **Performance:**
```bash
# Ver uso de recursos dos containers
docker stats

# Ver containers rodando
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### **Network:**
```bash
# Ver networks Docker
docker network ls

# Inspecionar network do projeto
docker network inspect vision_mark6_default
```

---

## 🚀 **QUICK START PARA NOVOS DEVS**

```bash
# 1. Clone e entre no diretório
git clone <repo>
cd vision_mark6

# 2. Copie o arquivo de ambiente
cp .env.example .env

# 3. Inicie tudo
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 4. Aguarde ~30 segundos para tudo inicializar

# 5. Teste se está funcionando
curl http://localhost:8000/health
curl -I http://localhost:5173

# 6. Faça login de teste
curl -X POST "http://localhost:8000/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email": "admin@aios.com", "password": "admin123"}'

# 7. Acesse o frontend
# http://localhost:5173
# Login: admin@aios.com / admin123
```

**🎉 Pronto para desenvolvimento!**