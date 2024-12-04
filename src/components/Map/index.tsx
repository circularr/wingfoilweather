import React, { useEffect, useRef, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-control-geocoder';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';

interface MapProps {
  onLocationSelect: (lat: number, lon: number) => void;
  selectedLocation?: { lat: number; lon: number; } | null;
}

export const Map: React.FC<MapProps> = memo(({ onLocationSelect, selectedLocation }) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [50.4155, -5.0737],
      zoom: 11,
      minZoom: 8,
      maxZoom: 19,
      zoomAnimation: false,
      bounceAtZoomLimits: false,
      zoomControl: false
    });
    
    mapRef.current = map;

    // Use Thunderforest Outdoors style (less road/town detail)
    L.tileLayer('https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      className: 'map-tiles'
    }).addTo(map);

    // Add zoom control to top-right
    L.control.zoom({
      position: 'topright'
    }).addTo(map);

    // Add search control (Nominatim - free OpenStreetMap search)
    const geocoder = (L.Control as any).geocoder({
      defaultMarkGeocode: false,
      position: 'topleft',
      placeholder: 'Search location...',
      geocoder: new (L.Control as any).Geocoder.Nominatim()
    }).addTo(map);

    geocoder.on('markgeocode', function(e: any) {
      const { center } = e.geocode;
      onLocationSelect(center.lat, center.lng);
    });

    // Set bounds to Devon and Cornwall region
    const southWest = L.latLng(49.8, -6.5);
    const northEast = L.latLng(51.2, -3.0);
    const bounds = L.latLngBounds(southWest, northEast);
    
    map.setMaxBounds(bounds);
    map.fitBounds(bounds, {
      animate: false,
      duration: 0
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !selectedLocation) return;

    if (markerRef.current) {
      markerRef.current.remove();
    }

    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" stroke="url(#gradient)" stroke-width="2" class="animate-pulse">
            <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="20" cy="20" r="8" fill="#4F46E5" class="animate-ping">
            <animate attributeName="fill-opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="20" cy="20" r="3" fill="white" />
          <defs>
            <linearGradient id="gradient" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#6366F1" />
              <stop offset="100%" stop-color="#4F46E5" />
            </linearGradient>
          </defs>
        </svg>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lon], {
      icon: customIcon,
      title: 'Selected Location'
    }).addTo(mapRef.current);

    mapRef.current.setView([selectedLocation.lat, selectedLocation.lon], mapRef.current.getZoom(), {
      animate: true,
      duration: 0.5
    });
  }, [selectedLocation]);

  return (
    <div className="relative">
      <style jsx global>{`
        .map-tiles {
          filter: brightness(0.85) contrast(1.1);
        }
        .leaflet-container {
          background: #1a1b1e;
        }
        .leaflet-control-zoom a,
        .leaflet-control-geocoder-form input {
          background-color: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: white !important;
        }
        .leaflet-control-zoom a:hover,
        .leaflet-control-geocoder-form input:focus {
          background-color: rgba(255, 255, 255, 0.2) !important;
        }
        .leaflet-control-geocoder {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-control-geocoder-form input {
          width: 200px;
          padding: 5px 10px;
          border-radius: 4px;
          outline: none;
        }
        .leaflet-control-geocoder-alternatives {
          background: #1a1b1e !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 4px;
          margin-top: 5px;
        }
        .leaflet-control-geocoder-alternatives a {
          color: white !important;
          padding: 5px 10px;
        }
        .leaflet-control-geocoder-alternatives a:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
        .custom-marker {
          filter: drop-shadow(0 0 10px rgba(79, 70, 229, 0.3));
        }
        .custom-marker svg {
          overflow: visible;
        }
      `}</style>
      
      <div 
        ref={containerRef} 
        className="w-full h-[600px] bg-gray-900 rounded-xl overflow-hidden shadow-lg"
      />
    </div>
  );
});
