import Notification from '../models/Notification.js';
import { io } from '../server.js';

export const notifyUser = async ({ recipient, sender, type, title, message, data = {} }) => {
  const notification = await Notification.create({ recipient, sender, type, title, message, data });

  io.to(recipient.toString()).emit(type, {
    _id: notification._id,
    type,
    title,
    message,
    data,
    createdAt: notification.createdAt
  });

  io.to(recipient.toString()).emit('NOTIFICATION', {
    _id: notification._id,
    type,
    title,
    message,
    data,
    createdAt: notification.createdAt
  });

  if (data?.fcmToken) {
    console.log(`Push placeholder for ${recipient}: ${title}`);
  }

  if (process.env.SMTP_HOST) {
    console.log(`Email notification queued for ${recipient}: ${title}`);
  }

  return notification;
};
