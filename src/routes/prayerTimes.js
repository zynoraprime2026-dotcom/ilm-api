const express = require('express');
const router = express.Router();
const adhan = require('adhan');

// GET /v1/prayer-times?lat=21.4225&lng=39.8262&date=2026-07-15&method=MuslimWorldLeague
router.get('/', (req, res) => {
  const { lat, lng, date, method } = req.query;

  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ error: 'lat and lng query params are required' });
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'lat must be between -90 and 90 and lng between -180 and 180' });
  }

  const targetDate = date ? new Date(date) : new Date();
  if (Number.isNaN(targetDate.getTime())) {
    return res.status(400).json({ error: 'date must be a valid date in YYYY-MM-DD format' });
  }

  // Available methods: MuslimWorldLeague, Egyptian, Karachi, UmmAlQura,
  // Dubai, MoonsightingCommittee, NorthAmerica (ISNA), Kuwait, Qatar, Singapore, Tehran, Turkey
  const methodName = method || 'MuslimWorldLeague';
  if (!adhan.CalculationMethod[methodName]) {
    return res.status(400).json({ error: `Unknown calculation method: ${methodName}` });
  }

  const coordinates = new adhan.Coordinates(latitude, longitude);
  const params = adhan.CalculationMethod[methodName]();

  const prayerTimes = new adhan.PrayerTimes(coordinates, targetDate, params);

  res.json({
    date: targetDate.toISOString().split('T')[0],
    coordinates: { lat: latitude, lng: longitude },
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
