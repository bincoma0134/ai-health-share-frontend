"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

// Tùy chỉnh Icon Marker cho chuẩn UI của AI Health (Màu xanh Emerald)
const customIcon = L.divIcon({
  className: "custom-pin",
  html: `<div style="background-color: #80BF84; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 8px 15px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface MapClientProps {
  partners: any[];
  onMarkerClick: (partner: any) => void;
}

export default function MapClient({ partners, onMarkerClick }: MapClientProps) {
  // Fix lỗi icon mặc định của Leaflet trong Next.js
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  return (
    <MapContainer 
      center={[21.028511, 105.804817]} // Tọa độ mặc định (Hà Nội)
      zoom={13} 
      zoomControl={false}
      className="w-full h-full z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {partners.map((partner) => {
        // Fallback tọa độ nếu DB chưa có (random quanh HN để test UI)
        const lat = partner.latitude || (21.028511 + (Math.random() - 0.5) * 0.05);
        const lng = partner.longitude || (105.804817 + (Math.random() - 0.5) * 0.05);
        
        return (
          <Marker 
            key={partner.id} 
            position={[lat, lng]} 
            icon={customIcon}
            eventHandlers={{ click: () => onMarkerClick(partner) }}
          />
        );
      })}
    </MapContainer>
  );
}