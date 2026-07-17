const express = require('express');
const router = express.Router();
const adhan = require('adhan');

// GET /v1/prayer-times?lat=21.4225&lng=39.8262&date=2026-07-15&method=MuslimWorldLeague
router.get('/', (req, res) => {
  const { lat, lng, date, method } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng query params are required' });
  }

  const coordinates = new adhan.Coordinates(parseFloat(lat), parseFloat(lng));
  const targetDate = date ? new Date(date) : new Date();

  // Available methods: MuslimWorldLeague, Egyptian, Karachi, UmmAlQura,
  // Dubai, MoonsightingCommittee, NorthAmerica (ISNA), Kuwait, Qatar, Singapore, Tehran, Turkey
  const methodName = method || 'MuslimWorldLeague';
  const params = adhan.CalculationMethod[methodName]
    ? adhan.CalculationMethod[methodName]()
    : adhan.CalculationMethod.MuslimWorldLeague();

  const prayerTimes = new adhan.PrayerTimes(coordinates, targetDate, params);

  res.json({
    date: targetDate.toISOString().split('T')[0],
    coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
    method: methodName,
    times: {
      fajr: prayerTimes.fajr,
      sunrise: prayerTimes.sunrise,
      dhuhr: prayerTimes.dhuhr,
      asr: prayerTimes.asr,
      maghrib: prayerTimes.maghrib,
      isha: prayerTimes.isha,
    },
  });
});

module.exports = router;
