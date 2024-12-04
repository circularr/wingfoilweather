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
    if (!mapRef.current) return;

    if (selectedLocation) {
      const newLatLng = [selectedLocation.lat, selectedLocation.lon];
      
      if (markerRef.current) {
        markerRef.current.setLatLng(newLatLng);
      } else {
        markerRef.current = L.marker(newLatLng).addTo(mapRef.current);
      }

      mapRef.current.setView(newLatLng, mapRef.current.getZoom(), {
        animate: false,
        duration: 0
      });
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [selectedLocation]);

  return (
    <div 
      ref={containerRef} 
      id="map" 
      className="w-full h-[500px] rounded-lg overflow-hidden"
      style={{ contain: 'paint' }}
    />
  );
});
