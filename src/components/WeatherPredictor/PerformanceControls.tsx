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
  onModelTypeChange
}: PerformanceControlsProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <button
          onClick={() => onPresetChange('fast')}
          className={`flex flex-col items-start p-4 rounded-xl border transition-all duration-200 ${
            performancePreset === 'fast'
              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-100'
              : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-800 hover:border-gray-600'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <svg
              className="w-5 h-5"
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
            <span className="font-medium">Fast</span>
          </div>
          <p className="text-sm opacity-80">
            Quick results for initial exploration. Lower accuracy but faster training.
          </p>
        </button>

        <button
          onClick={() => onPresetChange('balanced')}
          className={`flex flex-col items-start p-4 rounded-xl border transition-all duration-200 ${
            performancePreset === 'balanced'
              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-100'
              : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-800 hover:border-gray-600'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
              />
            </svg>
            <span className="font-medium">Balanced</span>
          </div>
          <p className="text-sm opacity-80">
            Good balance between speed and accuracy. Recommended for most use cases.
          </p>
        </button>

        <button
          onClick={() => onPresetChange('accurate')}
          className={`flex flex-col items-start p-4 rounded-xl border transition-all duration-200 ${
            performancePreset === 'accurate'
              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-100'
              : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-800 hover:border-gray-600'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">Accurate</span>
          </div>
          <p className="text-sm opacity-80">
            Highest accuracy but slower training. Best for detailed analysis.
          </p>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={useLightModel}
            onChange={(e) => onModelTypeChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
        </label>
        <span className="text-sm text-gray-300">
          Use lightweight model (faster but less accurate)
        </span>
      </div>
    </div>
  );
}
