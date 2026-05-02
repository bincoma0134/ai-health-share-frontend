"use client";

import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const customMarkerIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
});

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, map.getZoom(), { duration: 1 });
    }, [center, map]);
    return null;
}

export default function MiniMapPicker({ position, onChange }: { position: [number, number], onChange: (lat: number, lng: number) => void }) {
    const markerRef = useRef<L.Marker>(null);

    const eventHandlers = useMemo(() => ({
        dragend() {
            const marker = markerRef.current;
            if (marker != null) {
                const { lat, lng } = marker.getLatLng();
                onChange(lat, lng);
            }
        },
    }), [onChange]);

    return (
        <MapContainer center={position} zoom={15} zoomControl={false} className="w-full h-full" attributionControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            <MapUpdater center={position} />
            <Marker 
                draggable={true}
                eventHandlers={eventHandlers}
                position={position}
                ref={markerRef}
                icon={customMarkerIcon}
            />
        </MapContainer>
    );
}