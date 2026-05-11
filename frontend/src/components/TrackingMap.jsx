import React, { useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';

const toLatLng = (point) => point?.coordinates ? [point.coordinates[1], point.coordinates[0]] : null;

const distanceKm = (a, b) => {
  if (!a || !b) return 0;
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLng = (b[1] - a[1]) * rad;
  const lat1 = a[0] * rad;
  const lat2 = b[0] * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const TrackingMap = ({ claim }) => {
  const restaurant = toLatLng(claim?.listingId?.location);
  const ngoHome = toLatLng(claim?.ngoId?.location);
  const current = toLatLng(claim?.currentLocation) || ngoHome;
  const center = current || restaurant || [12.9716, 77.5946];

  const eta = useMemo(() => {
    const km = distanceKm(current, restaurant);
    return km ? Math.max(3, Math.round((km / 22) * 60)) : null;
  }, [current, restaurant]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="h-72">
        <MapContainer center={center} zoom={13} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {restaurant && (
            <Marker position={restaurant}>
              <Popup>{claim?.listingId?.donor?.name || 'Restaurant'}</Popup>
            </Marker>
          )}
          {current && (
            <Marker position={current}>
              <Popup>Pickup team location</Popup>
            </Marker>
          )}
          {current && restaurant && <Polyline positions={[current, restaurant]} pathOptions={{ color: '#f97316', weight: 4 }} />}
        </MapContainer>
      </div>
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-3 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">Status: {claim?.deliveryStatus?.replace('_', ' ') || 'not started'}</span>
        <span className="text-slate-500 dark:text-slate-400">{eta ? `ETA ${eta} min` : 'ETA unavailable'}</span>
      </div>
    </div>
  );
};

export default TrackingMap;
