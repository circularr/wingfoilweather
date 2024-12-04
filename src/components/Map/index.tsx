import React, { useEffect, useRef, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  onLocationSelect: (lat: number, lon: number) => void;
  selectedLocation?: { lat: number; lon: number; } | null;
}

export const Map: React.FC<MapProps> = memo(({ onLocationSelect, selectedLocation }) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize map only once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [50.4155, -5.0737], // Newquay coordinates
      zoom: 11,
      minZoom: 8,
      maxZoom: 19,
      zoomAnimation: false,
      bounceAtZoomLimits: false
    });
    
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: ' OpenStreetMap contributors'
    }).addTo(map);

    // Set bounds to Devon and Cornwall region
    const southWest = L.latLng(49.8, -6.5);  // Cover Scilly Isles
    const northEast = L.latLng(51.2, -3.0);  // Cover North Devon
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

  // Handle marker updates separately
  useEffect(() => {
    if (!mapRef.current || !selectedLocation) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Create custom icon with inline SVG
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Outer ring with gradient and glow -->
          <circle cx="20" cy="20" r="18" stroke="url(#gradient)" stroke-width="2" class="animate-pulse">
            <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
          
          <!-- Inner circle with radar effect -->
          <circle cx="20" cy="20" r="8" fill="#4F46E5" class="animate-ping">
            <animate attributeName="fill-opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
          </circle>
          
          <!-- Center dot -->
          <circle cx="20" cy="20" r="3" fill="white" />
          
          <!-- Radar scan line -->
          <line x1="20" y1="20" x2="35" y2="20" stroke="rgba(79, 70, 229, 0.5)" stroke-width="1.5">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 20 20"
              to="360 20 20"
              dur="3s"
              repeatCount="indefinite"
            />
          </line>
          
          <!-- Gradient definition -->
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

    // Create and add new marker
    markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lon], {
      icon: customIcon,
      title: 'Selected Location'
    }).addTo(mapRef.current);

    // Center map on marker with smooth animation
    mapRef.current.setView([selectedLocation.lat, selectedLocation.lon], mapRef.current.getZoom(), {
      animate: true,
      duration: 0.5
    });
  }, [selectedLocation]);

  return (
    <>
      <style>
        {`
          .custom-marker {
            filter: drop-shadow(0 0 10px rgba(79, 70, 229, 0.3));
          }
          .custom-marker svg {
            overflow: visible;
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          @keyframes ping {
            0% { opacity: 0.8; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(0.95); }
            100% { opacity: 0.8; transform: scale(1); }
          }
        `}
      </style>
      <div 
        ref={containerRef} 
        className="w-full h-[600px] bg-gray-900 rounded-xl overflow-hidden"
        style={{ contain: 'paint' }}
      />
    </>
  );
});
