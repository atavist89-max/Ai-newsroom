import { useMemo } from 'react';
import { MapContainer, TileLayer, Rectangle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Country, Continent } from '../types';
import { countryBounds } from '../data/countryBounds';

interface ChangeViewProps {
  center: [number, number];
  zoom: number;
  bounds?: [[number, number], [number, number]] | null;
}

function ChangeView({ center, zoom, bounds }: ChangeViewProps) {
  const map = useMap();
  if (bounds) {
    map.fitBounds(bounds, { padding: [2, 2], animate: false, maxZoom: 6 });
  } else {
    map.setView(center, zoom);
  }
  return null;
}

interface CountryMapProps {
  selectedCountry: Country | null;
  selectedContinent: Continent | null;
}

export function CountryMap({ selectedCountry, selectedContinent }: CountryMapProps) {
  const continentBounds = useMemo(() => {
    if (!selectedContinent) return null;
    return [
      [selectedContinent.bounds[0][0], selectedContinent.bounds[0][1]],
      [selectedContinent.bounds[1][0], selectedContinent.bounds[1][1]],
    ] as [[number, number], [number, number]];
  }, [selectedContinent]);

  const countryBoundsCoords = useMemo(() => {
    if (!selectedCountry) return null;
    const bounds = countryBounds[selectedCountry.code as keyof typeof countryBounds];
    if (!bounds) return null;
    return bounds as [[number, number], [number, number]];
  }, [selectedCountry]);

  const center = useMemo((): [number, number] => {
    if (selectedContinent) {
      return [
        (selectedContinent.bounds[0][0] + selectedContinent.bounds[1][0]) / 2,
        (selectedContinent.bounds[0][1] + selectedContinent.bounds[1][1]) / 2,
      ];
    }
    return [20, 0];
  }, [selectedContinent]);

  const zoom = selectedCountry ? selectedCountry.zoom : selectedContinent ? 4 : 2;

  return (
    <div className="relative h-64 rounded-lg overflow-hidden border border-slate-700">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom={false}
        dragging={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        style={{ height: '100%', width: '100%' }}
        className="bg-slate-900"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {selectedContinent && continentBounds && (
          <Rectangle
            bounds={continentBounds}
            pathOptions={{
              fillColor: '#eab308',
              fillOpacity: 0.15,
              color: '#eab308',
              weight: 1,
              dashArray: '5, 5',
            }}
          />
        )}
        {selectedCountry && countryBoundsCoords && (
          <Rectangle
            bounds={countryBoundsCoords}
            pathOptions={{
              fillColor: '#22c55e',
              fillOpacity: 0.5,
              color: '#16a34a',
              weight: 2,
            }}
          />
        )}
        <ChangeView
          center={center}
          zoom={zoom}
          bounds={selectedContinent ? continentBounds : undefined}
        />
      </MapContainer>

      {selectedCountry && selectedContinent && (
        <div className="absolute bottom-2 left-2 bg-slate-900/90 backdrop-blur px-3 py-2 rounded-lg border border-slate-700 text-xs z-[400]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-green-500 rounded-sm" />
            <span className="text-slate-300">{selectedCountry.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-sm" />
            <span className="text-slate-400">{selectedContinent.name}</span>
          </div>
        </div>
      )}
    </div>
  );
}
