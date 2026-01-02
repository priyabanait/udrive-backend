import express from 'express';
import DeviceToken from '../models/deviceToken.js';
import Driver from '../models/driver.js';
import Investor from '../models/investor.js';

const router = express.Router();

// Register or upsert a device token
// body: { token, platform, userType, userId }
router.post('/', async (req, res) => {
  const { token, platform, userType, userId } = req.body || {};
  if (!token) return res.status(400).send({ error: 'token is required' });
  try {
    const doc = await DeviceToken.findOneAndUpdate(
      { token },
      { token, platform, userType, userId, lastSeen: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.send({ success: true, token: doc });
  } catch (err) {
    console.error('device-token upsert failed:', err);
    res.status(500).send({ error: 'failed to register token' });
  }
});

// Register driver token by mobile
// POST /api/deviceTokens/register-driver-by-mobile
// body: { mobile, token, platform }
router.post('/register-driver-by-mobile', async (req, res) => {
  try {
    const { mobile, token, platform } = req.body || {};
    if (!mobile) return res.status(400).json({ error: 'mobile is required' });
    if (!token) return res.status(400).json({ error: 'token is required' });

    const normalized = String(mobile).trim();
    const driver = await Driver.findOne({ mobile: normalized }).lean();
    if (!driver) return res.status(404).json({ error: 'Driver not found for given mobile' });

    const doc = await DeviceToken.findOneAndUpdate(
      { token },
      { token, platform, userType: 'driver', userId: String(driver._id), lastSeen: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, token: doc });
  } catch (err) {
    console.error('register-driver-by-mobile failed:', err);
    res.status(500).json({ error: 'failed to register driver token' });
  }
});

// Register investor token by mobile
// POST /api/deviceTokens/register-investor-by-mobile
// body: { mobile, token, platform }
router.post('/register-investor-by-mobile', async (req, res) => {
  try {
    const { mobile, token, platform } = req.body || {};
    if (!mobile) return res.status(400).json({ error: 'mobile is required' });
    if (!token) return res.status(400).json({ error: 'token is required' });

    const normalized = String(mobile).trim();
    const investor = await Investor.findOne({ phone: normalized }).lean();
    if (!investor) return res.status(404).json({ error: 'Investor not found for given mobile' });

    const doc = await DeviceToken.findOneAndUpdate(
      { token },
      { token, platform, userType: 'investor', userId: String(investor._id), lastSeen: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, token: doc });
  } catch (err) {
    console.error('register-investor-by-mobile failed:', err);
    res.status(500).json({ error: 'failed to register investor token' });
  }
});

// Remove a token
router.delete('/:token', async (req, res) => {
  const { token } = req.params;
  try {
    await DeviceToken.deleteOne({ token });
    res.send({ success: true });
  } catch (err) {
    console.error('device-token delete failed:', err);
    res.status(500).send({ error: 'failed to delete token' });
  }
});

// List tokens for a user (optional)
// query params: userType, userId
router.get('/', async (req, res) => {
  const { userType, userId, limit = 100 } = req.query;
  const q = {};
  if (userType) q.userType = userType;
  if (userId) q.userId = userId;
  try {
    const items = await DeviceToken.find(q).limit(Number(limit)).lean();
    res.send({ items });
  } catch (err) {
    console.error('device-token list failed:', err);
    res.status(500).send({ error: 'failed to list tokens' });
  }
});

export default router;
