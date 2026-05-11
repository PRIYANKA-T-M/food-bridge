import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { AlertCircle, Bell, CheckCircle2, Clock, Download, History, Languages, MapPin, Navigation, Package, Satellite, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import { createLocalPushToken, requestBrowserNotifications, showBrowserNotification } from '../services/notifications';
import { SOCKET_ROOT, t } from '../config';
import TrackingMap from '../components/TrackingMap';
import FeedbackModal from '../components/FeedbackModal';
import LocationSearch from '../components/LocationSearch';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const LocationPicker = ({ setCenter }) => {
  useMapEvents({ click: (event) => setCenter([event.latlng.lat, event.latlng.lng]) });
  return null;
};

const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center, map]);
  return null;
};

const NGODashboard = () => {
  const { user, updatePreferences } = useAuthStore();
  const language = user?.language || 'en';
  const defaultCenter = user?.location?.coordinates ? [user.location.coordinates[1], user.location.coordinates[0]] : [12.9716, 77.5946];
  const [center, setCenter] = useState(defaultCenter);
  const centerRef = useRef(center);
  const [tab, setTab] = useState('nearby');
  const [listings, setListings] = useState([]);
  const [claims, setClaims] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [trackingClaim, setTrackingClaim] = useState(null);
  const [claimQty, setClaimQty] = useState(1);
  const [claimResult, setClaimResult] = useState(null);
  const [alert, setAlert] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [feedbackClaim, setFeedbackClaim] = useState(null);

  useEffect(() => { centerRef.current = center; }, [center]);

  const fetchListings = useCallback(async (lat = center[0], lng = center[1]) => {
    const res = await api.get(`/listings/nearby?lat=${lat}&lng=${lng}`);
    setListings(res.data);
  }, [center]);

  const fetchClaims = useCallback(async () => {
    const res = await api.get('/claims/history', { params: { search, status } });
    setClaims(res.data.items);
  }, [search, status]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  useEffect(() => {
    if (!user?._id) return;
    const socket = io(SOCKET_ROOT);
    socket.emit('join', user._id);
    socket.on('NOTIFICATION', (data) => {
      setAlert(data.message);
      showBrowserNotification(data.title, { body: data.message });
      setTimeout(() => setAlert(''), 6000);
    });
    socket.on('NEW_SURPLUS', (data) => {
      fetchListings(centerRef.current[0], centerRef.current[1]);
      const message = `New surplus from ${data.restaurantName}`;
      setAlert(message);
      showBrowserNotification('New surplus nearby', { body: message });
      setTimeout(() => setAlert(''), 6000);
    });
    socket.on('LOCATION_UPDATE', (data) => {
      setClaims((items) => items.map((claim) => claim._id === data.claimId ? { ...claim, ...data } : claim));
      setTrackingClaim((claim) => claim?._id === data.claimId ? { ...claim, ...data } : claim);
    });
    return () => socket.disconnect();
  }, [fetchListings, user?._id]);

  const enablePush = async () => {
    const permission = await requestBrowserNotifications();
    if (permission === 'granted') {
      await updatePreferences({ fcmToken: createLocalPushToken() });
      setAlert('Browser notifications enabled for this device.');
      setTimeout(() => setAlert(''), 5000);
    }
  };

  const claimListing = async (event) => {
    event.preventDefault();
    try {
      const res = await api.post('/claims', { listingId: selectedListing._id, requestedQty: Number(claimQty) });
      setClaimResult({ success: true, otp: res.data.otpCode });
      await Promise.all([fetchListings(), fetchClaims()]);
    } catch (err) {
      setClaimResult({ success: false, message: err.response?.data?.message || err.message });
    }
  };

  const startPickup = async (claim) => {
    const coords = await new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(user.location.coordinates);
      navigator.geolocation.getCurrentPosition(
        (position) => resolve([position.coords.longitude, position.coords.latitude]),
        () => resolve(user.location.coordinates),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
    const res = await api.put(`/claims/${claim._id}/start-delivery`, { coordinates: coords });
    setTrackingClaim(res.data.claim);
    setTab('tracking');
  };

  const updateLiveLocation = async () => {
    if (!trackingClaim) return;
    navigator.geolocation.getCurrentPosition(async (position) => {
      const coordinates = [position.coords.longitude, position.coords.latitude];
      const res = await api.put(`/claims/${trackingClaim._id}/location`, { coordinates });
      setTrackingClaim(res.data.claim);
    });
  };

  const updateManualLocation = async (position) => {
    if (!trackingClaim) return;
    const coordinates = [position[1], position[0]];
    const res = await api.put(`/claims/${trackingClaim._id}/location`, { coordinates });
    setTrackingClaim(res.data.claim);
  };

  const markArrived = async () => {
    if (!trackingClaim) return;
    const res = await api.put(`/claims/${trackingClaim._id}/arrived`);
    setTrackingClaim(res.data.claim);
    await fetchClaims();
  };

  const downloadReport = () => {
    const rows = claims.map((claim) => ({
      id: claim._id,
      food: claim.listingId?.foodType,
      restaurant: claim.listingId?.donor?.name,
      quantity: claim.quantity,
      status: claim.status,
      createdAt: claim.createdAt
    }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'foodbridge-claims-report.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeClaim = useMemo(() => claims.find((claim) => claim.status === 'pending'), [claims]);
  const tabs = [
    ['nearby', t(language, 'nearby'), Package],
    ['claims', t(language, 'claims'), History],
    ['tracking', t(language, 'tracking'), Satellite],
    ['settings', t(language, 'settings'), Languages]
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950">
      {alert && (
        <div className="fixed left-1/2 top-20 z-[2500] flex -translate-x-1/2 items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg">
          <Bell className="h-4 w-4" /> {alert}
        </div>
      )}

      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">NGO Operations</h1>
            <p className="text-slate-500 dark:text-slate-400">Find food, claim it, track pickup, and close the loop with feedback.</p>
          </div>
          <button onClick={enablePush} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
            <Bell className="h-4 w-4" /> Enable alerts
          </button>
        </div>

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

        {tab === 'nearby' && (
          <div className="grid gap-5 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-3">
              <LocationSearch onSelect={(nextCenter) => setCenter(nextCenter)} placeholder="Search pickup area, street, NGO location, or landmark" />
              <div className="h-[600px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <MapContainer center={center} zoom={13} className="h-full w-full">
                  <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationPicker setCenter={setCenter} />
                  <RecenterMap center={center} />
                  <Circle center={center} radius={(user.watchRadius || 5) * 1000} pathOptions={{ color: '#f97316', fillOpacity: 0.08 }} />
                  <Marker position={center}><Popup>Search center</Popup></Marker>
                  {listings.map((listing) => (
                    <Marker key={listing._id} position={[listing.location.coordinates[1], listing.location.coordinates[0]]}>
                      <Popup>
                        <b>{listing.donor?.name || 'Restaurant'}</b><br />
                        {listing.remainingQuantity} portions of {listing.foodType}<br />
                        <button onClick={() => { setSelectedListing(listing); setClaimQty(1); setClaimResult(null); }} className="mt-2 rounded bg-orange-500 px-3 py-1 text-xs text-white">Claim</button>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
            <div className="space-y-4">
              {listings.map((listing) => (
                <div key={listing._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-orange-600">{listing.foodType}</p>
                      <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{listing.remainingQuantity} of {listing.totalQuantity} portions</h3>
                      <p className="text-sm text-slate-500">{listing.donor?.name || 'Restaurant'}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {formatDistanceToNow(new Date(listing.expiryTime), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => { setSelectedListing(listing); setClaimResult(null); }} className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">Process Claim</button>
                    <a className="rounded-xl border border-slate-200 p-3 dark:border-slate-700" href={`https://www.google.com/maps/dir/?api=1&destination=${listing.location.coordinates[1]},${listing.location.coordinates[0]}`} target="_blank" rel="noreferrer" title="Navigate">
                      <Navigation className="h-5 w-5" />
                    </a>
                  </div>
                </div>
              ))}
              {!listings.length && <Empty icon={Package} text={`No active surplus within ${user.watchRadius || 5}km.`} />}
            </div>
          </div>
        )}

        {tab === 'claims' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-700">
                <Search className="h-4 w-4 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search restaurant or food" className="w-full bg-transparent py-3 outline-none" />
              </div>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-950">
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                <option value="picked_up">Completed</option>
                <option value="no-show">No-show</option>
              </select>
              <button onClick={downloadReport} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white"><Download className="h-4 w-4" /> Report</button>
            </div>
            <ClaimList claims={claims} onStart={startPickup} onFeedback={setFeedbackClaim} />
          </div>
        )}

        {tab === 'tracking' && (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.2fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-xl font-black">Live Pickup</h2>
              <p className="mt-1 text-sm text-slate-500">Start a pending claim and keep this tab open while travelling.</p>
              <button onClick={() => activeClaim && startPickup(activeClaim)} disabled={!activeClaim} className="mt-5 w-full rounded-xl bg-orange-500 py-3 font-semibold text-white disabled:opacity-50">Start Pickup</button>
              {trackingClaim && (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Pickup OTP</p>
                  <p className="mt-2 font-mono text-3xl font-black tracking-widest text-orange-600">{trackingClaim.otpCode}</p>
                  <p className="mt-1 text-xs text-slate-500">Show this to the restaurant for verification.</p>
                </div>
              )}
              <div className="mt-4">
                <LocationSearch onSelect={updateManualLocation} placeholder="Move pickup marker by area, street, or landmark" />
              </div>
              <button onClick={updateLiveLocation} disabled={!trackingClaim} className="mt-3 w-full rounded-xl border border-slate-200 py-3 font-semibold dark:border-slate-700">Send Current GPS Location</button>
              <button onClick={markArrived} disabled={!trackingClaim} className="mt-3 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white disabled:opacity-50">Reached Restaurant</button>
            </div>
            {trackingClaim ? <TrackingMap claim={trackingClaim} /> : <Empty icon={MapPin} text="No active pickup selected." />}
          </div>
        )}

        {tab === 'settings' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-black">Preferences</h2>
            <p className="mt-2 text-slate-500">Language, dark mode, and browser notifications are saved to your profile.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Info label="Strikes" value={user.strikes || 0} />
              <Info label="Rating" value={`${user.ratingAverage || 0} (${user.ratingCount || 0})`} />
              <Info label="Watch radius" value={`${user.watchRadius || 5} km`} />
            </div>
          </div>
        )}
      </div>

      {selectedListing && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950/50 p-4">
          <form onSubmit={claimListing} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            {!claimResult ? (
              <>
                <h3 className="text-2xl font-black">Claim Food</h3>
                <p className="mt-1 text-slate-500">{selectedListing.donor?.name} has {selectedListing.remainingQuantity} portions available.</p>
                <input type="range" min="1" max={selectedListing.remainingQuantity} value={claimQty} onChange={(event) => setClaimQty(event.target.value)} className="mt-6 w-full accent-orange-500" />
                <p className="mt-2 text-sm font-semibold text-orange-600">{claimQty} portions selected</p>
                <div className="mt-6 flex gap-3">
                  <button type="button" onClick={() => setSelectedListing(null)} className="flex-1 rounded-xl bg-slate-100 py-3 font-semibold dark:bg-slate-800">Cancel</button>
                  <button className="flex-1 rounded-xl bg-orange-500 py-3 font-semibold text-white">Confirm</button>
                </div>
              </>
            ) : (
              <div className="text-center">
                {claimResult.success ? <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" /> : <AlertCircle className="mx-auto h-14 w-14 text-red-500" />}
                <h3 className="mt-4 text-2xl font-black">{claimResult.success ? 'Claim Secured' : 'Claim Failed'}</h3>
                <p className="mt-2 text-slate-500">{claimResult.success ? 'Present this OTP during pickup.' : claimResult.message}</p>
                {claimResult.success && <div className="mt-5 rounded-2xl bg-slate-100 py-4 font-mono text-4xl font-black tracking-widest dark:bg-slate-800">{claimResult.otp}</div>}
                <button type="button" onClick={() => setSelectedListing(null)} className="mt-6 w-full rounded-xl bg-slate-900 py-3 font-semibold text-white dark:bg-white dark:text-slate-950">Done</button>
              </div>
            )}
          </form>
        </div>
      )}

      {feedbackClaim && <FeedbackModal claim={feedbackClaim} toUserId={feedbackClaim.listingId?.donor?._id} onClose={() => setFeedbackClaim(null)} onSubmitted={fetchClaims} />}
    </div>
  );
};

const Empty = ({ icon, text }) => {
  const iconElement = React.createElement(icon, { className: 'mx-auto mb-3 h-9 w-9 text-slate-300' });
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">
      {iconElement}
      {text}
    </div>
  );
};

const Info = ({ label, value }) => (
  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-1 text-xl font-black">{value}</p>
  </div>
);

const ClaimList = ({ claims, onStart, onFeedback }) => (
  <div className="divide-y divide-slate-100 dark:divide-slate-800">
    {claims.map((claim) => (
      <div key={claim._id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-black">{claim.listingId?.foodType || 'Food'} from {claim.listingId?.donor?.name || 'Restaurant'}</p>
          <p className="text-sm text-slate-500">{claim.quantity} portions • {claim.status} • OTP {claim.otpCode} • {new Date(claim.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          {claim.status === 'pending' && <button onClick={() => onStart(claim)} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Start Pickup</button>}
          {claim.status === 'picked_up' && <button onClick={() => onFeedback(claim)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700">Feedback</button>}
        </div>
      </div>
    ))}
    {!claims.length && <Empty icon={Clock} text="No claims match your filters." />}
  </div>
);

export default NGODashboard;
