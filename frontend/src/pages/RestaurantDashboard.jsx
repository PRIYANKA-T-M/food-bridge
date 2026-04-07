import React, { useState, useEffect } from 'react';
import useAuthStore from '../store/useAuthStore';
import axios from 'axios';
import { Package, Clock, UtensilsCrossed, Send, MapPin, Bell } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const API_URL = 'https://food-bridge-e5x0.onrender.com/api/listings';

const LocationPicker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
};

const RecenterMap = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);
  return null;
};

const RestaurantDashboard = () => {
  const { user } = useAuthStore();
  const defaultPos = user?.location?.coordinates ? [user.location.coordinates[1], user.location.coordinates[0]] : [40.7128, -74.006];
  const [position, setPosition] = useState(defaultPos);
  const [formData, setFormData] = useState({
    foodType: '',
    totalQuantity: 10,
    expiryHours: 2,
  });
  const [success, setSuccess] = useState('');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user?._id) return;
    const socket = io('https://food-bridge-e5x0.onrender.com');
    socket.emit('join', user._id);
    socket.on('claim_notification', (data) => {
      setNotifications(prev => [data, ...prev]);
    });
    return () => socket.disconnect();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + Number(formData.expiryHours));

      const payload = {
        foodType: formData.foodType,
        totalQuantity: Number(formData.totalQuantity),
        expiryTime: expiryTime.toISOString(),
        coordinates: [position[1], position[0]]
      };

      if (!user?.token) {
        alert('Authentication Error: Your browser cache is broken and the token is missing. You MUST completely log out and log back in.');
        return;
      }

      const res = await axios.post(API_URL, payload, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      setSuccess('Surplus food broadcasted to nearby NGOs!');
      setTimeout(() => setSuccess(''), 3000);
      
      // Reset
      setFormData({ foodType: '', totalQuantity: 10, expiryHours: 2 });
    } catch (error) {
      console.error(error);
      alert('Failed to list food: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Restaurant Control Panel</h1>
        <p className="text-slate-500 mt-1">Broadcast surplus food instantly to verified NGOs within range.</p>
      </div>

      {notifications.length > 0 && (
        <div className="mb-8 space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Bell className="text-orange-500 h-6 w-6" />
            Recent Claims
          </h2>
          {notifications.map((notif, idx) => (
            <div key={idx} className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-bold text-orange-900">{notif.ngoName} wants to pick up!</p>
                <p className="text-sm text-orange-700">Quantity: {notif.quantity} meals/boxes</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-orange-600 uppercase font-bold tracking-wider">OTP Code</p>
                <p className="text-2xl font-black text-orange-600 tracking-widest">{notif.otpCode}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-slate-800">
          <UtensilsCrossed className="text-orange-500 h-6 w-6" />
          Post New Surplus
        </h2>

        {success && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 font-medium">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" /> Select Exact Location
            </label>
            <div className="h-64 rounded-xl overflow-hidden border border-slate-200 shadow-[0_inset_0_2px_4px_rgba(0,0,0,0.05)] relative z-0">
              <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker position={position} setPosition={setPosition} />
                <RecenterMap position={position} />
              </MapContainer>
            </div>
            <p className="text-xs text-slate-500 mt-2">Click on the map to adjust pickup location.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Food Type / Description</label>
              <input 
                type="text" required placeholder="e.g., Bakery Items, Sandwiches"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                value={formData.foodType}
                onChange={(e) => setFormData({...formData, foodType: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-400" /> Quantity (Meals/Boxes)
              </label>
              <input 
                type="number" min="1" required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                value={formData.totalQuantity}
                onChange={(e) => setFormData({...formData, totalQuantity: e.target.value})}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" /> Expiry Time (Hours from now)
              </label>
              <input 
                type="number" min="0.5" step="0.5" required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                value={formData.expiryHours}
                onChange={(e) => setFormData({...formData, expiryHours: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-4 rounded-xl transition-all shadow-sm hover:shadow flex justify-center items-center gap-2"
          >
            <Send className="h-5 w-5" />
            Broadcast to Network
          </button>
        </form>
      </div>

    </div>
  );
};

export default RestaurantDashboard;
