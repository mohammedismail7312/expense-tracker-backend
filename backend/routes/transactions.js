const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// GET all transactions for logged-in user
router.get('/', async (req, res) => {
  try {
    const tx = await Transaction.find({ userId: req.userId }).sort({ date: -1 });
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add transaction for logged-in user
router.post('/', async (req, res) => {
  try {
    const tx = new Transaction({
      ...req.body,
      userId: req.userId
    });
    await tx.save();
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE transaction (only if owned by user)
router.delete('/:id', async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id);
    
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (tx.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this transaction' });
    }

    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
