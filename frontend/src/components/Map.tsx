import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix icons (must run on every load)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 300);
  }, [map]);
  return null;
}

function simplify(coords: [number, number][]): [number, number][] {
  if (coords.length < 500) return coords;
  const step = Math.max(1, Math.floor(coords.length / 250));
  const result: [number, number][] = [];
  for (let i = 0; i < coords.length; i += step) result.push(coords[i]);
  result.push(coords[coords.length - 1]);
  return result;
}

export default function Map({ route }: { route: any }) {
  if (!route?.geometry?.coordinates) {
    return <div className="h-96 bg-gray-300 flex items-center justify-center text-2xl">No route</div>;
  }

  const coords = simplify(
    route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number])
  );

  const bounds = L.latLngBounds(coords);

  return (
    <div className="h-96 w-full rounded-xl overflow-hidden shadow-2xl border-4 border-indigo-300">
      <MapContainer bounds={bounds} zoom={5} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={coords} color="#4f46e5" weight={8} opacity={0.9} />
        <Marker position={coords[0]}><Popup>Start</Popup></Marker>
        <Marker position={coords[coords.length - 1]}><Popup>Drop-off</Popup></Marker>
        <MapResizer />
      </MapContainer>
    </div>
  );
}