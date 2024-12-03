import React from 'react';
import { WeatherPredictor } from './components/WeatherPredictor';
import './style.css';

function App() {
  return (
    <div className="app">
      <header>
        <h1>4x4 Weather Predictor</h1>
        <p>AI-powered weather predictions using the last 16 hours of data</p>
      </header>
      
      <main>
        <WeatherPredictor />
      </main>
      
      <footer>
        <p>Powered by TensorFlow.js and OpenMeteo</p>
      </footer>
    </div>
  );
}

export default App; 