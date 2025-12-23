import express from 'express';
import { listNotifications, markAsRead, markAllAsRead, countUnread } from '../lib/notify.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    console.log('GET /api/notifications - Query params:', req.query);
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Cap at 100
    const { driverId, investorId, recipientType, recipientId } = req.query;
    console.log('Calling listNotifications with:', { page, limit, driverId, investorId, recipientType, recipientId });
    const result = await listNotifications({ page, limit, driverId, investorId, recipientType, recipientId });
    // Ensure consistent response format
    if (result && result.items) {
      console.log('Returning', result.items.length, 'notifications');
      res.json(result);
    } else {
      console.log('No result or items, returning empty array');
      res.json({ items: [], pagination: { total: 0, page, limit, totalPages: 0 } });
    }
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Failed to fetch notifications', error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { type, title, message, data, recipientType, recipientId } = req.body || {};
    if (!type || (!title && !message)) {
      return res.status(400).json({ message: 'type and title/message required' });
    }
    const { createAndEmitNotification } = await import('../lib/notify.js');
    const note = await createAndEmitNotification({ type, title, message, data, recipientType, recipientId });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create notification', error: err.message });
  }
});

router.post('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Notification ID is required' });
    }
    const updated = await markAsRead(id);
    if (!updated) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ message: 'Failed to mark notification as read', error: err.message });
  }
});

// =====================
// Driver-specific endpoints
// GET /api/notifications/driver/:driverId?page=&limit=
router.get('/driver/:driverId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { driverId } = req.params;
    const result = await listNotifications({ page, limit, driverId });
    res.json(result);
  } catch (err) {
    console.error('Error fetching driver notifications:', err);
    res.status(500).json({ message: 'Failed to fetch driver notifications', error: err.message });
  }
});

// POST /api/notifications/driver/:driverId/read-all
router.post('/driver/:driverId/read-all', async (req, res) => {
  try {
    const { driverId } = req.params;
    const result = await markAllAsRead({ recipientType: 'driver', recipientId: String(driverId) });
    res.json({ success: true, result });
  } catch (err) {
    console.error('Error marking driver notifications read:', err);
    res.status(500).json({ message: 'Failed to mark driver notifications as read', error: err.message });
  }
});

// GET /api/notifications/driver/:driverId/unread-count
router.get('/driver/:driverId/unread-count', async (req, res) => {
  try {
    const { driverId } = req.params;
    const count = await countUnread({ recipientType: 'driver', recipientId: String(driverId) });
    res.json({ unread: count });
  } catch (err) {
    console.error('Error counting driver unread notifications:', err);
    res.status(500).json({ message: 'Failed to count driver notifications', error: err.message });
  }
});

// =====================
// Investor-specific endpoints
// GET /api/notifications/investor/:investorId?page=&limit=
router.get('/investor/:investorId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { investorId } = req.params;
    const result = await listNotifications({ page, limit, investorId });
    res.json(result);
  } catch (err) {
    console.error('Error fetching investor notifications:', err);
    res.status(500).json({ message: 'Failed to fetch investor notifications', error: err.message });
  }
});

// POST /api/notifications/investor/:investorId/read-all
router.post('/investor/:investorId/read-all', async (req, res) => {
  try {
    const { investorId } = req.params;
    const result = await markAllAsRead({ recipientType: 'investor', recipientId: String(investorId) });
    res.json({ success: true, result });
  } catch (err) {
    console.error('Error marking investor notifications read:', err);
    res.status(500).json({ message: 'Failed to mark investor notifications as read', error: err.message });
  }
});

// GET /api/notifications/investor/:investorId/unread-count
router.get('/investor/:investorId/unread-count', async (req, res) => {
  try {
    const { investorId } = req.params;
    const count = await countUnread({ recipientType: 'investor', recipientId: String(investorId) });
    res.json({ unread: count });
  } catch (err) {
    console.error('Error counting investor unread notifications:', err);
    res.status(500).json({ message: 'Failed to count investor notifications', error: err.message });
  }
});

export default router;
