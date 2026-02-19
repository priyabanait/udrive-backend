import express from 'express';
import Vehicle from '../models/vehicle.js';
import Driver from '../models/driver.js';
const router = express.Router();

// GET all vehicles assigned to a driver by phone number or username
router.get('/by-driver-phone/:phone', async (req, res) => {
  try {
    const phone = req.params.phone;
    // Find driver by phone, mobile, or username
    const driver = await Driver.findOne({ 
      $or: [
        { phone },
        { mobile: phone },
        { username: phone }
      ]
    });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    // Find vehicles assigned to this driver
    const vehicles = await Vehicle.find({ assignedDriver: driver._id });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
