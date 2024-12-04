import React, { useState } from 'react';
import type { PerformancePreset } from './types';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface PerformanceControlsProps {
  performancePreset: PerformancePreset;
  useLightModel: boolean;
  onPresetChange: (preset: PerformancePreset) => void;
  onModelTypeChange: (useLightModel: boolean) => void;
}

// Actual model configuration based on implementation
const modelArchitecture = {
  baseModel: {
    name: "OpenMeteo GFS",
    version: "Current",
    details: [
      { label: "Input Features", value: "Temperature, Wind Speed & Direction, Wave Height & Period" },
      { label: "Update Frequency", value: "Hourly" },
      { label: "Forecast Range", value: "24 hours" },
      { label: "Data Source", value: "OpenMeteo API" }
    ]
  },
  aiModel: {
    name: "Neural Network",
    version: "LSTM Architecture",
    details: [
      { 
        label: "Model Architecture", 
        value: (useLightModel: boolean) => useLightModel 
          ? "32 LSTM units → 64 Dense → Output" 
          : "64 LSTM units → 128 Dense → 64 Dense → Output" 
      },
      { label: "Input Features", value: "9 weather parameters" },
      { label: "Sequence Length", value: (useLightModel: boolean, performancePreset: PerformancePreset) => 
        performancePreset === 'fast' ? "8 hours" : 
        performancePreset === 'accurate' ? "24 hours" : 
        "16 hours"
      },
      { label: "Prediction Window", value: "24 hours ahead" }
    ]
  },
  performanceModes: {
    name: "Training Configuration",
    version: "Current",
    details: [
      { label: "Fast Mode", value: "20 epochs, batch size 64" },
      { label: "Balanced Mode", value: "50 epochs, batch size 32" },
      { label: "Accurate Mode", value: "100 epochs, batch size 16" }
    ]
  }
};

export function PerformanceControls({
  performancePreset,
  useLightModel,
  onPresetChange,
  onModelTypeChange,
}: PerformanceControlsProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  return (
    <div className="space-y-8">
      {/* Main Settings */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-white">Model Configuration</h3>
          <p className="text-sm text-gray-400 mt-1">
            Customize the AI model's behavior to balance between speed and accuracy
          </p>
        </div>

        <div className="grid gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300">
                Performance Mode
                <span className="block text-xs text-gray-400 mt-1">Balance between speed and accuracy</span>
              </label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(['fast', 'balanced', 'accurate'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => onPresetChange(preset)}
                  className={`
                    relative px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${performancePreset === preset
                      ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/50'
                      : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'}
                    flex flex-col items-center gap-2
                  `}
                >
                  <span className="capitalize">{preset}</span>
                  <span className="text-xs opacity-75">
                    {preset === 'fast' ? '20 epochs' : preset === 'balanced' ? '50 epochs' : '100 epochs'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300">
                Model Architecture
                <span className="block text-xs text-gray-400 mt-1">Choose between speed and complexity</span>
              </label>
            </div>
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
                  flex items-center justify-between w-full px-5 py-4 rounded-xl cursor-pointer
                  transition-all duration-200 ring-1
                  ${useLightModel
                    ? 'bg-indigo-500/20 text-indigo-300 ring-indigo-500/50'
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white ring-gray-700/50'}
                `}
              >
                <div className="flex items-center gap-3">
                  <svg 
                    className={`w-5 h-5 ${useLightModel ? 'text-indigo-300' : 'text-gray-400'}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <div>
                    <span className="text-sm font-medium">Light Model</span>
                    <span className="block text-xs opacity-75 mt-0.5">
                      {useLightModel ? '32 LSTM units' : '64 LSTM units'}
                    </span>
                  </div>
                </div>
                <div className="w-11 h-6 bg-gray-700/50 rounded-full relative">
                  <div className={`
                    absolute left-1 top-1 w-4 h-4 rounded-full transition-all duration-200
                    ${useLightModel ? 'bg-indigo-300 translate-x-5' : 'bg-gray-400 translate-x-0'}
                  `}/>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400 mt-6 bg-gray-800/30 rounded-lg p-3">
          <InformationCircleIcon className="w-4 h-4 flex-shrink-0" />
          <span>Current configuration: {useLightModel ? 'Light' : 'Full'} model ({useLightModel ? '32' : '64'} LSTM units) with {
            performancePreset === 'fast' ? '20' : 
            performancePreset === 'balanced' ? '50' : 
            '100'
          } training epochs</span>
        </div>

        {/* Technical Details Toggle */}
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className={`
            w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
            ${showTechnicalDetails
              ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/50'
              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'}
            flex items-center justify-center gap-2
          `}
        >
          <span>{showTechnicalDetails ? 'Hide Technical Details' : 'Show Technical Details'}</span>
        </button>
      </div>

      {/* Technical Details Panel */}
      {showTechnicalDetails && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid gap-4">
            {Object.entries(modelArchitecture).map(([key, section]) => (
              <div key={key} className="bg-gray-800/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h5 className="text-sm font-medium text-white">{section.name}</h5>
                  <span className="text-xs text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md">
                    {section.version}
                  </span>
                </div>
                <div className="grid gap-2">
                  {section.details.map((detail, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-400">{detail.label}</span>
                      <span className="text-white/90">
                        {typeof detail.value === 'function' ? detail.value(useLightModel, performancePreset) : detail.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
