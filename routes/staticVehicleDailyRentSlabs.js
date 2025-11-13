import express from 'express';

const router = express.Router();

// Static vehicle daily rent slabs
let vehicleDailyRentSlabs = {
  'Tata Ace': {
    securityDeposit: 5000,
    rows: [
      { trips: '1', rentDay: 1200, weeklyRent: 8400, accidentalCover: 105, acceptanceRate: 60 },
      { trips: '2', rentDay: 1150, weeklyRent: 8050, accidentalCover: 105, acceptanceRate: 60 },
      { trips: '3', rentDay: 1100, weeklyRent: 7700, accidentalCover: 105, acceptanceRate: 60 },
      { trips: '4', rentDay: 1050, weeklyRent: 7350, accidentalCover: 105, acceptanceRate: 60 },
      { trips: '5', rentDay: 1000, weeklyRent: 7000, accidentalCover: 105, acceptanceRate: 60 }
    ]
  },
  'Bolero Pickup': {
    securityDeposit: 6000,
    rows: [
      { trips: '1', rentDay: 1300, weeklyRent: 9100, accidentalCover: 105, acceptanceRate: 60 },
      { trips: '2', rentDay: 1250, weeklyRent: 8750, accidentalCover: 105, acceptanceRate: 60 },
      { trips: '3', rentDay: 1200, weeklyRent: 8400, accidentalCover: 105, acceptanceRate: 60 },
      { trips: '4', rentDay: 1150, weeklyRent: 8050, accidentalCover: 105, acceptanceRate: 60 },
      { trips: '5', rentDay: 1100, weeklyRent: 7700, accidentalCover: 105, acceptanceRate: 60 }
    ]
  },
  'Eicher': {
    securityDeposit: 8000,
    rows: [
      { trips: '1', rentDay: 1500, weeklyRent: 10500, accidentalCover: 105, acceptanceRate: 60 },
      { trips: '2', rentDay: 1450, weeklyRent: 10150, accidentalCover: 105, acceptanceRate: 60 },
      { trips: '3', rentDay: 1400, weeklyRent: 9800, accidentalCover: 105, acceptanceRate: 60 },
      { trips: '4', rentDay: 1350, weeklyRent: 9450, accidentalCover: 105, acceptanceRate: 60 },
      { trips: '5', rentDay: 1300, weeklyRent: 9100, accidentalCover: 105, acceptanceRate: 60 }
    ]
  }
};

router.get('/', (req, res) => {
  res.json(vehicleDailyRentSlabs);
});

// PUT - Update a specific vehicle daily rent plan
router.put('/:vehicleName', (req, res) => {
  try {
    const { vehicleName } = req.params;
    const { securityDeposit, rows } = req.body;
    
    if (!vehicleDailyRentSlabs[vehicleName]) {
      return res.status(404).json({ error: 'Vehicle daily rent plan not found' });
    }
    
    // Update the vehicle daily rent plan
    vehicleDailyRentSlabs[vehicleName] = {
      securityDeposit: securityDeposit ?? vehicleDailyRentSlabs[vehicleName].securityDeposit,
      rows: rows ?? vehicleDailyRentSlabs[vehicleName].rows
    };
    
    res.json(vehicleDailyRentSlabs[vehicleName]);
  } catch (error) {
    console.error('Error updating vehicle daily rent plan:', error);
    res.status(400).json({ error: 'Failed to update vehicle daily rent plan', message: error.message });
  }
});

export default router;
