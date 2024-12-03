import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLocation?: { lat: number; lng: number };
}

export function Map({ onLocationSelect, initialLocation = { lat: 37.7749, lng: -122.4194 } }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current).setView([initialLocation.lat, initialLocation.lng], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add marker
    const marker = L.marker([initialLocation.lat, initialLocation.lng], {
      draggable: true
    }).addTo(map);

    // Handle map clicks
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      onLocationSelect(lat, lng);
    });

    // Handle marker drags
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onLocationSelect(pos.lat, pos.lng);
    });

    // Force map to update its size
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Cleanup
    return () => {
      map.remove();
    };
  }, [initialLocation, onLocationSelect]);

  return (
    <div className="map-wrapper">
      <div ref={mapContainerRef} className="map-container leaflet-container" />
    </div>
  );
} 