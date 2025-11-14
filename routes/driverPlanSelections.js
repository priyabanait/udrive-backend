import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import DriverPlanSelection from '../models/driverPlanSelection.js';
import DriverSignup from '../models/driverSignup.js';

dotenv.config();

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'dev_secret';

// Middleware to verify driver JWT token
const authenticateDriver = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.driver = user;
    next();
  });
};

// Get all driver plan selections (Admin view)
router.get('/', async (req, res) => {
  try {
    const selections = await DriverPlanSelection.find()
      .sort({ selectedDate: -1 })
      .lean();
    res.json(selections);
  } catch (err) {
    console.error('Get plan selections error:', err);
    res.status(500).json({ message: 'Failed to load plan selections' });
  }
});

// Get driver's own plan selections
router.get('/my-plans', authenticateDriver, async (req, res) => {
  try {
    const selections = await DriverPlanSelection.find({ 
      driverSignupId: req.driver.id 
    })
      .sort({ selectedDate: -1 })
      .lean();
    res.json(selections);
  } catch (err) {
    console.error('Get my plans error:', err);
    res.status(500).json({ message: 'Failed to load your plans' });
  }
});

// Get single plan selection by ID
router.get('/:id', async (req, res) => {
  try {
    const selection = await DriverPlanSelection.findById(req.params.id).lean();
    if (!selection) {
      return res.status(404).json({ message: 'Plan selection not found' });
    }
    res.json(selection);
  } catch (err) {
    console.error('Get plan selection error:', err);
    res.status(500).json({ message: 'Failed to load plan selection' });
  }
});

// Create new plan selection (Driver selects a plan)
router.post('/', authenticateDriver, async (req, res) => {
  try {
    const { planId, planName, planType, securityDeposit, rentSlabs, selectedRentSlab } = req.body;
    
    if (!planId || !planName || !planType) {
      return res.status(400).json({ message: 'Plan ID, name, and type are required' });
    }

    // Get driver info
    const driver = await DriverSignup.findById(req.driver.id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Check if driver already has an active selection
    const existingSelection = await DriverPlanSelection.findOne({
      driverSignupId: req.driver.id,
      status: 'active'
    });

    if (existingSelection) {
      // Deactivate previous selection
      existingSelection.status = 'completed';
      await existingSelection.save();
    }

    // Create new selection
    const selection = new DriverPlanSelection({
      driverSignupId: req.driver.id,
      driverUsername: driver.username,
      driverMobile: driver.mobile,
      planId,
      planName,
      planType,
      securityDeposit: securityDeposit || 0,
      rentSlabs: rentSlabs || [],
      selectedRentSlab: selectedRentSlab || null,
      status: 'active'
    });

    await selection.save();

    res.status(201).json({
      message: 'Plan selected successfully',
      selection
    });
  } catch (err) {
    console.error('Create plan selection error:', err);
    res.status(500).json({ message: 'Failed to select plan' });
  }
});

// Update plan selection status
router.put('/:id', authenticateDriver, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const selection = await DriverPlanSelection.findById(req.params.id);
    if (!selection) {
      return res.status(404).json({ message: 'Plan selection not found' });
    }

    // Verify the driver owns this selection
    if (selection.driverSignupId.toString() !== req.driver.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    selection.status = status;
    await selection.save();

    res.json({
      message: 'Plan selection updated successfully',
      selection
    });
  } catch (err) {
    console.error('Update plan selection error:', err);
    res.status(500).json({ message: 'Failed to update plan selection' });
  }
});

// Delete plan selection
router.delete('/:id', authenticateDriver, async (req, res) => {
  try {
    const selection = await DriverPlanSelection.findById(req.params.id);
    if (!selection) {
      return res.status(404).json({ message: 'Plan selection not found' });
    }

    // Verify the driver owns this selection
    if (selection.driverSignupId.toString() !== req.driver.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await DriverPlanSelection.findByIdAndDelete(req.params.id);

    res.json({ message: 'Plan selection deleted successfully' });
  } catch (err) {
    console.error('Delete plan selection error:', err);
    res.status(500).json({ message: 'Failed to delete plan selection' });
  }
});

export default router;
