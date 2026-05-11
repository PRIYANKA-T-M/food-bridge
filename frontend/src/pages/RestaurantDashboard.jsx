import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { Bell, CheckCircle2, Clock, History, MapPin, Package, Send, Star, Truck, UtensilsCrossed } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import { SOCKET_ROOT, t } from '../config';
import TrackingMap from '../components/TrackingMap';
import FeedbackModal from '../components/FeedbackModal';
import LocationSearch from '../components/LocationSearch';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const LocationPicker = ({ position, setPosition }) => {
  useMapEvents({ click: (event) => setPosition([event.latlng.lat, event.latlng.lng]) });
  return <Marker position={position} />;
};

const RecenterMap = ({ position }) => {
  const map = useMap();
  useEffect(() => { map.setView(position, map.getZoom()); }, [position, map]);
  return null;
};

const RestaurantDashboard = () => {
  const { user } = useAuthStore();
  const language = user?.language || 'en';
  const defaultPos = user?.location?.coordinates ? [user.location.coordinates[1], user.location.coordinates[0]] : [12.9716, 77.5946];
  const [position, setPosition] = useState(defaultPos);
  const [tab, setTab] = useState('post');
  const [formData, setFormData] = useState({ foodType: '', totalQuantity: 10, expiryHours: 2 });
  const [message, setMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [claims, setClaims] = useState([]);
  const [listings, setListings] = useState([]);
  const [trackingClaim, setTrackingClaim] = useState(null);
  const [feedbackClaim, setFeedbackClaim] = useState(null);

  const fetchClaims = async () => {
    const res = await api.get('/claims/restaurant');
    setClaims(res.data);
  };

  const fetchListings = async () => {
    const res = await api.get('/listings/mine');
    setListings(res.data.items);
  };

  useEffect(() => {
    queueMicrotask(() => { fetchClaims(); fetchListings(); });
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    const socket = io(SOCKET_ROOT);
    socket.emit('join', user._id);
    socket.on('claim_notification', (data) => {
      setNotifications((items) => [data, ...items]);
      fetchClaims();
    });
    socket.on('NOTIFICATION', (data) => setNotifications((items) => [data, ...items]));
    socket.on('START_DELIVERY', (data) => {
      fetchClaims();
      setMessage(`Pickup started for claim ${data.claimId}`);
      setTimeout(() => setMessage(''), 5000);
    });
    socket.on('LOCATION_UPDATE', (data) => {
      setClaims((items) => items.map((claim) => claim._id === data.claimId ? { ...claim, ...data } : claim));
      setTrackingClaim((claim) => claim?._id === data.claimId ? { ...claim, ...data } : claim);
    });
    return () => socket.disconnect();
  }, [user?._id]);

  const submitListing = async (event) => {
    event.preventDefault();
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + Number(formData.expiryHours));
    await api.post('/listings', {
      foodType: formData.foodType,
      totalQuantity: Number(formData.totalQuantity),
      expiryTime: expiryTime.toISOString(),
      coordinates: [position[1], position[0]]
    });
    setFormData({ foodType: '', totalQuantity: 10, expiryHours: 2 });
    setMessage('Surplus food broadcasted to nearby NGOs.');
    setTimeout(() => setMessage(''), 5000);
    fetchListings();
  };

  const verifyPickup = async (claim) => {
    const otpCode = window.prompt('Enter the OTP shown by the NGO');
    if (!otpCode) return;
    await api.put(`/claims/${claim._id}/pickup`, { otpCode, pickupPhoto: 'verified-at-restaurant' });
    await fetchClaims();
    setMessage('Pickup verified and completed.');
    setTimeout(() => setMessage(''), 5000);
  };

  const stats = useMemo(() => ({
    activeListings: listings.filter((item) => !item.isExpired && item.remainingQuantity > 0 && new Date(item.expiryTime) > new Date()).length,
    pendingPickups: claims.filter((claim) => claim.status === 'pending').length,
    completed: claims.filter((claim) => claim.status === 'picked_up').length
  }), [listings, claims]);

  const tabs = [
    ['post', t(language, 'postSurplus'), UtensilsCrossed],
    ['pickups', t(language, 'activePickups'), Truck],
    ['history', t(language, 'history'), History]
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Restaurant Control Panel</h1>
            <p className="text-slate-500 dark:text-slate-400">Broadcast surplus, monitor pickups, verify OTPs, and review NGO performance.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Active" value={stats.activeListings} />
            <MiniStat label="Pickups" value={stats.pendingPickups} />
            <MiniStat label="Done" value={stats.completed} />
          </div>
        </div>

        {message && <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700">{message}</div>}

        <div className="mb-5 flex flex-wrap gap-2">
          {tabs.map(([id, label, Icon]) => {
            const icon = React.createElement(Icon, { className: 'h-4 w-4' });
            return (
              <button key={id} onClick={() => setTab(id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${tab === id ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'}`}>
                {icon} {label}
              </button>
            );
          })}
        </div>

        {notifications.length > 0 && (
          <div className="mb-5 rounded-2xl border border-orange-100 bg-orange-50 p-4 dark:border-orange-900/40 dark:bg-orange-950/20">
            <h2 className="mb-3 flex items-center gap-2 font-black text-orange-900 dark:text-orange-200"><Bell className="h-5 w-5" /> Latest Alerts</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {notifications.slice(0, 4).map((item, index) => (
                <div key={item._id || index} className="rounded-xl bg-white p-3 text-sm dark:bg-slate-900">
                  <p className="font-bold">{item.ngoName || item.title || 'Platform alert'}</p>
                  <p className="text-slate-500">{item.message || `${item.quantity} portions claimed`}</p>
                  {item.otpCode && <p className="mt-2 font-mono text-2xl font-black text-orange-600">{item.otpCode}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'post' && (
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <form onSubmit={submitListing} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-5 flex items-center gap-2 text-xl font-black"><UtensilsCrossed className="h-5 w-5 text-orange-500" /> Post New Surplus</h2>
              <div className="space-y-4">
                <Field label="Food Type / Description">
                  <input required value={formData.foodType} onChange={(event) => setFormData({ ...formData, foodType: event.target.value })} placeholder="Bakery items, meals, produce" className="input" />
                </Field>
                <Field label="Quantity">
                  <input required type="number" min="1" value={formData.totalQuantity} onChange={(event) => setFormData({ ...formData, totalQuantity: event.target.value })} className="input" />
                </Field>
                <Field label="Expiry in hours">
                  <input required type="number" min="0.5" step="0.5" value={formData.expiryHours} onChange={(event) => setFormData({ ...formData, expiryHours: event.target.value })} className="input" />
                </Field>
              </div>
              <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 font-semibold text-white dark:bg-white dark:text-slate-950"><Send className="h-5 w-5" /> Broadcast to Network</button>
            </form>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><MapPin className="h-4 w-4" /> Pickup location</label>
              <LocationSearch onSelect={(nextPosition) => setPosition(nextPosition)} placeholder="Search restaurant address, street, area, or landmark" />
              <div className="mt-3 h-96 overflow-hidden rounded-xl">
                <MapContainer center={position} zoom={13} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationPicker position={position} setPosition={setPosition} />
                  <RecenterMap position={position} />
                </MapContainer>
              </div>
            </div>
          </div>
        )}

        {tab === 'pickups' && (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-xl font-black">Claim Monitoring</h2>
              <div className="space-y-3">
                {claims.filter((claim) => claim.status === 'pending').map((claim) => (
                  <ClaimCard key={claim._id} claim={claim} onTrack={setTrackingClaim} onVerify={verifyPickup} />
                ))}
                {!claims.some((claim) => claim.status === 'pending') && <Empty text="No active pickups yet." />}
              </div>
            </div>
            {trackingClaim ? <TrackingMap claim={trackingClaim} /> : <Empty text="Select an active pickup to view live tracking." />}
          </div>
        )}

        {tab === 'history' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-xl font-black">Transaction Timeline</h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {claims.map((claim) => (
                <div key={claim._id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-black">{claim.listingId?.foodType || 'Food'} • {claim.quantity} portions</p>
                    <p className="text-sm text-slate-500">{claim.ngoId?.name || 'NGO'} • {claim.status} • {new Date(claim.createdAt).toLocaleString()}</p>
                  </div>
                  {claim.status === 'picked_up' && <button onClick={() => setFeedbackClaim(claim)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700"><Star className="h-4 w-4" /> Review NGO</button>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {feedbackClaim && <FeedbackModal claim={feedbackClaim} toUserId={feedbackClaim.ngoId?._id} onClose={() => setFeedbackClaim(null)} onSubmitted={fetchClaims} />}
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
    {children}
  </label>
);

const MiniStat = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center dark:border-slate-800 dark:bg-slate-900">
    <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
    <p className="text-2xl font-black">{value}</p>
  </div>
);

const ClaimCard = ({ claim, onTrack, onVerify }) => (
  <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-black">{claim.ngoId?.name || 'NGO pickup'}</p>
        <p className="text-sm text-slate-500">{claim.quantity} portions of {claim.listingId?.foodType}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3 w-3" /> {claim.deliveryStatus?.replace('_', ' ') || 'not started'}</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-orange-700 dark:bg-orange-950/30 dark:text-orange-200">
          <span className="text-xs font-bold uppercase">OTP</span>
          <span className="font-mono text-xl font-black tracking-widest">{claim.otpCode}</span>
        </div>
      </div>
      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    </div>
    <div className="mt-4 flex gap-2">
      <button onClick={() => onTrack(claim)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold dark:border-slate-700">Track</button>
      <button onClick={() => onVerify(claim)} className="flex-1 rounded-xl bg-orange-500 py-2 text-sm font-semibold text-white">Verify OTP</button>
    </div>
  </div>
);

const Empty = ({ text }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">
    <Package className="mx-auto mb-3 h-9 w-9 text-slate-300" />
    {text}
  </div>
);

export default RestaurantDashboard;
