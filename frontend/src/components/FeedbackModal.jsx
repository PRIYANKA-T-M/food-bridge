import React, { useState } from 'react';
import { Star } from 'lucide-react';
import api from '../services/api';

const FeedbackModal = ({ claim, toUserId, onClose, onSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/feedback', { claimId: claim._id, toUser: toUserId, rating, comment });
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950/50 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Rate this pickup</h3>
        <div className="mt-5 flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button type="button" key={value} onClick={() => setRating(value)} className="p-1 text-orange-500">
              <Star className="h-8 w-8" fill={value <= rating ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Add a short note"
          className="mt-5 h-28 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 outline-none focus:border-orange-500"
        />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 py-3 font-medium">Cancel</button>
          <button type="submit" className="flex-1 rounded-xl bg-orange-500 py-3 font-medium text-white">Submit</button>
        </div>
      </form>
    </div>
  );
};

export default FeedbackModal;
