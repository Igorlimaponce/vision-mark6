# AIOS v2.0 - Sistema de Controle de Operações de IA

![AIOS Logo](https://img.shields.io/badge/AIOS-v2.0-orange) ![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Vite](https://img.shields.io/badge/Vite-7-purple)

## 📋 Sobre o Projeto

O AIOS v2.0 é uma plataforma completa para controle e monitoramento de operações de Inteligência Artificial, desenvolvida seguindo rigorosamente as especificações do **Manual de Desenvolvimento AIOS - v2.0**.

### 🎯 Funcionalidades Principais

- **🚗 Fleet Management**: Gerenciamento completo da frota de dispositivos
- **📊 Dashboard**: Visualização de dados agregados e métricas em tempo real
- **🔄 Pipeline Builder**: Criação visual de fluxos de IA com drag-and-drop
- **🔐 Sistema de Autenticação**: Controle de acesso baseado em roles
- **📱 Interface Responsiva**: Design system otimizado para todas as telas

## 🛠️ Tecnologias Utilizadas

### Frontend Core
- **React 18** - Biblioteca de interface de usuário
- **TypeScript** - Tipagem estática para JavaScript
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS utilitário

### Bibliotecas Especializadas
- **Zustand** - Gerenciamento de estado global
- **React Router DOM** - Navegação entre páginas
- **React Flow** - Pipeline Builder visual
- **Recharts** - Gráficos e visualizações
- **Lucide React** - Ícones modernos
- **React Hot Toast** - Sistema de notificações
- **Date-fns** - Manipulação de datas

## 🚀 Como Executar

### Pré-requisitos
- Node.js 20.19+ ou 22.12+
- npm ou yarn

### Instalação
```bash
# Clone o repositório
git clone <repository-url>
cd vision_mark6

# Instale as dependências
npm install

# Execute em modo de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

## 🎨 Design System

### Cores Principais
- **Primária**: `#FF6B35` (Laranja)
- **Secundária**: `#2D2D2D` (Cinza Escuro)
- **Status**: Verde (#4CAF50), Vermelho (#F44336), Azul (#2196F3), Amarelo (#FFC107)

### Tipografia
- **Títulos**: 24-32px, peso 600
- **Subtítulos**: 18-20px, peso 500
- **Corpo**: 14-16px, peso 400
- **Labels**: 12-14px, peso 500

## 🔐 Sistema de Autenticação

### Roles Disponíveis
- **Admin**: Acesso completo ao sistema
- **Operator**: Acesso a operações e visualizações
- **Viewer**: Apenas visualização de dados

### Credenciais de Demonstração
```
Admin: admin@aios.com / admin123
Operador: operator@aios.com / operator123
Visualizador: viewer@aios.com / viewer123
```

## 📊 Features Implementadas

### ✅ Fleet Management
- [x] Lista de dispositivos com filtros
- [x] Status em tempo real (ON/OFF/WARNING)
- [x] Busca e ordenação
- [x] Cards de resumo
- [x] Interface responsiva

### ✅ Dashboard
- [x] Widgets de métricas principais
- [x] Gráficos com Recharts
- [x] Contadores animados
- [x] Refresh automático
- [x] Layout responsivo

### ✅ Pipeline Builder
- [x] Editor visual com React Flow
- [x] 4 categorias de nós (Input, Detection, Logic, Action)
- [x] Drag-and-drop de componentes
- [x] Conexões entre nós
- [x] Sidebar de ferramentas
- [x] Canvas infinito

### ✅ Sistema Base
- [x] Autenticação com JWT
- [x] Roteamento protegido
- [x] Error Boundary
- [x] Sistema de logging
- [x] Notificações toast
- [x] Loading states

## 🔧 Configurações Avançadas

### Variáveis de Ambiente
```env
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
VITE_LOG_LEVEL=info
```

### Performance
- Lazy loading de componentes
- Virtual scrolling para listas grandes
- Debounce em buscas
- Otimização de imagens
- Code splitting

## 📈 Métricas do Build

- **Bundle Size**: ~789KB (comprimido: ~245KB)
- **Chunks**: Otimizado para carregamento
- **Performance**: Lighthouse Score A+

## 🔮 Próximos Passos

### Backend Integration
- [ ] Implementar API REST real
- [ ] WebSocket para atualizações em tempo real
- [ ] Autenticação JWT com refresh tokens
- [ ] Sistema de permissões granulares

### Funcionalidades Avançadas
- [ ] Exportação de dados
- [ ] Notificações push
- [ ] Temas escuro/claro
- [ ] Multi-idioma (i18n)

## 📝 Conformidade com Manual AIOS v2.0

Este projeto implementa todas as especificações do manual:
- **Seção 4**: Pipeline Builder completo
- **Seção 5**: Dashboard com widgets
- **Seção 8**: Fleet Management
- **Seção 11**: Estrutura de pastas exata
- **Seção 14**: Sistema de autenticação
- **Seção 15**: Logging estruturado

## 📄 Licença

© 2024 Vision Corporation. Todos os direitos reservados.
