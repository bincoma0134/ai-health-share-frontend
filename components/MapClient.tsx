"use client";

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Hàm tạo Marker động với hiệu ứng Glassmorphism & Glow
const createCustomMarker = (partner: any) => {
    // Nếu có avatar thì hiển thị, nếu không dùng icon mặc định
    const avatarUrl = partner.avatar_url || 'https://ui-avatars.com/api/?name=Partner&background=80BF84&color=fff';
    const htmlString = `
        <div class="relative flex items-center justify-center w-12 h-12">
            <!-- Vòng tròn tỏa sáng (Glow Pulse) -->
            <div class="absolute inset-0 bg-[#80BF84] rounded-full animate-ping opacity-40"></div>
            
            <!-- Khối Glassmorphism Avatar -->
            <div class="relative w-10 h-10 bg-white/80 backdrop-blur-md rounded-full border-[3px] border-[#80BF84] shadow-[0_0_20px_rgba(128,191,132,0.8)] flex items-center justify-center overflow-hidden transition-transform hover:scale-110">
                <img src="${avatarUrl}" class="w-full h-full object-cover" />
            </div>
            
            <!-- Mũi ghim nhọn chĩa xuống mặt đất -->
            <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#80BF84]"></div>
        </div>
    `;

    return L.divIcon({
        className: 'bg-transparent border-none', // Chặn style viền trắng mặc định của Leaflet
        html: htmlString,
        iconSize: [48, 48],
        iconAnchor: [24, 48], // Cắm đúng tâm mũi nhọn xuống tọa độ
    });
};

const userMarkerIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1004/1004093.png', // Icon vị trí của bạn (Blue dot)
    iconSize: [28, 28],
    iconAnchor: [14, 14],
});

// Component hỗ trợ camera tự động bao quát toàn bộ Marker
function MapBoundsUpdater({ partners, center, zoom }: { partners: any[], center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        if (partners && partners.length > 0) {
            // Nếu có nhiều Marker, tạo khung (Bounds) bao trọn tất cả
            const bounds = L.latLngBounds(partners.map(p => [p.latitude, p.longitude]));
            // Bay camera ra để nhìn thấy hết, maxZoom 16 để tránh zoom sát mặt đất quá
            map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 16, duration: 1.5 });
        } else {
            // Nếu không có Marker nào (hoặc rỗng), bay về điểm Center mặc định
            map.flyTo(center, zoom, { duration: 1.5 });
        }
    }, [partners, center, zoom, map]);
    return null;
}

export default function MapClient({ partners, mapState, userLocation, onMarkerClick }: any) {
    // Sử dụng CartoDB BaseMap cho giao diện sạch sẽ, hiện đại
    const tileUrl = mapState.mapType === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    return (
        <MapContainer 
            center={mapState.center} 
            zoom={mapState.zoom} 
            zoomControl={false} 
            className="w-full h-full"
            attributionControl={false}
        >
            <TileLayer url={tileUrl} />
            <MapBoundsUpdater partners={partners} center={mapState.center} zoom={mapState.zoom} />
            
            {/* Vị trí của người dùng hiện tại */}
            {userLocation && (
                <Marker position={userLocation} icon={userMarkerIcon} zIndexOffset={1000} />
            )}

            {/* Vị trí của các cơ sở */}
            {partners.map((p: any) => (
                <Marker 
                    key={p.id} 
                    position={[p.latitude, p.longitude]} 
                    icon={createCustomMarker(p)}
                    eventHandlers={{ 
                        click: () => {
                            onMarkerClick(p);
                        } 
                    }}
                />
            ))}
        </MapContainer>
    );
}