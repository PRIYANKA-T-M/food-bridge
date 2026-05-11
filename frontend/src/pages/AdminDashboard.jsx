import React, { useEffect, useState } from 'react';
import { Ban, BarChart3, ClipboardList, Shield, Trash2, Users } from 'lucide-react';
import api from '../services/api';
import MetricCard from '../components/MetricCard';

const AdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [claims, setClaims] = useState([]);
  const [tab, setTab] = useState('overview');

  const load = async () => {
    const [overviewRes, usersRes, listingsRes, claimsRes] = await Promise.all([
      api.get('/admin/overview'),
      api.get('/admin/users'),
      api.get('/admin/listings'),
      api.get('/admin/claims')
    ]);
    setOverview(overviewRes.data);
    setUsers(usersRes.data);
    setListings(listingsRes.data);
    setClaims(claimsRes.data);
  };

  useEffect(() => {
    queueMicrotask(() => { load(); });
  }, []);

  const suspendUser = async (user) => {
    await api.put(`/admin/block-user/${user._id}`, { isSuspended: !user.isSuspended });
    load();
  };

  const removeListing = async (listingId) => {
    if (!window.confirm('Remove this listing?')) return;
    await api.delete(`/admin/listings/${listingId}`);
    load();
  };

  const totals = overview?.totals || {};
  const tabs = [
    ['overview', 'Overview', BarChart3],
    ['users', 'User Management', Users],
    ['listings', 'Listing Monitoring', ClipboardList],
    ['claims', 'Claim Monitoring', Shield]
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">Central monitoring for users, listings, claims, strikes, and platform health.</p>
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

        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Total Users" value={totals.users || 0} />
              <MetricCard label="Active Listings" value={totals.activeListings || 0} tone="green" />
              <MetricCard label="Completed Pickups" value={totals.completed || 0} tone="slate" />
              <MetricCard label="No-show Rate" value={`${overview?.noShowRate || 0}%`} tone="red" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-xl font-black">Analytics</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Bar label="Restaurants" value={totals.restaurants || 0} max={totals.users || 1} />
                <Bar label="NGOs" value={totals.ngos || 0} max={totals.users || 1} />
                <Bar label="Suspended" value={totals.suspendedUsers || 0} max={totals.users || 1} tone="bg-red-500" />
              </div>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <Panel>
            {users.map((user) => (
              <Row key={user._id}>
                <div>
                  <p className="font-black">{user.name}</p>
                  <p className="text-sm text-slate-500">{user.email} • {user.role} • strikes {user.strikes || 0}</p>
                </div>
                <button onClick={() => suspendUser(user)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${user.isSuspended ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                  <Ban className="h-4 w-4" /> {user.isSuspended ? 'Restore' : 'Suspend'}
                </button>
              </Row>
            ))}
          </Panel>
        )}

        {tab === 'listings' && (
          <Panel>
            {listings.map((listing) => (
              <Row key={listing._id}>
                <div>
                  <p className="font-black">{listing.foodType} • {listing.remainingQuantity}/{listing.totalQuantity} left</p>
                  <p className="text-sm text-slate-500">{listing.donor?.name || 'Restaurant'} • expires {new Date(listing.expiryTime).toLocaleString()}</p>
                </div>
                <button onClick={() => removeListing(listing._id)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600">
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              </Row>
            ))}
          </Panel>
        )}

        {tab === 'claims' && (
          <Panel>
            {claims.map((claim) => (
              <Row key={claim._id}>
                <div>
                  <p className="font-black">{claim.listingId?.foodType || 'Food'} • {claim.quantity} portions</p>
                  <p className="text-sm text-slate-500">{claim.ngoId?.name || 'NGO'} from {claim.listingId?.donor?.name || 'Restaurant'} • {claim.status}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">{claim.deliveryStatus?.replace('_', ' ')}</span>
              </Row>
            ))}
          </Panel>
        )}
      </div>
    </div>
  );
};

const Panel = ({ children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <div className="divide-y divide-slate-100 dark:divide-slate-800">{children}</div>
  </div>
);

const Row = ({ children }) => (
  <div className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">{children}</div>
);

const Bar = ({ label, value, max, tone = 'bg-orange-500' }) => (
  <div>
    <div className="mb-2 flex justify-between text-sm font-semibold"><span>{label}</span><span>{value}</span></div>
    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={`h-3 rounded-full ${tone}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  </div>
);

export default AdminDashboard;
