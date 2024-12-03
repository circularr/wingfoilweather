import React from 'react';
import { WeatherPredictor } from './components/WeatherPredictor';
import 'leaflet/dist/leaflet.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto py-4 px-4">
          <h1 className="text-3xl font-bold text-gray-900">4×4 Weather Predictor</h1>
          <p className="text-gray-600">Select a location to get wind predictions</p>
        </div>
      </header>
      <main className="py-8">
        <WeatherPredictor />
      </main>
    </div>
  );
}

export default App;
