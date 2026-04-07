import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import React, { useEffect, useState, useRef } from 'react';
import useAuthStore from '../store/useAuthStore';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';
import { Clock, Navigation, CheckCircle2, AlertCircle, Package } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const SOCKET_URL = 'http://localhost:5000';
const API_URL = 'http://localhost:5000/api';

// Fix leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons
const createCustomIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const blueIcon = createCustomIcon('blue');
const redIcon = createCustomIcon('red');
const greyIcon = createCustomIcon('grey');

const LocationPicker = ({ center, setCenter }) => {
  useMapEvents({
    click(e) {
      setCenter([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

const NGODashboard = () => {
  const { user } = useAuthStore();
  const defaultCenter = user?.location?.coordinates ? 
    [user.location.coordinates[1], user.location.coordinates[0]] : 
    [40.7128, -74.0060]; // fallback

  const [center, setCenter] = useState(defaultCenter);
  const centerRef = useRef(center);

  // Update ref whenever center changes
  useEffect(() => {
    centerRef.current = center;
  }, [center]);

  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [claimQty, setClaimQty] = useState(1);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState(null);
  const [liveAlert, setLiveAlert] = useState(null);

  const fetchListings = async (searchLat, searchLng) => {
    try {
      const qs = searchLat && searchLng ? `?lat=${searchLat}&lng=${searchLng}` : '';
      const res = await axios.get(`${API_URL}/listings/nearby${qs}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setListings(res.data);
    } catch (err) {
      console.error('Error fetching listings', err);
    }
  };

  useEffect(() => {
    fetchListings(center[0], center[1]);
  }, [center]);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    
    // Join private room
    socket.emit('join', user._id);

    socket.on('NEW_SURPLUS', (data) => {
      // Use ref to get current center without triggering re-renders
      fetchListings(centerRef.current[0], centerRef.current[1]); 
      setLiveAlert(`🔔 New surplus posted by ${data.restaurantName} - ${(data.distanceMeters / 1000).toFixed(1)} km away!`);
      setTimeout(() => setLiveAlert(null), 8000);
    });

    return () => socket.disconnect();
  }, []);

  const handleClaim = async (e) => {
    e.preventDefault();
    setClaiming(true);
    try {
      const res = await axios.post(`${API_URL}/claims`, {
        listingId: selectedListing._id,
        requestedQty: Number(claimQty)
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      setClaimResult({ success: true, otp: res.data.otpCode });
      fetchListings(center[0], center[1]); // Refresh to get updated quantities
    } catch (err) {
      setClaimResult({ success: false, message: err.response?.data?.message || 'Claim failed' });
    }
    setClaiming(false);
  };

  const getMarkerIcon = (listing) => {
    const minLeft = (new Date(listing.expiryTime) - new Date()) / 60000;
    if (minLeft < 30) return redIcon; // High Urgency
    if (listing.remainingQuantity < listing.totalQuantity) return greyIcon; // Partially Claimed
    return blueIcon; // Fresh
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Live Alert Toast */}
      <AnimatePresence>
        {liveAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-orange-500 text-white px-6 py-3 rounded-full shadow-lg font-medium flex items-center gap-2"
          >
            <AlertCircle className="h-5 w-5" />
            {liveAlert}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Section */}
      <div className="w-full md:w-3/5 h-1/2 md:h-full relative z-0">
        <MapContainer center={center} zoom={13} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Pick Search Location */}
          <LocationPicker center={center} setCenter={setCenter} />
          <RecenterMap center={center} />

          {/* NGO Watch Radius */}
          <Circle
            center={center}
            radius={(user.watchRadius || 5) * 1000}
            pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
          />
          
          {/* NGO Search Center Location */}
          <Marker position={center}>
            <Popup>Searching around this point. Click map to move.</Popup>
          </Marker>

          {/* Listings */}
          {listings.map(l => (
            <Marker key={l._id} position={[l.location.coordinates[1], l.location.coordinates[0]]} icon={getMarkerIcon(l)}>
              <Popup>
                <div className="font-bold">{l.donor?.name || 'Restaurant'}</div>
                <div>{l.remainingQuantity} {l.foodType} meals</div>
                <button onClick={() => { setSelectedListing(l); setClaimResult(null); }} className="mt-2 text-xs bg-orange-500 text-white px-3 py-1 rounded">Claim Now</button>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Sidebar List */}
      <div className="w-full md:w-2/5 h-1/2 md:h-full bg-slate-50 border-l border-slate-200 overflow-y-auto p-4 md:p-6 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Nearby Surplus</h2>
          <span className="text-sm font-medium px-3 py-1 bg-orange-100 text-orange-700 rounded-full">{listings.length} Active</span>
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {listings.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-2xl border border-slate-100 border-dashed">
              <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No surplus food currently available within your {user.watchRadius}km radius.</p>
            </div>
          ) : (
            listings.map(listing => {
              const urgencyPulse = (new Date(listing.expiryTime) - new Date()) < 30 * 60000;
              return (
                <div key={listing._id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${listing.foodType === 'Veg' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {listing.foodType}
                    </span>
                    <div className="text-right">
                      <p className="text-sm text-slate-500 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" /> Expires
                      </p>
                      <p className={`text-sm font-medium ${urgencyPulse ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>
                        {formatDistanceToNow(new Date(listing.expiryTime), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  
                  <h3 className="mt-3 font-bold text-slate-800 text-xl">{listing.remainingQuantity} Meals / Portions</h3>
                  <p className="text-slate-500 text-sm mt-1">{listing.donor?.name || 'Restaurant'}</p>
                  
                  <div className="mt-4 flex items-center gap-2">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-orange-500 h-full rounded-full" style={{ width: `${(listing.remainingQuantity / listing.totalQuantity) * 100}%` }}></div>
                    </div>
                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{listing.remainingQuantity}/{listing.totalQuantity} Left</span>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button 
                      onClick={() => { setSelectedListing(listing); setClaimQty(1); setClaimResult(null); }}
                      className="flex-1 bg-slate-900 border border-slate-900 text-white py-2 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
                    >
                      Process Claim
                    </button>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${listing.location.coordinates[1]},${listing.location.coordinates[0]}`}
                      target="_blank" rel="noreferrer"
                      className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      title="Navigate"
                    >
                      <Navigation className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Claim Modal Overlay */}
      <AnimatePresence>
        {selectedListing && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedListing(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md relative z-10 shadow-2xl"
            >
              {!claimResult ? (
                <>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Claim Food</h3>
                  <p className="text-slate-500 text-sm mb-6">How many portions would you like to claim from {selectedListing.donor?.name}?</p>
                  
                  <form onSubmit={handleClaim}>
                    <div className="mb-6">
                      <div className="flex justify-between text-sm mb-2 font-medium">
                        <span className="text-slate-700">Quantity</span>
                        <span className="text-orange-500">{claimQty} selected</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max={selectedListing.remainingQuantity} 
                        value={claimQty}
                        onChange={(e) => setClaimQty(e.target.value)}
                        className="w-full accent-orange-500"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-2">
                        <span>1</span>
                        <span>Max {selectedListing.remainingQuantity}</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setSelectedListing(null)} className="flex-1 py-3 font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                      <button type="submit" disabled={claiming} className="flex-1 py-3 font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors shadow-sm disabled:opacity-50">
                        {claiming ? 'Confirming...' : 'Confirm Claim'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  {claimResult.success ? (
                    <>
                      <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-2">Claim Secured!</h3>
                      <p className="text-slate-500 mb-6">Present this OTP to the restaurant at pickup.</p>
                      
                      <div className="text-4xl font-mono font-bold tracking-widest text-slate-800 bg-slate-100 py-4 rounded-2xl mb-8">
                        {claimResult.otp}
                      </div>

                      <button onClick={() => setSelectedListing(null)} className="w-full py-3 font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm">
                        Done
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-2">Claim Failed</h3>
                      <p className="text-slate-500 mb-6">{claimResult.message}</p>
                      <button onClick={() => setSelectedListing(null)} className="w-full py-3 font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm">
                        Close
                      </button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default NGODashboard;
