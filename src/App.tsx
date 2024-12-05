import React from 'react';
import { WeatherPredictor } from './components/WeatherPredictor';
import { Analytics } from '@vercel/analytics/react';
import 'leaflet/dist/leaflet.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main>
        <WeatherPredictor />
      </main>
      <Analytics />
    </div>
  );
}

export default App;
