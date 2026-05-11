export const requestBrowserNotifications = async () => {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
};

export const showBrowserNotification = (title, options = {}) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(title, options);
};

export const createLocalPushToken = () => {
  const existing = localStorage.getItem('foodbridge_push_token');
  if (existing) return existing;
  const token = `local-${crypto.randomUUID?.() || Date.now()}`;
  localStorage.setItem('foodbridge_push_token', token);
  return token;
};
