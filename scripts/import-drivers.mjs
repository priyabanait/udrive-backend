import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { connectDB } from '../db.js';
import Driver from '../models/driver.js';

function normalizeKey(k) {
  return (k || '').toString().trim().toLowerCase();
}

function makeRowMap(row) {
  const map = {};
  for (const k of Object.keys(row)) {
    map[normalizeKey(k)] = row[k];
  }
  return map;
}

function getFirst(rowMap, choices) {
  for (const c of choices) {
    const v = rowMap[normalizeKey(c)];
    if (v !== undefined && v !== null && (v !== '' || v === 0)) return v;
  }
  return undefined;
}

async function main() {
  try {
    const filePath = process.argv[2] || 'E:\\admin Udrive\\driver list.xlsx';

    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      process.exit(1);
    }

    await connectDB();

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    if (!rows || rows.length === 0) {
      console.log('No rows found in sheet');
      process.exit(0);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const rawRow of rows) {
      const r = makeRowMap(rawRow);

      const name = getFirst(r, ['name', 'full name', 'driver name']);
      const email = getFirst(r, ['email', 'e-mail', 'email address']);
      const mobile = getFirst(r, ['mobile', 'phone', 'mobile no', 'contact', 'phone number']);
      const aadharNumber = getFirst(r, ['aadhar', 'aadhaar', 'aadhar no', 'aadhar number']);
      const panNumber = getFirst(r, ['pan', 'pan no', 'pan number']);
      const licenseNumber = getFirst(r, ['license no', 'licence no', 'license number', 'licence number']);
      const joinDate = getFirst(r, ['joined', 'join date', 'joining date', 'joined date']);
      const address = getFirst(r, ['address', 'addr']);
      const city = getFirst(r, ['city']);
      const state = getFirst(r, ['state']);
      const pincode = getFirst(r, ['pincode', 'pin', 'zip']);
      const bankName = getFirst(r, ['bank', 'bank name']);
      const accountNumber = getFirst(r, ['account no', 'account number']);
      const ifscCode = getFirst(r, ['ifsc', 'ifsc code']);
      const employeeId = getFirst(r, ['employee id', 'employeeid', 'emp id']);

      // Skip rows that have no name and no mobile and no email - likely empty
      if (!name && !mobile && !email && !aadharNumber) {
        skipped++;
        continue;
      }

      // Normalize helpers
      const normalizePhone = (p) => {
        if (!p && p !== 0) return undefined;
        const s = String(p).replace(/\D/g, '').trim();
        return s === '' ? undefined : s;
      };
      const normalizeText = (t) => (t === undefined || t === null) ? undefined : String(t).toString().trim();

      const mobileNorm = normalizePhone(mobile);
      const aadharNorm = aadharNumber ? String(aadharNumber).trim() : undefined;
      const panNorm = panNumber ? String(panNumber).trim().toUpperCase() : undefined;
      const emailNorm = email ? String(email).toLowerCase() : undefined;

      const max = await Driver.find().sort({ id: -1 }).limit(1).lean();
      const nextId = (max[0]?.id || 0) + 1;

      const payload = {
        name: normalizeText(name) || undefined,
        email: emailNorm || undefined,
        mobile: mobileNorm || undefined,
        aadharNumber: aadharNorm || undefined,
        panNumber: panNorm || undefined,
        licenseNumber: licenseNumber ? String(licenseNumber).trim() : undefined,
        joinDate: joinDate ? String(joinDate).trim() : undefined,
        address: address ? String(address).trim() : undefined,
        city: city ? String(city).trim() : undefined,
        state: state ? String(state).trim() : undefined,
        pincode: pincode ? String(pincode).trim() : undefined,
        bankName: bankName ? String(bankName).trim() : undefined,
        accountNumber: accountNumber ? String(accountNumber).trim() : undefined,
        ifscCode: ifscCode ? String(ifscCode).trim() : undefined,
        employeeId: employeeId ? String(employeeId).trim() : undefined,
        isManualEntry: true,
        registrationCompleted: true
      };

      // Build search conditions (try multiple fallbacks for phone)
      const conditions = [];
      if (mobileNorm) {
        const last10 = mobileNorm.slice(-10);
        conditions.push({ mobile: mobileNorm });
        conditions.push({ phone: mobileNorm });
        if (last10.length >= 6) {
          conditions.push({ mobile: { $regex: `${last10}$` } });
          conditions.push({ phone: { $regex: `${last10}$` } });
        }
      }
      if (aadharNorm) conditions.push({ aadharNumber: aadharNorm });
      if (panNorm) conditions.push({ panNumber: panNorm });
      if (emailNorm) conditions.push({ email: emailNorm });
      if (employeeId) conditions.push({ employeeId: String(employeeId).trim() });

      // Try to find existing driver
      let existing = null;
      if (conditions.length > 0) {
        existing = await Driver.findOne({ $or: conditions }).lean();
      }

      if (existing) {
        try { await Driver.findByIdAndUpdate(existing._id, { $set: payload }, { new: true }); updated++; }
        catch (err) { console.warn('Failed to update driver', err.message); skipped++; }
      } else {
        const createPayload = { id: nextId, ...payload };
        try { await Driver.create(createPayload); created++; } catch (err) { console.error('Failed to create driver for row:', rawRow); console.error(err.message); skipped++; }
      }
    }

    console.log('Import completed — created:', created, 'updated:', updated, 'skipped:', skipped);
    process.exit(0);
  } catch (err) {
    console.error('Import failed:', err);
    process.exit(1);
  }
}

main();
