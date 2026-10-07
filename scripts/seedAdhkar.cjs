// Seeds the classic morning/evening adhkar and distress duas from Hisn al-Muslim
// into the duas table. Qur'anic texts are pulled verbatim from the ayahs table
// (with the Clear Quran translation) so the Arabic always matches the mushaf data.
// Run against local:  node scripts/seedAdhkar.cjs
// Run against Neon:   DATABASE_URL=<neon-url> node scripts/seedAdhkar.cjs
require('dotenv').config();
// Connection layer: use the Neon serverless driver (HTTPS, port 443) for hosted
// Neon URLs (works from restricted networks), plain pg for local Postgres.
const db = (() => {
  const url = process.env.DATABASE_URL || '';
  if (url.includes('neon.tech')) {
    const { Pool: NeonPool } = require('@neondatabase/serverless');
    const pool = new NeonPool({ connectionString: url });
    return { query: (t, p) => pool.query(t, p) };
  }
  const { Pool: PgPool } = require('pg');
  const pool = new PgPool({ connectionString: url });
  return { query: (t, p) => pool.query(t, p) };
})();

// ---- Qur'an-sourced entries: { ranges: [[surah, from, to], ...] } ----
// ---- Hadith-sourced entries: literal arabic ----
const CATS = {
  morning: 'Morning Remembrance',
  evening: 'Evening Remembrance',
  distress: 'Times of Distress',
  fright: "What to say when you feel frightened",
};

const morningShared = [
  { title: 'Ayat al-Kursi for protection (morning and evening)', quran: [[2, 255, 255]],
    note: 'Whoever recites it in the morning is protected until evening, and whoever recites it in the evening is protected until morning.',
    ref: "Al-Baqarah 2:255; An-Nasa'i, Al-Kubra — recited morning and evening" },
  { title: 'The three protective surahs: Al-Ikhlas, Al-Falaq, An-Nas (three times)',
    quran: [[112, 1, 4], [113, 1, 5], [114, 1, 6]],
    note: 'Recite each surah three times in the morning and evening; they will protect you from every harm.',
    ref: 'Abu Dawud 5082; At-Tirmidhi 3575' },
  { title: 'Sayyid al-Istighfar: the master supplication for forgiveness',
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي، فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    tr: "Allahumma anta rabbi la ilaha illa ant, khalaqtani wa ana 'abduka, wa ana 'ala 'ahdika wa wa'dika ma-stita'tu, a'udhu bika min sharri ma sana'tu, abu'u laka bini'matika 'alayya, wa abu'u laka bidhanbi, faghfir li, fa-innahu la yaghfirudh-dhunuba illa ant",
    en: 'O Allah, You are my Lord, there is no god but You. You created me and I am Your slave, and I keep Your covenant and promise as much as I am able. I seek refuge in You from the evil of what I have done. I acknowledge Your favor upon me, and I acknowledge my sin, so forgive me, for none forgives sins except You.',
    ref: 'Al-Bukhari 6306 — recited morning and evening' },
  { title: 'Asking Allah for wellbeing (three times)',
    arabic: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ',
    tr: "Allahumma 'afini fi badani, Allahumma 'afini fi sam'i, Allahumma 'afini fi basari, la ilaha illa ant",
    en: 'O Allah, grant my body wellbeing; O Allah, grant my hearing wellbeing; O Allah, grant my sight wellbeing. There is no god but You.',
    ref: 'Abu Dawud 5090 — three times morning and evening' },
  { title: 'Contentment with Allah as Lord, Islam as religion, and Muhammad ﷺ as Prophet (three times)',
    arabic: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا',
    tr: 'Raditu billahi rabban, wal-islami dinan, wa bi Muhammadin ﷺ nabiyya',
    en: 'I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad ﷺ as my Prophet.',
    ref: 'Abu Dawud 5072; At-Tirmidhi 3384 — three times morning and evening' },
  { title: 'Reliance upon the Lord of the Mighty Throne (seven times)',
    arabic: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    tr: "Hasbiya-llahu la ilaha illa Huw, 'alayhi tawakkaltu, wa Huwa Rabbu-l-'Arshi-l-'Azim",
    en: 'Allah is sufficient for me; there is no god but Him. In Him I place my trust, and He is the Lord of the Mighty Throne.',
    ref: "At-Tawbah 9:129; Abu Dawud 5081 — seven times morning and evening" },
  { title: 'Protection by the name of Allah (three times)',
    arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    tr: "Bismi-llahi-lladhi la yadurru ma\'a-smihi shay\'un fi-l-ardi wa la fi-s-sama\', wa Huwa-s-Sami\'u-l-\'Alim",
    en: 'In the name of Allah, with whose name nothing on earth or in heaven can cause harm; and He is the All-Hearing, the All-Knowing.',
    ref: 'Abu Dawud 5088; At-Tirmidhi 3388 — three times morning and evening' },
  { title: 'Tasbih one hundred times',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    tr: 'Subhana-llahi wa bi-hamdihi',
    en: 'Glory be to Allah and praise be to Him.',
    ref: 'Muslim 2692 — one hundred times morning and evening; he will be forgiven though his sins were like the foam of the sea' },
  { title: 'The tahlil (ten or one hundred times)',
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    tr: "La ilaha illa-llahu wahdahu la sharika lah, lahu-l-mulku wa lahu-l-hamdu wa Huwa \'ala kulli shay\'in qadir",
    en: 'There is no god but Allah alone, without partner. To Him belongs the dominion and to Him belongs all praise, and He is capable of all things.',
    ref: 'Al-Bukhari 3293; At-Tirmidhi 3474 — ten times morning and evening earn the reward of freeing a slave' },
  { title: 'Seeking help through the mercy of the Ever-Living Sustainer',
    arabic: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي',
    tr: "Ya Hayyu ya Qayyum, bi-rahmatika astaghith, aslih li sha\'ni kullahu, wa la takilni ila nafsi",
    en: 'O Ever-Living, O Sustainer, by Your mercy I seek help. Set right all my affairs, and do not leave me to myself even for the blink of an eye.',
    ref: "Al-Hakim, Al-Mustadrak; An-Nasa'i (Al-Kubra) — recited morning and evening" },
  { title: 'Tasbih outweighing the creation (three times)',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ',
    tr: "Subhana-llahi wa bi-hamdihi, 'adada khalqihi, wa rida nafsihi, wa zinata 'arshihi, wa midada kalimatihi",
    en: 'Glory be to Allah and praise be to Him, as many times as the number of His creation, as much as pleases Him, as weighty as His Throne, and as vast as the ink of His words.',
    ref: 'Muslim 2726 — three times morning and evening' },
];

const morningOnly = [
  { title: "Remembrance of Allah's dominion upon arising in the morning",
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ',
    tr: "Asbahna wa asbaha-l-mulku li-llah, wa-l-hamdu li-llah, la ilaha illa-llahu wahdahu la sharika lah, lahu-l-mulku wa lahu-l-hamdu wa Huwa \'ala kulli shay\'in qadir. Rabbi as\'aluka khayra ma fi hadha-l-yawmi wa khayra ma ba\'dah, wa a\'udhu bika min sharri ma fi hadha-l-yawmi wa sharri ma ba\'dah",
    en: 'We have entered the morning and with it all sovereignty belongs to Allah, and all praise is for Allah. There is no god but Allah alone, without partner; to Him belongs the dominion and to Him belongs all praise, and He is capable of all things. My Lord, I ask You for the good of this day and what follows it, and I seek refuge in You from its evil and the evil of what follows it.',
    ref: 'Muslim 2723' },
  { title: 'By Your power we enter the morning',
    arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
    tr: 'Allahumma bika asbahna, wa bika amsayna, wa bika nahya, wa bika namut, wa ilayka-n-nushur',
    en: 'O Allah, by You we enter the morning, by You we enter the evening, by You we live and by You we die, and to You is the resurrection.',
    ref: 'At-Tirmidhi 3391' },
  { title: 'Gratitude for every blessing that comes with the morning',
    arabic: 'اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ',
    tr: "Allahumma ma asbaha bi min ni\'matin aw bi ahadin min khalqika fa-minka wahdaka la sharika lak, wa laka-l-hamdu wa laka-sh-shukr",
    en: 'O Allah, whatever blessing has come to me or to any of Your creation this morning is from You alone, without partner. To You belongs all praise and gratitude.',
    ref: 'Abu Dawud 5073' },
];

const eveningOnly = [
  { title: "Remembrance of Allah's dominion upon entering the evening",
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا',
    tr: "Amsayna wa amsa-l-mulku li-llah, wa-l-hamdu li-llah, la ilaha illa-llahu wahdahu la sharika lah, lahu-l-mulku wa lahu-l-hamdu wa Huwa \'ala kulli shay\'in qadir. Rabbi as\'aluka khayra ma fi hadhihi-l-laylati wa khayra ma ba\'daha, wa a\'udhu bika min sharri ma fi hadhihi-l-laylati wa sharri ma ba\'daha",
    en: 'We have entered the evening and with it all sovereignty belongs to Allah, and all praise is for Allah. There is no god but Allah alone, without partner; to Him belongs the dominion and to Him belongs all praise, and He is capable of all things. My Lord, I ask You for the good of this night and what follows it, and I seek refuge in You from its evil and the evil of what follows it.',
    ref: 'Muslim 2723' },
  { title: 'By Your power we enter the evening',
    arabic: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ',
    tr: 'Allahumma bika amsayna, wa bika asbahna, wa bika nahya, wa bika namut, wa ilayka-l-masir',
    en: 'O Allah, by You we enter the evening, by You we enter the morning, by You we live and by You we die, and to You is the final return.',
    ref: 'At-Tirmidhi 3392' },
  { title: 'Gratitude for every blessing that comes with the evening',
    arabic: 'اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ',
    tr: "Allahumma ma amsa bi min ni\'matin aw bi ahadin min khalqika fa-minka wahdaka la sharika lak, wa laka-l-hamdu wa laka-sh-shukr",
    en: 'O Allah, whatever blessing has come to me or to any of Your creation this evening is from You alone, without partner. To You belongs all praise and gratitude.',
    ref: 'Abu Dawud 5073' },
];

const distress = [
  { title: 'The prayer of Dhun-Nun (Yunus, peace be upon him)',
    quran: [[21, 87, 87]],
    note: 'Whoever calls upon Allah with these words is answered.',
    ref: "Al-Anbiya 21:87; At-Tirmidhi 3505" },
  { title: 'Allah is sufficient for us and He is the best disposer of affairs',
    quran: [[3, 173, 173]],
    note: 'Said by Ibrahim, peace be upon him, when thrown into the fire, and by Muhammad ﷺ when the hypocrites warned of the enemy.',
    ref: 'Al-Imran 3:173; Al-Bukhari 4563' },
  { title: 'Prayer upon being struck by calamity',
    arabic: 'إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ، اللَّهُمَّ أْجُرْنِي فِي مُصِيبَتِي، وَأَخْلِفْ لِي خَيْرًا مِنْهَا',
    tr: "Inna li-llahi wa inna ilayhi raji\'un. Allahumma\'jurni fi musibati, wa akhlif li khayran minha",
    en: 'To Allah we belong and to Him we return. O Allah, reward me for my affliction and replace it with something better.',
    ref: 'Muslim 918' },
  { title: "Placing one's hope in Allah's mercy alone",
    arabic: 'اللَّهُمَّ رَحْمَتَكَ أَرْجُو، فَلَا تَكِلْنِي إِلَى نَفْسِي، وَأَصْلِحْ لِي شَأْنِي كُلَّهُ، لَا إِلَهَ إِلَّا أَنْتَ',
    tr: "Allahumma rahmataka arju, fa-la takilni ila nafsi, wa aslih li sha\'ni kullahu, la ilaha illa ant",
    en: 'O Allah, I hope for Your mercy; do not leave me to myself. Set right all my affairs. There is no god but You.',
    ref: 'Ibn Majah 3819' },
  { title: 'Refuge from anxiety, grief, weakness and debt',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ، وَغَلَبَةِ الرِّجَالِ',
    tr: "Allahumma inni a\'udhu bika mina-l-hammi wa-l-hazan, wa-l-\'ajzi wa-l-kasal, wa-l-bukhli wa-l-jubn, wa dala\'i-d-dayn, wa ghalabati-r-rijal",
    en: 'O Allah, I seek refuge in You from anxiety and grief, from weakness and laziness, from miserliness and cowardice, from the burden of debt and from being overpowered by others.',
    ref: 'Al-Bukhari 6369; Abu Dawud 1555' },
  { title: 'There is no might nor power except with Allah',
    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    tr: 'La hawla wa la quwwata illa bi-llah',
    en: 'There is no might and no power except with Allah. It is one of the treasures of Paradise.',
    ref: "Al-Bukhari 4205; Abu Dawud — from Abu Musa al-Ash\'ari" },
];

const fright = [
  { title: 'Protection from every direction',
    arabic: 'اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ، وَمِنْ خَلْفِي، وَعَنْ يَمِينِي، وَعَنْ شِمَالِي، وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي',
    tr: "Allahumma-h-fazni min bayni yadayya, wa min khalfi, wa \'an yamini, wa \'an shimili, wa min fawqi, wa a\'udhu bi-\'azamatika an ughtala min tahti",
    en: 'O Allah, protect me from in front of me and behind me, from my right and my left, and from above me; and I seek refuge in Your greatness from being seized from beneath me.',
    ref: 'Abu Dawud 5084' },
  { title: 'Placing the feared enemy before Allah',
    arabic: 'اللَّهُمَّ إِنَّا نَجْعَلُكَ فِي نُحُورِهِمْ، وَنَعُوذُ بِكَ مِنْ شُرُورِهِمْ',
    tr: "Allahumma inna naj\'aluka fi nuhur him, wa na\'udhu bika min shururi him",
    en: 'O Allah, we place You before them (as a shield), and we seek refuge in You from their evils.',
    ref: 'Abu Dawud; Hisn al-Muslim' },
];

async function fetchQuran(ranges) {
  const arabicParts = [];
  const englishParts = [];
  for (const [s, from, to] of ranges) {
    const a = await db.query(
      `SELECT text_arabic FROM ayahs WHERE surah_number = $1 AND ayah_number BETWEEN $2 AND $3 ORDER BY ayah_number`,
      [s, from, to]
    );
    arabicParts.push(a.rows.map((r) => r.text_arabic).join(' '));
    const e = await db.query(
      `SELECT at.text FROM ayah_translations at JOIN translations t ON t.id = at.translation_id
       WHERE t.code = 'en.clearquran' AND at.ayah_id IN
         (SELECT id FROM ayahs WHERE surah_number = $1 AND ayah_number BETWEEN $2 AND $3)
       ORDER BY (SELECT ayah_number FROM ayahs WHERE id = at.ayah_id)`,
      [s, from, to]
    );
    englishParts.push(e.rows.map((r) => r.text).join(' '));
  }
  return { arabic: arabicParts.join(' ۞ '), english: englishParts.join(' ') };
}

async function insert(entry, categoryId) {
  const exists = await db.query(
    'SELECT id FROM duas WHERE category_id = $1 AND title = $2',
    [categoryId, entry.title]
  );
  if (exists.rows.length) return 'skipped';

  let arabic, transliteration, translation;
  if (entry.quran) {
    const q = await fetchQuran(entry.quran);
    arabic = q.arabic;
    transliteration = null;
    translation = q.english + (entry.note ? ' (' + entry.note + ')' : '');
  } else {
    arabic = entry.arabic;
    transliteration = entry.tr;
    translation = entry.en;
  }
  await db.query(
    `INSERT INTO duas (category_id, title, text_arabic, transliteration, translation, reference)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [categoryId, entry.title, arabic, transliteration, translation, entry.ref]
  );
  return 'inserted';
}

async function seed() {
  const catIds = {};
  for (const [key, name] of Object.entries(CATS)) {
    const r = await db.query('SELECT id FROM dua_categories WHERE name = $1', [name]);
    if (!r.rows.length) throw new Error('Category not found: ' + name);
    catIds[key] = r.rows[0].id;
  }

  const plan = [
    ['morning', [...morningShared, ...morningOnly]],
    ['evening', [...morningShared, ...eveningOnly]],
    ['distress', distress],
    ['fright', fright],
  ];

  for (const [key, entries] of plan) {
    let inserted = 0, skipped = 0;
    for (const e of entries) {
      const r = await insert(e, catIds[key]);
      if (r === 'inserted') inserted++; else skipped++;
    }
    console.log(`${key}: ${inserted} inserted, ${skipped} already present`);
  }

  const count = await db.query('SELECT category_id, count(*) c FROM duas GROUP BY category_id ORDER BY c DESC LIMIT 1');
  const total = await db.query('SELECT count(*) c FROM duas');
  console.log(`Total duas now: ${total.rows[0].c}`);
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
