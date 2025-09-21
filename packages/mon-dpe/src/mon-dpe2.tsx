import React from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";

export type MonDpe2Props = {
  center?: [number, number];
  zoom?: number;
  height?: number | string;
};

export const MonDpe2: React.FC<MonDpe2Props> = ({
  center = [48.8566, 2.3522], // Paris
  zoom = 13,
  height = 360,
}) => {
  return (
    <div className="mon-dpe2-map" style={{ height }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/attributions">CartoDB</a>'
        />
        <InvalidateOnMount />
        <Marker position={center}>
          <Popup>Paris</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

function InvalidateOnMount() {
  const map = useMap();
  useEffect(() => {
    const invalidate = () => {
      try {
        map.invalidateSize();
      } catch {}
    };
    const t = setTimeout(invalidate, 0);
    window.addEventListener("resize", invalidate);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", invalidate);
    };
  }, [map]);
  return null;
}


