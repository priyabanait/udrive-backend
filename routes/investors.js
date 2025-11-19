import express from 'express';
import Investor from '../models/investor.js';
import InvestorSignup from '../models/investorSignup.js';
import { uploadToCloudinary } from '../lib/cloudinary.js';

const router = express.Router();

// INVESTOR SIGNUP (plain text password) - Stored in separate collection
router.post('/signup', async (req, res) => {
  try {
    const { investorName, email, phone, password } = req.body;
    if (!investorName || !phone || !password) {
      return res.status(400).json({ error: 'Name, phone, and password required' });
    }
    // Check if investor already exists in signup collection
    const existing = await InvestorSignup.findOne({ phone });
    if (existing) {
      return res.status(409).json({ error: 'Investor already exists' });
    }
    const newInvestorSignup = new InvestorSignup({ investorName, email, phone, password });
    await newInvestorSignup.save();
    res.status(201).json({ message: 'Signup successful', investorId: newInvestorSignup._id });
  } catch (error) {
    res.status(500).json({ error: 'Signup failed', message: error.message });
  }
});

// INVESTOR LOGIN (plain text password) - Check in signup collection
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password required' });
    }
    const investorSignup = await InvestorSignup.findOne({ phone });
    if (!investorSignup) {
      return res.status(404).json({ error: 'Investor not found' });
    }
    if (investorSignup.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    res.json({ message: 'Login successful', investorId: investorSignup._id });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
});

// INVESTOR SIGNUP WITH OTP - Stored in separate collection
router.post('/signup-otp', async (req, res) => {
  try {
    const { investorName, email, phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP required' });
    }
    // Check if investor already exists in signup collection
    const existing = await InvestorSignup.findOne({ phone });
    if (existing) {
      return res.status(409).json({ error: 'Investor already exists' });
    }
    // Create investor signup with OTP as password
    const newInvestorSignup = new InvestorSignup({ 
      investorName: investorName || 'Investor',
      email: email || '',
      phone, 
      password: otp 
    });
    await newInvestorSignup.save();
    res.status(201).json({ message: 'Signup successful', investorId: newInvestorSignup._id });
  } catch (error) {
    res.status(500).json({ error: 'Signup failed', message: error.message });
  }
});

// INVESTOR LOGIN WITH OTP - Check in signup collection
router.post('/login-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP required' });
    }
    const investorSignup = await InvestorSignup.findOne({ phone });
    if (!investorSignup) {
      return res.status(404).json({ error: 'Investor not found' });
    }
    if (investorSignup.password !== otp) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }
    res.json({ message: 'Login successful', investorId: investorSignup._id });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
});

// GET all investors (only manual entries for admin panel)
router.get('/', async (req, res) => {
  try {
    // Only fetch investors added manually by admin (not self-registered)
    const list = await Investor.find({ isManualEntry: true }).lean();
    // Transform _id to id for frontend compatibility
    const transformedList = list.map(investor => ({
      ...investor,
      id: investor._id.toString()
    }));
    res.json(transformedList);
  } catch (error) {
    console.error('Error fetching investors:', error);
    res.status(500).json({ error: 'Failed to fetch investors', message: error.message });
  }
});

// GET investor signup credentials (self-registered)
router.get('/signup/credentials', async (req, res) => {
  try {
    // Fetch all investor signups from separate collection
    const list = await InvestorSignup.find().select('investorName email phone password status kycStatus signupDate').lean();
    res.json(list);
  } catch (error) {
    console.error('Error fetching investor signup credentials:', error);
    res.status(500).json({ error: 'Failed to fetch signup credentials', message: error.message });
  }
});

// POST - Create new investor
router.post('/', async (req, res) => {
  try {
    // Handle document uploads to Cloudinary
    const documentFields = ['profilePhoto', 'aadharDocument', 'aadharDocumentBack', 'panDocument', 'bankDocument'];
    const uploadedDocs = {};
    
    // Generate a temporary ID for folder structure
    const tempId = Date.now();

    for (const field of documentFields) {
      if (req.body[field] && req.body[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(req.body[field], `investors/${tempId}/${field}`);
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
      }
    }

    // Create investor with uploaded document URLs
    const investorData = {
      ...req.body,
      ...uploadedDocs,
      isManualEntry: true // Mark as manually added by admin
    };

    // Remove base64 data to prevent large document size
    documentFields.forEach(field => {
      if (investorData[field]?.startsWith('data:')) {
        delete investorData[field];
      }
    });

    const newInvestor = new Investor(investorData);
    const saved = await newInvestor.save();
    const result = {
      ...saved.toObject(),
      id: saved._id.toString()
    };
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating investor:', error);
    res.status(400).json({ error: 'Failed to create investor', message: error.message });
  }
});

// PUT - Update investor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Handle document uploads to Cloudinary
    const documentFields = ['profilePhoto', 'aadharDocument', 'aadharDocumentBack', 'panDocument', 'bankDocument'];
    const uploadedDocs = {};

    for (const field of documentFields) {
      if (req.body[field] && req.body[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(req.body[field], `investors/${id}/${field}`);
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
      }
    }

    // Update investor data with uploaded document URLs
    const updateData = {
      ...req.body,
      ...uploadedDocs
    };

    // Remove base64 data to prevent large document size
    documentFields.forEach(field => {
      if (updateData[field]?.startsWith('data:')) {
        delete updateData[field];
      }
    });

    const updated = await Investor.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updated) {
      return res.status(404).json({ error: 'Investor not found' });
    }
    
    const result = {
      ...updated.toObject(),
      id: updated._id.toString()
    };
    res.json(result);
  } catch (error) {
    console.error('Error updating investor:', error);
    res.status(400).json({ error: 'Failed to update investor', message: error.message });
  }
});

// DELETE - Remove investor
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Investor.findByIdAndDelete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Investor not found' });
    }
    
    res.json({ message: 'Investor deleted successfully', investor: deleted });
  } catch (error) {
    console.error('Error deleting investor:', error);
    res.status(400).json({ error: 'Failed to delete investor', message: error.message });
  }
});

export default router;
