"use client";

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

// Marker Đối tác - Hiệu ứng Glow Emerald
const partnerIcon = L.divIcon({
  className: "custom-pin",
  html: `<div class="relative w-10 h-10 flex items-center justify-center">
            <div class="absolute inset-0 bg-[#80BF84] rounded-full blur-md opacity-40 animate-pulse"></div>
            <div class="relative w-8 h-8 bg-[#80BF84] rounded-full border-[3px] border-white shadow-2xl flex items-center justify-center">
              <div class="w-2 h-2 bg-white rounded-full"></div>
            </div>
         </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

// Marker Người dùng - Hiệu ứng Radar Blue
const userIcon = L.divIcon({
  className: "user-pin",
  html: `<div class="relative w-8 h-8 flex items-center justify-center">
            <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
            <div class="relative w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-[0_0_15px_rgba(37,99,235,0.6)]"></div>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function MapUpdater({ center, zoom, mapType }: any) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1 });
  }, [center, zoom, map]);

  return (
    <TileLayer
      url={mapType === "satellite" 
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
      attribution='&copy; AI Health Share'
    />
  );
}

export default function MapClient({ partners, onMarkerClick, mapState, userLocation }: any) {
  return (
    <MapContainer center={mapState.center} zoom={mapState.zoom} zoomControl={false} className="w-full h-full z-0">
      <MapUpdater center={mapState.center} zoom={mapState.zoom} mapType={mapState.mapType} />
      {userLocation && <Marker position={userLocation} icon={userIcon} />}
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