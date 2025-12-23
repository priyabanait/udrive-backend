import Notification from '../models/notification.js';
import { getIO } from './socket.js';
import { sendPushToTokens } from './firebaseAdmin.js';
import DeviceToken from '../models/deviceToken.js';

export async function createAndEmitNotification({ type, title, message, data = {}, recipientType = null, recipientId = null }) {
  try {
    const note = await Notification.create({ type, title, message, data, recipientType, recipientId });
    console.log('Notification created:', { type, title, recipientType, recipientId, id: note._id });
    try {
      const io = getIO();
      // Emit globally for dashboard listeners (all admins will receive this)
      io.emit('dashboard:notification', note);
      console.log('Notification emitted globally to all dashboard listeners');
      // Also emit to a specific room if recipient is provided (e.g., 'investor:123')
      if (recipientType && recipientId) {
        io.to(`${recipientType}:${recipientId}`).emit('dashboard:notification', note);
        console.log(`Notification also emitted to room: ${recipientType}:${recipientId}`);
      }

      // Try sending push notifications via FCM
      try {
        let tokens = [];
        if (recipientType && recipientId) {
          tokens = await DeviceToken.find({ userType: recipientType, userId: String(recipientId) }).distinct('token');
        } else {
          tokens = await DeviceToken.find({}).distinct('token');
        }

        if (tokens && tokens.length) {
          const payload = { title: title || 'Notification', body: message || '', data: { noteId: note._id.toString(), ...data } };
          const result = await sendPushToTokens(tokens, payload);
          console.log('FCM send result:', result);
        } else {
          console.log('No device tokens to send FCM to');
        }
      } catch (pe) {
        console.warn('FCM send failed:', pe.message);
      }

    } catch (e) {
      // Socket not initialized yet; ignore emit
      console.warn('Socket emit skipped:', e.message);
    }
    return note;
  } catch (err) {
    console.error('Failed to create notification:', err);
    throw err;
  }
}

export async function listNotifications({ page = 1, limit = 20, driverId = null, investorId = null, recipientType = null, recipientId = null } = {}) {
  const skip = (page - 1) * limit;

  // Build query based on recipient filters
  let query = {};
  
  // If specific recipient filters are provided, use them
  if (driverId) {
    // For drivers: show their specific notifications + global notifications
    query = {
      $or: [
        { recipientType: 'driver', recipientId: driverId },
        { recipientType: null, recipientId: null }
      ]
    };
  } else if (investorId) {
    // For investors: show their specific notifications + global notifications
    query = {
      $or: [
        { recipientType: 'investor', recipientId: investorId },
        { recipientType: null, recipientId: null }
      ]
    };
  } else if (recipientType && recipientId) {
    // For specific recipient type/id: show their notifications + global notifications
    query = {
      $or: [
        { recipientType, recipientId },
        { recipientType: null, recipientId: null }
      ]
    };
  } else {
    // No specific recipient - show all notifications (for admins)
    // Show all notifications regardless of recipientType/recipientId
    query = {};
  }

  console.log('listNotifications query:', JSON.stringify(query));
  const total = await Notification.countDocuments(query);
  const items = await Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  console.log(`listNotifications found ${items.length} notifications (total: ${total})`);
  return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function markAsRead(id) {
  return Notification.findByIdAndUpdate(id, { read: true }, { new: true }).lean();
}

export async function markAllAsRead({ recipientType = null, recipientId = null } = {}) {
  // Build query similar to listNotifications: specific recipient + global notifications
  let query = {};
  if (recipientType && recipientId) {
    query = {
      $or: [
        { recipientType, recipientId },
        { recipientType: null, recipientId: null }
      ]
    };
  } else if (recipientType) {
    query = {
      $or: [
        { recipientType },
        { recipientType: null }
      ]
    };
  } else {
    query = {}; // mark all notifications
  }
  const res = await Notification.updateMany(query, { $set: { read: true } });
  return res;
}

export async function countUnread({ recipientType = null, recipientId = null } = {}) {
  let query = { read: { $ne: true } };
  if (recipientType && recipientId) {
    query = {
      ...query,
      $or: [
        { recipientType, recipientId },
        { recipientType: null, recipientId: null }
      ]
    };
  } else if (recipientType) {
    query = {
      ...query,
      $or: [
        { recipientType },
        { recipientType: null }
      ]
    };
  }
  return Notification.countDocuments(query);
}
