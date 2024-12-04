import React from 'react';
import type { PerformancePreset } from './types';

interface PerformanceControlsProps {
  performancePreset: PerformancePreset;
  useLightModel: boolean;
  onPresetChange: (preset: PerformancePreset) => void;
  onModelTypeChange: (useLightModel: boolean) => void;
}

export function PerformanceControls({
  performancePreset,
  useLightModel,
  onPresetChange,
  onModelTypeChange,
}: PerformanceControlsProps) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-8 p-6">
      <div className="flex-1 min-w-[280px]">
        <label className="text-sm uppercase tracking-wider text-gray-300 font-medium mb-3 block">
          Performance Mode
        </label>
        <div className="flex gap-3">
          {(['fast', 'balanced', 'accurate'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => onPresetChange(preset)}
              className={`
                relative px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200
                ${performancePreset === preset
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 scale-105 hover:bg-indigo-400'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}
                before:absolute before:inset-0 before:rounded-lg before:border
                ${performancePreset === preset
                  ? 'before:border-indigo-400/50'
                  : 'before:border-gray-700/50'}
              `}
            >
              {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <input
            type="checkbox"
            id="lightModel"
            checked={useLightModel}
            onChange={(e) => onModelTypeChange(e.target.checked)}
            className="peer sr-only"
          />
          <label
            htmlFor="lightModel"
            className={`
              flex items-center gap-3 px-5 py-3 rounded-lg cursor-pointer
              transition-all duration-200
              ${useLightModel
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700/80'}
              before:absolute before:inset-0 before:rounded-lg before:border
              ${useLightModel
                ? 'before:border-indigo-400/30'
                : 'before:border-gray-700/50'}
            `}
          >
            <svg 
              className={`w-4 h-4 transition-colors ${useLightModel ? 'text-indigo-300' : 'text-gray-500'}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="text-sm font-medium">Light Model</span>
          </label>
        </div>
        <span className="text-xs text-gray-500">
          Optimized for speed
        </span>
      </div>
    </div>
  );
}
