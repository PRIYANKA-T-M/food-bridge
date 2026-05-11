export const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const SOCKET_ROOT = import.meta.env.VITE_SOCKET_URL || API_ROOT.replace(/\/api\/?$/, '');

export const languages = {
  en: 'English',
  ta: 'Tamil',
  hi: 'Hindi',
  ml: 'Malayalam'
};

export const copy = {
  en: {
    nearby: 'Nearby Surplus',
    claims: 'My Claims',
    tracking: 'Pickup Tracking',
    settings: 'Settings',
    admin: 'Admin',
    postSurplus: 'Post New Surplus',
    activePickups: 'Active Pickups',
    history: 'History'
  },
  ta: {
    nearby: 'அருகிலுள்ள உணவு',
    claims: 'என் கோரிக்கைகள்',
    tracking: 'எடுப்பு கண்காணிப்பு',
    settings: 'அமைப்புகள்',
    admin: 'நிர்வாகம்',
    postSurplus: 'புதிய உணவு பதிவு',
    activePickups: 'நடப்பு எடுப்புகள்',
    history: 'வரலாறு'
  },
  hi: {
    nearby: 'नजदीकी भोजन',
    claims: 'मेरे दावे',
    tracking: 'पिकअप ट्रैकिंग',
    settings: 'सेटिंग्स',
    admin: 'प्रशासन',
    postSurplus: 'नया भोजन पोस्ट करें',
    activePickups: 'सक्रिय पिकअप',
    history: 'इतिहास'
  },
  ml: {
    nearby: 'അടുത്തുള്ള ഭക്ഷണം',
    claims: 'എന്റെ ക്ലെയിമുകൾ',
    tracking: 'പിക്കപ്പ് ട്രാക്കിംഗ്',
    settings: 'ക്രമീകരണങ്ങൾ',
    admin: 'അഡ്മിൻ',
    postSurplus: 'പുതിയ ഭക്ഷണം പോസ്റ്റ് ചെയ്യുക',
    activePickups: 'സജീവ പിക്കപ്പുകൾ',
    history: 'ചരിത്രം'
  }
};

export const t = (language, key) => copy[language]?.[key] || copy.en[key] || key;
