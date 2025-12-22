const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: Number,
  category: String,
  type: String, // income or expense
  date: {
    type: Date,
    default: Date.now
  },
  note: String
});

module.exports = mongoose.model('Transaction', TransactionSchema);
