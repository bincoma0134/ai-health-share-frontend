"use client";

import { MapContainer, TileLayer, Marker, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

// Marker cho đối tác (Emerald)
const partnerIcon = L.divIcon({
  className: "custom-pin",
  html: `<div style="background-color: #80BF84; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; box-shadow: 0 8px 20px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

// Marker cho người dùng (Blue Glow)
const userIcon = L.divIcon({
  className: "user-pin",
  html: `<div class="relative w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.8)] flex items-center justify-center">
            <div class="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-40"></div>
            <div class="w-2 h-2 bg-white rounded-full relative z-10"></div>
         </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Component điều khiển nội bộ
function MapUpdater({ center, zoom, mapType }: { center: [number, number], zoom: number, mapType: string }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 0.8 });
  }, [center, zoom, map]);

  return (
    <TileLayer
      url={mapType === "satellite" 
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
      attribution='&copy; AI Health Share'
    />
  );
}

export default function MapClient({ partners, onMarkerClick, mapState, userLocation }: any) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  return (
    <MapContainer center={mapState.center} zoom={mapState.zoom} zoomControl={false} className="w-full h-full z-0">
      <MapUpdater center={mapState.center} zoom={mapState.zoom} mapType={mapState.mapType} />
      
      {/* Vị trí người dùng */}
      {userLocation && <Marker position={userLocation} icon={userIcon} />}

      {/* Danh sách Đối tác */}
      {partners.map((p: any) => (
        <Marker 
          key={p.id} 
          position={[p.latitude || 21.0285, p.longitude || 105.8048]} 
          icon={partnerIcon}
          eventHandlers={{ click: () => onMarkerClick(p) }}
        />
      ))}
    </MapContainer>
  );
}