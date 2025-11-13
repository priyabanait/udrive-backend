import express from 'express';
import Vehicle from '../models/vehicle.js';
// auth middleware not applied; token used only for login
import { uploadToCloudinary } from '../lib/cloudinary.js';

const router = express.Router();

// Remove any token/auth-related fields from incoming bodies
function stripAuthFields(source) {
  if (!source || typeof source !== 'object') return {};
  const disallowed = new Set(['token', 'authToken', 'accessToken', 'authorization', 'Authorization', 'bearer', 'Bearer']);
  const cleaned = {};
  for (const [k, v] of Object.entries(source)) {
    if (!disallowed.has(k)) cleaned[k] = v;
  }
  return cleaned;
}

// Get all vehicles
router.get('/', async (req, res) => {
  try {
    const list = await Vehicle.find().lean();
    res.json(list);
  } catch (err) {
    console.error('Error fetching vehicles:', err);
    res.status(500).json({ message: 'Failed to fetch vehicles' });
  }
});

// Get a single vehicle by ID
router.get('/:id', async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    const vehicle = await Vehicle.findOne({ vehicleId }).lean();
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.json(vehicle);
  } catch (err) {
    console.error('Error fetching vehicle:', err);
    res.status(500).json({ message: 'Failed to fetch vehicle' });
  }
});

// Create a new vehicle
router.post('/', async (req, res) => {
  try {
    if (!req.body.registrationNumber) {
      return res.status(400).json({ message: 'Registration number is required' });
    }

    const body = stripAuthFields(req.body);
    let vehicleData = {
      status: 'inactive',
      kycStatus: 'pending',
      ...body
    };

    // Normalize and coerce basic types
    vehicleData.registrationNumber = (vehicleData.registrationNumber || '').toString().trim();
    if (vehicleData.year != null) vehicleData.year = Number(vehicleData.year);
    if (vehicleData.trafficFine != null) vehicleData.trafficFine = Number(vehicleData.trafficFine);

    const documentFields = ['insuranceDoc', 'rcDoc', 'permitDoc', 'pollutionDoc', 'fitnessDoc'];
    // Newly supported photo fields from UI
    const photoFields = [
      'registrationCardPhoto',
      'roadTaxPhoto',
      'pucPhoto',
      'permitPhoto',
      'carFrontPhoto',
      'carLeftPhoto',
      'carRightPhoto',
      'carBackPhoto',
      'carFullPhoto'
    ];
    const uploadedDocs = {};

    // Upload documents if provided as base64
    for (const field of documentFields) {
      if (vehicleData[field] && vehicleData[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(
            vehicleData[field],
            `vehicles/${vehicleData.registrationNumber}/${field}`
          );
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
        // prevent saving raw base64 if present
        delete vehicleData[field];
      }
    }

    // Upload new photo fields if provided as base64
    for (const field of photoFields) {
      if (vehicleData[field] && typeof vehicleData[field] === 'string' && vehicleData[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(
            vehicleData[field],
            `vehicles/${vehicleData.registrationNumber}/${field}`
          );
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
        // prevent saving raw base64 if present
        delete vehicleData[field];
      }
    }

    // Generate next vehicleId
    const latestVehicle = await Vehicle.findOne({}).sort({ vehicleId: -1 });
    const nextVehicleId = (latestVehicle?.vehicleId || 0) + 1;

    const vehicle = new Vehicle({
      ...vehicleData,
      ...uploadedDocs,
      vehicleId: nextVehicleId
    });

    const savedVehicle = await vehicle.save();
    res.status(201).json(savedVehicle);
  } catch (err) {
    console.error('Error creating vehicle:', err);
    if (err && (err.code === 11000 || err.code === '11000')) {
      return res.status(409).json({ message: 'Duplicate registration number' });
    }
    res.status(500).json({ message: err?.message || 'Failed to create vehicle' });
  }
});

// Update a vehicle
router.put('/:id', async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    const updates = stripAuthFields(req.body);

    // Normalize/coerce
    if (updates.registrationNumber) updates.registrationNumber = String(updates.registrationNumber).trim();
    if (updates.year != null) updates.year = Number(updates.year);
    if (updates.trafficFine != null) updates.trafficFine = Number(updates.trafficFine);

    const documentFields = ['insuranceDoc', 'rcDoc', 'permitDoc', 'pollutionDoc', 'fitnessDoc'];
    const photoFields = [
      'registrationCardPhoto',
      'roadTaxPhoto',
      'pucPhoto',
      'permitPhoto',
      'carFrontPhoto',
      'carLeftPhoto',
      'carRightPhoto',
      'carBackPhoto',
      'carFullPhoto'
    ];
    const uploadedDocs = {};

    // Upload new documents if base64 data is sent
    for (const field of documentFields) {
      if (updates[field] && updates[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(updates[field], `vehicles/${vehicleId}/${field}`);
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
        delete updates[field];
      }
    }

    // Upload new photo fields if base64 data is sent
    for (const field of photoFields) {
      if (updates[field] && typeof updates[field] === 'string' && updates[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(updates[field], `vehicles/${vehicleId}/${field}`);
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
        delete updates[field];
      }
    }

    const vehicle = await Vehicle.findOneAndUpdate(
      { vehicleId },
      { ...updates, ...uploadedDocs },
      { new: true }
    ).lean();

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json(vehicle);
  } catch (err) {
    console.error('Error updating vehicle:', err);
    if (err && (err.code === 11000 || err.code === '11000')) {
      return res.status(409).json({ message: 'Duplicate registration number' });
    }
    res.status(500).json({ message: err?.message || 'Failed to update vehicle' });
  }
});

// Delete a vehicle
router.delete('/:id', async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    const result = await Vehicle.deleteOne({ vehicleId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    console.error('Error deleting vehicle:', err);
    res.status(500).json({ message: 'Failed to delete vehicle' });
  }
});

export default router;