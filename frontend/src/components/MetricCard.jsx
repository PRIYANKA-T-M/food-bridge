import React from 'react';

const MetricCard = ({ label, value, tone = 'orange' }) => {
  const tones = {
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-200'
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.orange}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
};

export default MetricCard;
