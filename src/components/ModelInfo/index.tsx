import React, { useState } from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

const modelInfo = {
  name: "OpenMeteo + AI Enhanced",
  description: "Hybrid forecasting system combining OpenMeteo data with AI enhancement",
  parameters: [
    {
      name: "Base Model",
      value: "OpenMeteo GFS 13km",
      description: "Global Forecast System with 13km resolution"
    },
    {
      name: "AI Model",
      value: "Custom Neural Network",
      description: "Trained on historical wind data with local terrain features"
    },
    {
      name: "Update Frequency",
      value: "Hourly",
      description: "Forecasts are updated every hour with latest data"
    },
    {
      name: "Forecast Range",
      value: "7 days",
      description: "Predictions available up to 7 days in advance"
    }
  ]
};

export const ModelInfo: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
        title="Model Information"
      >
        <Cog6ToothIcon className="w-5 h-5 text-white/80" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 rounded-xl bg-gray-900/95 backdrop-blur-sm border border-white/10 shadow-xl z-50">
          <div className="p-4">
            <h3 className="text-lg font-medium text-white/90">{modelInfo.name}</h3>
            <p className="mt-1 text-sm text-white/70">{modelInfo.description}</p>
            
            <div className="mt-4 space-y-3">
              {modelInfo.parameters.map((param) => (
                <div key={param.name} className="bg-white/5 rounded-lg p-3">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-white/90">{param.name}</h4>
                      <p className="text-xs text-white/70 mt-0.5">{param.description}</p>
                    </div>
                    <span className="text-xs bg-indigo-500/20 px-2 py-1 rounded text-indigo-200 whitespace-nowrap">
                      {param.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
