import express from 'express';
import { getExchangeRates, SUPPORTED_CURRENCIES } from '../services/currencyService.js';

const router = express.Router();

/**
 * GET /api/currency/rates
 * Returns exchange rates against base currency INR for supported currencies.
 */
router.get('/rates', async (req, res) => {
  try {
    const rateData = await getExchangeRates();
    res.json({
      success: true,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      ...rateData
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve exchange rates',
      message: err.message
    });
  }
});

export default router;
