// Fiqh comparative rulings — Part 2: Zakah, Sawm (Fasting), Hajj.
// Same sourcing standard as Part 1.
module.exports = [
  // ================= ZAKAH =================
  {
    chapter: 'Zakah',
    topic: 'The nisab (minimum threshold) for zakah',
    question: 'How much wealth must one hold before zakah is due?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Zakah is due on gold at 20 dinars (85 grams) and silver at 200 dirhams (595 grams), held for a full lunar year. Below the nisab of either metal, no zakah is due.', reference: 'Al-Mughni (Ibn Qudamah); Al-Hidayah', evidence: 'Hadith: "No zakah is due on less than five camels, or less than five wasaq of dates, or less than five awsuq of silver" — Bukhari & Muslim' },
    ],
  },
  {
    chapter: 'Zakah',
    topic: 'The rate of zakah on money and trade goods',
    question: 'What percentage of zakah is due on savings and business inventory?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Two and a half percent (2.5%) per lunar year on gold, silver, cash, and trade goods valued at market rate, once the nisab is met.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Quran 9:103: "Take from their wealth a charity"; hadith of Mu\'adh sent to Yemen: "on silver, a quarter of the tenth" — Bukhari' },
    ],
  },
  {
    chapter: 'Zakah',
    topic: 'Zakah on gold jewelry worn by women',
    question: 'Is zakah due on gold or silver jewelry that is worn?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Zakah is due on all gold and silver jewelry, worn or stored; ornament does not change its status as wealth.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Shafi\'i', ruling: 'No zakah on jewelry kept for permissible adornment or lending; zakah is due on jewelry kept for trade or hoarding.', reference: 'Minhaj al-Talibin (al-Nawawi)' },
      { madhab: 'Maliki', ruling: 'Zakah is due on jewelry prepared for women\'s use, after a year passes over it.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'No zakah on permissible jewelry in normal amounts; excessive amounts remain zakah-able.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Zakah',
    topic: 'Paying zakat al-fitr in cash',
    question: 'May the Eid al-Fitr charity be paid as money instead of food?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Permitted to pay its monetary value instead of the staple food.', reference: 'Al-Hidayah (al-Marghinani); Radd al-Muhtar (Ibn Abidin)' },
      { madhab: 'Shafi\'i', ruling: 'It must be paid as the staple food of the land (a sa\'); cash does not suffice.', reference: 'Minhaj al-Talibin (al-Nawawi)', evidence: 'Hadith of Ibn Umar: "a sa\' of dates or a sa\' of barley" — Bukhari & Muslim' },
      { madhab: 'Maliki', ruling: 'Must be paid as food; value is not sufficient.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Food is required per the texts; the value does not suffice.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Zakah',
    topic: 'Zakah on agricultural produce',
    question: 'What zakah is due on crops?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'One-tenth (10%) on rain-fed or naturally irrigated crops and one-twentieth (5%) on artificially irrigated crops, once the crop reaches five wasaq (roughly 653 kg).', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith: "On what the sky waters, a tenth; on what is irrigated, a twentieth" — Bukhari' },
      { madhab: 'Hanafi', ruling: 'Applies to all cultivated produce, edible or not; the year does not lapse.' },
      { madhab: 'Shafi\'i', ruling: 'Restricted to staple, storable foods; fruits and vegetables outside this are not zakah-able.' },
      { madhab: 'Maliki', ruling: 'Applies to staple produce in common use that can be stored.' },
      { madhab: 'Hanbali', ruling: 'Applies to staple, measurable, storable crops.' },
    ],
  },
  {
    chapter: 'Zakah',
    topic: 'Giving zakah to relatives',
    question: 'To which relatives may zakah be given?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Zakah cannot be given to one\'s parents, grandparents, children, or grandchildren (the line one is obliged to support); other relatives — siblings, uncles, poor relatives — may receive it, and giving it to them carries the reward of charity plus maintaining family ties.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith: "Charity to the poor is charity, and to a relative is two: charity and maintaining ties" — al-Nasa\'i' },
    ],
  },

  // ================= SAWM =================
  {
    chapter: 'Fasting (Sawm)',
    topic: 'Intention for the Ramadan fast',
    question: 'When must the intention for fasting be made?',
    rows: [
      { madhab: 'Hanafi', ruling: 'A single intention at the beginning of Ramadan for the whole month suffices, since it is one continuous act of worship.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Shafi\'i', ruling: 'The intention must be made each night for the following day\'s fast, before dawn.', reference: 'Minhaj al-Talibin (al-Nawawi)', evidence: 'Hadith: "Whoever does not resolve the fast before dawn has no fast" — al-Tirmidhi, al-Nasa\'i' },
      { madhab: 'Maliki', ruling: 'Intention each night is required for the obligatory fast.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Intention is required each night, from sunset until dawn.' },
    ],
  },
  {
    chapter: 'Fasting (Sawm)',
    topic: 'The end of suhoor and breaking the fast',
    question: 'When does the pre-dawn meal end, and when is the fast broken?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Eating and drinking are permitted until true dawn (fajr as-sadiq), and the fast is broken at sunset (maghrib).', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Quran 2:187; hadith of Adi ibn Hatim on the two dawns — Bukhari & Muslim; hadith of Sahl ibn Sa\'d on hastening iftar — Bukhari & Muslim' },
    ],
  },
  {
    chapter: 'Fasting (Sawm)',
    topic: 'The traveler\'s fast in Ramadan',
    question: 'May the traveler fast Ramadan while traveling?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'The traveler may fast or break the fast; whoever fasts must complete it, and whoever breaks it must make the day up later.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith of Anas: "We traveled with the Prophet in Ramadan; some fasted and some did not..." — Bukhari & Muslim; Quran 2:185' },
    ],
  },
  {
    chapter: 'Fasting (Sawm)',
    topic: 'Expiation (kaffarah) for deliberate intercourse during the Ramadan fast',
    question: 'What is the expiation for deliberately having intercourse during a Ramadan day?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'A severe expiation: freeing a believing slave; failing that, fasting two consecutive months; failing that, feeding sixty poor people, plus making up the day.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith of the man who had intercourse with his wife in Ramadan and was ordered to free a slave, then fast, then feed sixty poor — Bukhari & Muslim' },
    ],
  },
  {
    chapter: 'Fasting (Sawm)',
    topic: 'The pregnant or nursing woman',
    question: 'What does a pregnant or nursing woman who cannot fast do?',
    rows: [
      { madhab: 'Hanafi', ruling: 'If she fears for herself or the child, she breaks the fast and makes up the days only.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Shafi\'i', ruling: 'If she fears harm for herself or the child, she makes up the days; the feeding (fidyah) is added according to the strength of the case for it.', reference: 'Minhaj al-Talibin (al-Nawawi)' },
      { madhab: 'Maliki', ruling: 'Makes up the days; feeding is added when the case calls for it.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'If she fears for the child only, she feeds one poor person per day in addition to making up the fast.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Fasting (Sawm)',
    topic: 'The siwak (tooth-stick) while fasting',
    question: 'May one use the siwak during the fasting day?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'The siwak is permitted and rewarded at all times for one fasting, including the earlier part of the day.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith: "I said to the Prophet: which time? He said: the earlier, for by the One in Whose hand is my soul..." — the Prophet said he was ordered with siwak until he thought it would be revealed in the Quran' },
      { madhab: 'Hanafi', ruling: 'Permitted before midday; disliked after it (the school\'s caution, due to taste remnants).' },
    ],
  },

  // ================= HAJJ =================
  {
    chapter: 'Hajj',
    topic: 'The forms of Hajj: Ifrad, Tamattu\', and Qiran',
    question: 'Which forms of Hajj are valid?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'All three forms are valid: Ifrad (Hajj alone), Tamattu\' (Umrah then Hajj in one journey), and Qiran (both in one ihram).', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith of Aisha: "We went out as those performing Qiran..." — Bukhari & Muslim; the Prophet let the companions choose among the three forms' },
      { madhab: 'Shafi\'i', ruling: 'The best form is Tamattu\' for one who brings the sacrificial animal\'s equivalent; Tamattu\' and Qiran require a hady (sacrifice).' },
      { madhab: 'Hanafi', ruling: 'Tamattu\' and Qiran require the hady; Ifrad does not.' },
    ],
  },
  {
    chapter: 'Hajj',
    topic: 'Standing at Arafah',
    question: 'What is the ruling on standing at Arafah?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Standing at Arafah is the greatest pillar of Hajj; whoever misses Arafah during its window (midday of the 9th to dawn of the 10th) has missed Hajj entirely that year.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith: "Hajj is Arafah" — al-Tirmidhi, al-Nasa\'i' },
    ],
  },
  {
    chapter: 'Hajj',
    topic: 'Tawaf and Sa\'i',
    question: 'What are the requirements of Tawaf and Sa\'i?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Tawaf al-ifadah is a pillar: seven circuits around the Ka\'bah beginning at the Black Stone, in a state of purity. Sa\'i between Safa and Marwah is seven laps, a pillar of Hajj and Umrah.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Quran 2:158 on Safa and Marwah; hadith of Jabir\'s full Hajj description — Muslim' },
    ],
  },
  {
    chapter: 'Hajj',
    topic: 'Shaving or shortening the hair',
    question: 'How does one exit ihram after completing the rites?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'On the Day of Sacrifice, the pilgrim shaves the head or shortens it (at least a fingertip\'s length); shaving is generally superior for men. Women shorten the ends of their hair by a fingertip and do not shave.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith: the Prophet prayed for those who shaved three times before those who shortened — Bukhari & Muslim' },
    ],
  },
  {
    chapter: 'Hajj',
    topic: 'Restrictions while in ihram',
    question: 'What is forbidden while in the state of ihram?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'While in ihram: no cutting of hair or nails, no perfume, no killing of game, no marriage proposal or contract, no sexual relations, no covering of the head (men) or face-veiling (women) in the usual manner — expiations apply for violations.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Quran 5:95-96; hadith of Ibn Abbas: the Prophet said the muhrim may not marry, propose, or get married — Muslim' },
    ],
  },
  {
    chapter: 'Fasting (Sawm)',
    topic: 'Breaking the fast due to illness',
    question: 'Is a sick person permitted to break their fast during Ramadan?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Yes — a person whose illness would be worsened by fasting, or who fears delayed recovery, is permitted to break the fast and make up the missed days later.', reference: 'Al-Hidayah (al-Marghinani)', evidence: 'Quran 2:185: "whoever of you is ill or on a journey, then the same number of other days"' },
      { madhab: 'Shafi\'i', ruling: 'Yes, with the same underlying principle — hardship that fasting would cause or worsen permits breaking the fast, followed by making up the days once able.', reference: 'Minhaj al-Talibin (al-Nawawi)', evidence: 'Quran 2:185' },
      { madhab: 'Maliki', ruling: 'Yes — illness that fasting would harm permits breaking the fast, with the days made up later.', reference: 'Mukhtasar Khalil', evidence: 'Quran 2:185' },
      { madhab: 'Hanbali', ruling: 'Yes — genuine illness permits breaking the fast; the missed days are made up after Ramadan.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Quran 2:185' },
    ],
  },
];