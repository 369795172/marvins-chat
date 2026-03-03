'use client';

import { Model, ModelInfo } from '@/lib/types';
import { TOOL_CAPABLE_MODELS, DEFAULT_TOOL_MODEL } from '@/lib/constants';
import { useEffect, useState } from 'react';

interface ModelSelectorProps {
  selectedModel: Model;
  onModelChange: (model: Model) => void;
  disabled?: boolean;
  /** When true, filter to only tool-capable models (for Agent mode) */
  agentMode?: boolean;
}

export default function ModelSelector({
  selectedModel,
  onModelChange,
  disabled = false,
  agentMode = false,
}: ModelSelectorProps) {
  const [allModels, setAllModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toolSet = new Set(TOOL_CAPABLE_MODELS);
  const models = agentMode
    ? allModels.filter((m) => toolSet.has(m.id as (typeof TOOL_CAPABLE_MODELS)[number]))
    : allModels;
  const displayModels =
    models.length > 0
      ? models
      : agentMode
        ? TOOL_CAPABLE_MODELS.map((id) => ({ id, name: id, description: 'Tool-capable model' }))
        : [];

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch('/api/models');
        if (!response.ok) throw new Error('Failed to fetch models');
        const data = await response.json();
        const fetched = data.models || [];
        setAllModels(fetched);
        if (fetched.length > 0 && !fetched.some((m: ModelInfo) => m.id === selectedModel)) {
          onModelChange(fetched[0].id);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load models';
        setError(msg);
        setAllModels([{ id: 'grok-4-fast', name: 'Grok-4 Fast', description: 'Fast response' }]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    if (agentMode && !TOOL_CAPABLE_MODELS.includes(selectedModel as (typeof TOOL_CAPABLE_MODELS)[number])) {
      onModelChange(DEFAULT_TOOL_MODEL);
    }
  }, [agentMode, selectedModel, onModelChange]);

  const selectedModelInfo = displayModels.find((m) => m.id === selectedModel) ?? allModels.find((m) => m.id === selectedModel);

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
          disabled={disabled || displayModels.length === 0}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed min-w-[150px]"
          title={selectedModelInfo?.description}
        >
          {displayModels.length === 0 ? (
            <option value="">No models available</option>
          ) : (
            displayModels.map((model) => (
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
