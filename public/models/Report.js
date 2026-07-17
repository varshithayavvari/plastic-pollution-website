const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: [true, 'Image is required']
  },
  latitude: {
    type: Number,
    required: [true, 'Latitude is required']
  },
  longitude: {
    type: Number,
    required: [true, 'Longitude is required']
  },
  wasteType: {
    type: String,
    required: [true, 'Waste type is required'],
    enum: ['Plastic', 'Organic', 'E-Waste', 'Paper', 'Glass', 'Metal', 'Hazardous', 'General']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required']
  },
  status: {
    type: String,
    enum: ['Pending', 'Cleaned'],
    default: 'Pending'
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', ReportSchema);
