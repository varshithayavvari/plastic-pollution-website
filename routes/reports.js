const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Report = require('../models/Report');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter (accept images only)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// POST /api/reports - Create a report (Authenticated users)
router.post('/', auth, upload.single('image'), async (req, res) => {
  const { latitude, longitude, wasteType, phoneNumber } = req.body;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image of the waste' });
    }
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'GPS coordinates (latitude, longitude) are required' });
    }
    if (!wasteType) {
      return res.status(400).json({ message: 'Please specify the waste type' });
    }
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Please provide a contact phone number' });
    }

    const newReport = new Report({
      imageUrl: `/uploads/${req.file.filename}`,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      wasteType,
      phoneNumber,
      reportedBy: req.user.id
    });

    const savedReport = await newReport.save();
    res.status(201).json(savedReport);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// GET /api/reports - Get reports (Authenticated users)
// Admin sees all reports, Users see only their own reports
router.get('/', auth, async (req, res) => {
  try {
    let reports;
    if (req.user.role === 'admin') {
      reports = await Report.find()
        .populate('reportedBy', 'username')
        .sort({ createdAt: -1 });
    } else {
      reports = await Report.find({ reportedBy: req.user.id })
        .populate('reportedBy', 'username')
        .sort({ createdAt: -1 });
    }
    res.json(reports);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// PUT /api/reports/:id - Update report status (Admin only)
router.put('/:id', auth, async (req, res) => {
  const { status } = req.body;

  // Verify admin status
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Administrator privileges required' });
  }

  if (!status || !['Pending', 'Cleaned'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    let report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.status = status;
    await report.save();

    // Populate user reference
    report = await Report.findById(req.params.id).populate('reportedBy', 'username');

    res.json(report);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;
