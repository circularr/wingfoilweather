import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  onLocationSelect: (lat: number, lon: number) => void;
  selectedLocation?: { lat: number; lon: number; } | null;
}

export const Map: React.FC<MapProps> = ({ onLocationSelect, selectedLocation }) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([51.505, -0.09], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);

      // Add click handler
      mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onLocationSelect(lat, lng);
      });
    }

    // Update marker if location changes
    if (selectedLocation) {
      if (markerRef.current) {
        markerRef.current.setLatLng([selectedLocation.lat, selectedLocation.lon]);
      } else {
        markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lon])
          .addTo(mapRef.current);
      }
      mapRef.current.setView([selectedLocation.lat, selectedLocation.lon]);
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [selectedLocation, onLocationSelect]);

  return (
    <div id="map" className="w-full h-[400px] rounded-lg shadow-lg mb-6" />
  );
};
