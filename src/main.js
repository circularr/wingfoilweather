/**
 * Wing Weather - A minimalist wing foiling weather app
 * Uses OpenMeteo API for weather data and Leaflet for maps
 */

import L from 'leaflet';

// ============= Configuration =============
const CONFIG = {
  defaultLocation: { lat: 25, lng: -40, zoom: 3 },
  windRatings: {
    excellent: { min: 15, max: 25, text: 'Perfect conditions!' },
    good: { min: 12, max: 30, text: 'Good conditions' },
    fair: { min: 10, max: 35, text: 'Challenging conditions' },
    poor: { min: 0, max: 100, text: 'Not recommended' }
  },
  hours: { start: 6, end: 22 }, // 6am to 10pm
  apiEndpoints: {
    weather: 'https://api.open-meteo.com/v1/forecast',
    marine: 'https://marine-api.open-meteo.com/v1/marine'
  }
};

// ============= DOM Elements =============
const elements = {
  searchInput: document.getElementById('searchInput'),
  currentWeather: document.querySelector('#currentWeather .weather-data'),
  hourlyForecast: document.querySelector('#hourlyForecast .hourly-forecast'),
  marineWeather: document.querySelector('#marineWeather .weather-data')
};

// ============= Map Initialization =============
const map = L.map('mapContainer').setView(
  [CONFIG.defaultLocation.lat, CONFIG.defaultLocation.lng], 
  CONFIG.defaultLocation.zoom
);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: ' OpenStreetMap contributors'
}).addTo(map);

let currentMarker = null;

// ============= API Functions =============
/**
 * Fetches data from OpenMeteo API
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} API response
 */
async function fetchFromAPI(endpoint, params) {
  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

/**
 * Fetches all weather data for a location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
async function getWeatherData(lat, lng) {
  try {
    const [currentWeather, hourlyWeather, marineWeather] = await Promise.all([
      fetchFromAPI(CONFIG.apiEndpoints.weather, {
        latitude: lat,
        longitude: lng,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,precipitation',
        timezone: 'auto'
      }),
      fetchFromAPI(CONFIG.apiEndpoints.weather, {
        latitude: lat,
        longitude: lng,
        hourly: 'temperature_2m,wind_speed_10m,wind_direction_10m',
        timezone: 'auto'
      }),
      fetchFromAPI(CONFIG.apiEndpoints.marine, {
        latitude: lat,
        longitude: lng,
        hourly: 'wave_height,wave_direction,wave_period',
        length_unit: 'metric',
        timezone: 'auto'
      })
    ]);

    displayCurrentWeather(currentWeather);
    displayHourlyForecast(hourlyWeather);
    displayMarineWeather(marineWeather);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    handleError();
  }
}

// ============= Display Functions =============
/**
 * Displays current weather conditions
 * @param {Object} data - Current weather data
 */
function displayCurrentWeather(data) {
  const current = data.current;
  const windRating = getWingFoilingRating(current.wind_speed_10m);
  
  elements.currentWeather.innerHTML = `
    <div class="weather-row">
      <span>Wind</span>
      <span><strong>${Math.round(current.wind_speed_10m)} km/h</strong> ${getWindDirection(current.wind_direction_10m)}</span>
    </div>
    <div class="weather-row">
      <span>Temperature</span>
      <span>${Math.round(current.temperature_2m)}° / Feels ${Math.round(current.apparent_temperature)}°</span>
    </div>
    <div class="weather-row">
      <span>Conditions</span>
      <span class="rating ${windRating.rating}">${windRating.text}</span>
    </div>
  `;
}

/**
 * Displays hourly forecast with wing foiling ratings
 * @param {Object} data - Hourly forecast data
 */
function displayHourlyForecast(data) {
  const forecastHtml = Array.from({ length: CONFIG.hours.end - CONFIG.hours.start + 1 }, (_, i) => {
    const hour = CONFIG.hours.start + i;
    if (hour >= data.hourly.wind_speed_10m.length) return '';

    const windSpeed = data.hourly.wind_speed_10m[hour];
    const temp = data.hourly.temperature_2m[hour];
    const windDir = data.hourly.wind_direction_10m[hour];
    const rating = getWingFoilingRating(windSpeed);

    return `
      <div class="hour-card">
        <div class="hour-time">${formatTime(hour)}</div>
        <div class="conditions">
          <strong>${Math.round(windSpeed)} km/h</strong> ${getWindDirection(windDir)}<br>
          ${Math.round(temp)}°
        </div>
        <div class="rating ${rating.rating}">${rating.rating}</div>
      </div>
    `;
  }).join('');

  elements.hourlyForecast.innerHTML = forecastHtml;
}

/**
 * Displays marine conditions
 * @param {Object} data - Marine weather data
 */
function displayMarineWeather(data) {
  const current = {
    wave_height: data.hourly.wave_height[0],
    wave_direction: data.hourly.wave_direction[0],
    wave_period: data.hourly.wave_period[0]
  };

  elements.marineWeather.innerHTML = `
    <div class="weather-row">
      <span>Wave Height</span>
      <span>${current.wave_height.toFixed(1)}m</span>
    </div>
    <div class="weather-row">
      <span>Wave Direction</span>
      <span>${getWindDirection(current.wave_direction)}</span>
    </div>
    <div class="weather-row">
      <span>Wave Period</span>
      <span>${current.wave_period.toFixed(1)}s</span>
    </div>
  `;
}

// ============= Utility Functions =============
/**
 * Determines wing foiling conditions rating based on wind speed
 * @param {number} windSpeed - Wind speed in km/h
 * @returns {Object} Rating and description
 */
function getWingFoilingRating(windSpeed) {
  const ratings = CONFIG.windRatings;
  
  if (windSpeed >= ratings.excellent.min && windSpeed <= ratings.excellent.max) {
    return { rating: 'excellent', text: ratings.excellent.text };
  }
  if (windSpeed >= ratings.good.min && windSpeed <= ratings.good.max) {
    return { rating: 'good', text: ratings.good.text };
  }
  if (windSpeed >= ratings.fair.min && windSpeed <= ratings.fair.max) {
    return { rating: 'fair', text: ratings.fair.text };
  }
  return { rating: 'poor', text: ratings.poor.text };
}

/**
 * Converts degrees to cardinal directions
 * @param {number} degrees - Direction in degrees
 * @returns {string} Cardinal direction
 */
function getWindDirection(degrees) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                     'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Formats hour to 12-hour time
 * @param {number} hour - Hour in 24-hour format
 * @returns {string} Formatted time
 */
function formatTime(hour) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: true
  }).format(new Date().setHours(hour));
}

/**
 * Handles errors in data fetching
 */
function handleError() {
  elements.currentWeather.innerHTML = '<div class="weather-row">Error fetching weather data</div>';
  elements.hourlyForecast.innerHTML = '';
  elements.marineWeather.innerHTML = '';
}

/**
 * Updates location and fetches new weather data
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
function updateLocation(lat, lng) {
  if (currentMarker) {
    map.removeLayer(currentMarker);
  }
  
  currentMarker = L.marker([lat, lng]).addTo(map);
  map.setView([lat, lng], 10);
  getWeatherData(lat, lng);
}

// ============= Event Listeners =============
// Map click handler
map.on('click', (e) => {
  const { lat, lng } = e.latlng;
  updateLocation(lat, lng);
});

// Search handler
elements.searchInput.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    const query = e.target.value.trim();
    if (!query) return;

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.length > 0) {
        const { lat, lon: lng } = data[0];
        updateLocation(parseFloat(lat), parseFloat(lng));
      }
    } catch (error) {
      console.error('Error searching location:', error);
    }
  }
});

// Initial weather data for Atlantic Ocean
updateLocation(CONFIG.defaultLocation.lat, CONFIG.defaultLocation.lng);
