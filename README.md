# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

# AIOS - Sistema de Análise e Inteligência Operacional

## 📋 Visão Geral

AIOS é uma plataforma web para gerenciamento de frotas de dispositivos (Fleet Management) e análise de vídeo em tempo real. O sistema permite o monitoramento centralizado do status e da saúde de câmeras e outros sensores, combinado com um poderoso construtor de pipelines visuais para automação de tarefas de IA.

## 🚀 Tecnologias

- **Frontend**: React.js com TypeScript
- **Estilização**: Tailwind CSS
- **Build Tool**: Vite
- **Pipelines Visuais**: React Flow
- **Gráficos**: Recharts
- **Estado Global**: Zustand
- **Ícones**: Lucide React
- **Notificações**: React Hot Toast
- **Formulários**: React Hook Form
- **Validação**: Zod
- **Data/Hora**: date-fns

## 🏗️ Estrutura do Projeto

```
src/
├── components/
│   ├── fleet/           # Componentes específicos do Fleet Management
│   │   ├── DeviceListItem.tsx
│   │   ├── SearchBar.tsx
│   │   ├── StatusIndicator.tsx
│   │   └── SummaryCard.tsx
│   └── layout/          # Componentes de layout
│       ├── Header.tsx
│       ├── Layout.tsx
│       └── Sidebar.tsx
├── pages/               # Páginas principais
│   ├── FleetManagement.tsx
│   ├── Dashboard.tsx
│   └── Pipelines.tsx
├── stores/              # Gerenciamento de estado
│   └── appStore.ts
├── types/               # Definições TypeScript
│   └── index.ts
└── main.tsx
```

## 🎨 Design System

### Paleta de Cores
- **Laranja Primário**: #FF6B35 (Botões principais, elementos ativos)
- **Cinza Escuro**: #2D2D2D (Sidebar, backgrounds principais)
- **Cores de Status**:
  - Verde (#4CAF50): Dispositivos online
  - Amarelo (#FFC107): Warnings
  - Vermelho (#F44336): Erros/offline

### Layout
- **Sidebar**: 80px (colapsado) / 240px (expandido)
- **Estrutura**: Sidebar + Header + Main Content
- **Responsivo**: Design adaptável para diferentes tamanhos de tela

## 🧭 Navegação Principal

1. **Fleet Management** - Tela principal para monitoramento da frota
2. **Dashboard** - Visualização de dados agregados e métricas
3. **Pipelines** - Criação de fluxos de processamento de vídeo
4. **Configurações** - Configurações globais do sistema
5. **Documentação** - Acesso à documentação técnica
6. **Suporte** - Canal de comunicação para suporte
7. **Perfil** - Gerenciamento do perfil do usuário

## 🔧 Comandos Disponíveis

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build de produção
npm run preview

# Linting do código
npm run lint
```

## 🖥️ Executando o Projeto

1. **Instale as dependências**:
   ```bash
   npm install
   ```
2. **Execute o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```
3. **Acesse**: http://localhost:5173

## 📱 Funcionalidades Implementadas

### Fleet Management
- ✅ Lista de dispositivos com busca em tempo real
- ✅ Indicadores visuais de status (ON/OFF/WARNING)
- ✅ Informações de última visualização (Last Seen)
- ✅ Cards de resumo com estatísticas da frota
- ✅ Interface responsiva

### Componentes Base
- ✅ Sidebar de navegação com ícones Lucide
- ✅ Layout principal responsivo
- ✅ Sistema de notificações (Toast)
- ✅ Gerenciamento de estado com Zustand
- ✅ Tipagem TypeScript completa

## 🔄 Próximas Implementações

### Dashboard
- 📊 Widgets de visualização de dados
- 📈 Gráficos interativos com Recharts
- 🎛️ Customização de layout

### Pipelines
- 🔧 Editor visual de pipelines com React Flow
- 🤖 Nós de IA para detecção de objetos
- ⚙️ Sistema de configuração de parâmetros

### Funcionalidades Avançadas
- 🎥 Streaming de vídeo WebRTC
- 🧠 Integração TensorFlow.js
- 📱 Notificações push
- 🔐 Sistema de autenticação

---

**AIOS v2.0** - Sistema de Análise e Inteligência Operacional

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
