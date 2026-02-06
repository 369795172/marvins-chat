'use client';

import { Model, ModelInfo } from '@/lib/types';
import { useEffect, useState } from 'react';

interface ModelSelectorProps {
  selectedModel: Model;
  onModelChange: (model: Model) => void;
  disabled?: boolean;
}

export default function ModelSelector({
  selectedModel,
  onModelChange,
  disabled = false,
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch models from API
    const fetchModels = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/models');
        if (!response.ok) {
          throw new Error('Failed to fetch models');
        }
        
        const data = await response.json();
        const fetchedModels = data.models || [];
        setModels(fetchedModels);
        
        // If selected model is not in the list and we have models, select the first one
        if (fetchedModels.length > 0) {
          const modelIds = fetchedModels.map((m: ModelInfo) => m.id);
          if (!modelIds.includes(selectedModel)) {
            // Only update if the selected model is not available
            onModelChange(fetchedModels[0].id);
          }
        }
      } catch (err: any) {
        console.error('Error loading models:', err);
        setError(err.message || 'Failed to load models');
        // Fallback to default models if API fails
        setModels([
          { id: 'grok-4-fast', name: 'Grok-4 Fast', description: 'Fast response, good for quick queries' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - onModelChange and selectedModel are stable

  const selectedModelInfo = models.find((m) => m.id === selectedModel);

  return (
    <div className="flex items-center gap-2 relative group">
      <label className="text-sm text-gray-400 whitespace-nowrap">Model:</label>
      {isLoading ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-500">
          Loading...
        </div>
      ) : error ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-red-400" title={error}>
          Error
        </div>
      ) : (
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={disabled || models.length === 0}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed min-w-[150px]"
          title={selectedModelInfo?.description}
        >
          {models.length === 0 ? (
            <option value="">No models available</option>
          ) : (
            models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))
          )}
        </select>
      )}
    </div>
  );
}
