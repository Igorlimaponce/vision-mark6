// Biblioteca de nós disponíveis

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import type { NodeTemplate } from '../../types/pipeline';

interface NodeLibraryProps {
  templates: NodeTemplate[];
  onDragStart: (template: NodeTemplate, event: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export const NodeLibrary: React.FC<NodeLibraryProps> = ({
  templates,
  onDragStart,
  onDragEnd,
  isDragging
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filtrar templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Agrupar por categoria
  const groupedTemplates = filteredTemplates.reduce((groups, template) => {
    const category = template.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(template);
    return groups;
  }, {} as Record<string, NodeTemplate[]>);

  const categories = [
    { id: 'all', name: 'Todos', icon: '📋' },
    { id: 'input', name: 'Entrada', icon: '📹' },
    { id: 'processing', name: 'Processamento', icon: '⚙️' },
    { id: 'analytics', name: 'Análise', icon: '📊' },
    { id: 'output', name: 'Saída', icon: '📤' }
  ];

  const categoryNames = {
    input: 'Entrada',
    processing: 'Processamento',
    analytics: 'Análise',
    output: 'Saída'
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Biblioteca de Nós
        </h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar nós..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-1">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedCategory === category.id
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedCategory === 'all' ? (
          // Mostrar agrupado por categoria
          Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                {categoryNames[category as keyof typeof categoryNames]}
              </h3>
              <div className="space-y-2">
                {categoryTemplates.map(template => (
                  <NodeTemplateCard
                    key={template.type}
                    template={template}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    isDragging={isDragging}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          // Mostrar lista simples
          <div className="space-y-2">
            {filteredTemplates.map(template => (
              <NodeTemplateCard
                key={template.type}
                template={template}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                isDragging={isDragging}
              />
            ))}
          </div>
        )}

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhum nó encontrado</p>
            <p className="text-sm">Tente ajustar os filtros</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface NodeTemplateCardProps {
  template: NodeTemplate;
  onDragStart: (template: NodeTemplate, event: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

const NodeTemplateCard: React.FC<NodeTemplateCardProps> = ({
  template,
  onDragStart,
  onDragEnd,
  isDragging
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(template, e)}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        p-3 border border-gray-200 rounded-lg cursor-move transition-all
        ${isHovered ? 'border-orange-300 shadow-md' : ''}
        ${isDragging ? 'opacity-50' : ''}
        hover:bg-gray-50
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{template.icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {template.name}
          </h4>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {template.description}
          </p>
          
          {/* Input/Output indicators */}
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>{template.inputs.length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>{template.outputs.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
