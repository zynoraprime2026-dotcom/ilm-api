const express = require('express');
const router = express.Router();
const adhan = require('adhan');

// Ghana-first city coordinates (expand freely; lat/lng always overrides)
const CITIES = {
  tarkwa: { lat: 5.3047, lng: -2.0064 },
  accra: { lat: 5.6037, lng: -0.187 },
  takoradi: { lat: 4.8946, lng: -1.7554 },
  kumasi: { lat: 6.6885, lng: -1.5313 },
  tema: { lat: 5.6698, lng: -0.0166 },
  'cape coast': { lat: 5.1315, lng: -1.279 },
  sekondi: { lat: 4.9333, lng: -1.75 },
  tamale: { lat: 9.4032, lng: -0.8425 },
  bolgatanga: { lat: 10.7854, lng: -0.8514 },
  sunyani: { lat: 7.3349, lng: -2.3268 },
  koforidua: { lat: 6.0941, lng: -0.2591 },
  ho: { lat: 6.6101, lng: 0.4713 },
  wa: { lat: 10.0601, lng: -2.5099 },
  makkah: { lat: 21.4225, lng: 39.8262 },
  madinah: { lat: 24.4686, lng: 39.6142 },
};

// GET /v1/prayer-times?city=Tarkwa&date=2026-07-15&method=MuslimWorldLeague
// GET /v1/prayer-times?lat=5.3&lng=-2.0&date=2026-07-15
router.get('/', (req, res) => {
  const { city, lat, lng, date, method } = req.query;

  let latitude = Number(lat);
  let longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    const known = city && CITIES[String(city).trim().toLowerCase()];
    if (!known) {
      return res.status(400).json({ error: 'lat and lng query params are required, or a supported city name (e.g. city=Tarkwa)' });
    }
    latitude = known.lat;
    longitude = known.lng;
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
    city: city ? String(city).trim() : undefined,
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
