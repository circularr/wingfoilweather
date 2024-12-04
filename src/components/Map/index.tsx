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

    // Use OpenStreetMap tiles (free, no API key needed)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      className: 'map-tiles'
    }).addTo(map);

    // Add zoom control to top-right
    L.control.zoom({
      position: 'topright'
    }).addTo(map);

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
          filter: brightness(0.8) contrast(1.1);
        }
        .leaflet-container {
          background: #1a1b1e;
        }
        .leaflet-control-zoom a {
          background-color: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: white !important;
        }
        .leaflet-control-zoom a:hover {
          background-color: rgba(255, 255, 255, 0.2) !important;
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
