// Fiqh comparative rulings — Part 1: Tahara (Purification) & Salah (Prayer).
// Every entry is a mainstream, textbook-level position cited to its classical manual.
// Sources: Al-Hidayah (al-Marghinani, Hanafi), Radd al-Muhtar (Ibn Abidin, Hanafi),
// Al-Mughni (Ibn Qudamah, Hanbali), Al-Majmu'/Minhaj al-Talibin (al-Nawawi, Shafi'i),
// Mukhtasar Khalil & Al-Mudawwana (Maliki), and the standard evidence texts.
module.exports = [
  // ================= TAHAARA =================
  {
    chapter: 'Purification (Tahara)',
    topic: 'Does touching a non-mahram of the opposite sex break wudu?',
    question: 'Does direct skin contact with a non-mahram of the opposite sex nullify wudu?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Touching a non-mahram does not break wudu. The verse "or you have touched women" (Quran 4:43) is understood as sexual contact, not mere touch.', reference: 'Al-Hidayah (al-Marghinani)', evidence: 'Quran 4:43; hadith of Aisha: the Prophet kissed a wife and prayed without renewing wudu (Sunan Abu Dawud)' },
      { madhab: 'Shafi\'i', ruling: 'Direct skin-to-skin contact with a non-mahram of the opposite sex breaks wudu, following the apparent meaning of "lamastum" in the verse.', reference: 'Minhaj al-Talibin (al-Nawawi)', evidence: 'Quran 4:43' },
      { madhab: 'Maliki', ruling: 'Touching does not break wudu; purity is presumed until certain nullification occurs.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Touching with desire breaks wudu; touching without desire does not.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Purification (Tahara)',
    topic: 'Does bleeding break wudu?',
    question: 'Does blood flowing from the body nullify wudu?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Wudu breaks when blood (or pus) flows from its origin point to a place that must be washed in wudu or ghusl.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Shafi\'i', ruling: 'Bleeding does not break wudu; wudu is nullified only by what exits the two private passages.', reference: 'Minhaj al-Talibin (al-Nawawi)' },
      { madhab: 'Maliki', ruling: 'Flowing blood (much or little) breaks wudu.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'A large amount of flowing blood breaks wudu; a small amount does not.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Purification (Tahara)',
    topic: 'Is intention (niyyah) required for wudu?',
    question: 'Is a valid intention a condition for the validity of wudu?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Intention is a sunnah of wudu, not a condition; the wudu of one who washes for cooling or cleanliness is valid.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Shafi\'i', ruling: 'Intention is a condition (rukn) — wudu without the intention to remove minor impurity is invalid.', reference: 'Minhaj al-Talibin (al-Nawawi)' },
      { madhab: 'Maliki', ruling: 'Intention is recommended, not a condition for validity.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Intention is required, as the deeds are by intentions (hadith of Umar, Bukhari & Muslim).', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith: "Deeds are by intentions" — Bukhari & Muslim' },
    ],
  },
  {
    chapter: 'Purification (Tahara)',
    topic: 'Does touching one\'s private parts break wudu?',
    question: 'Does touching the private parts with the bare hand nullify wudu?',
    rows: [
      { madhab: 'Hanafi', ruling: 'It does not break wudu; the reported hadith is understood as abrogated or as meaning unlawful touch.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Shafi\'i', ruling: 'Direct touch of the private parts with the palm breaks wudu, per the hadith of Busrah.', reference: 'Minhaj al-Talibin (al-Nawawi)', evidence: 'Hadith of Busrah: "Whoever touches his private parts, let him make wudu" — Sunan Abu Dawud, al-Tirmidhi' },
      { madhab: 'Maliki', ruling: 'It does not break wudu.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'It breaks wudu, following the outward meaning of the Busrah hadith.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Purification (Tahara)',
    topic: 'Does vomiting break wudu?',
    question: 'Does vomiting nullify wudu?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Vomiting does not break wudu.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Shafi\'i', ruling: 'A mouthful of vomit breaks wudu; less does not.', reference: 'Minhaj al-Talibin (al-Nawawi)' },
      { madhab: 'Maliki', ruling: 'It does not break wudu.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'It does not break wudu (a minority view of Imam Ahmad holds a mouthful breaks it).', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Purification (Tahara)',
    topic: 'Wiping over the khuff (leather sock)',
    question: 'May one wipe over socks instead of washing the feet in wudu, and for how long?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Permitted for a resident 24 hours and a traveler 72 hours, from the first wiping after complete purity.', reference: 'Al-Hidayah (al-Marghinani)', evidence: 'Hadith of Jarir ibn Abdillah (who accepted Islam after the wiping verse) — Bukhari & Muslim; hadith of Shurayh ibn Hani from Aisha: 3 days for travel — Muslim' },
      { madhab: 'Shafi\'i', ruling: 'Same: one day and night for a resident, three days and nights for a traveler.', reference: 'Minhaj al-Talibin (al-Nawawi)' },
      { madhab: 'Maliki', ruling: 'Permitted in travel only, up to three days; not permitted for a resident.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Permitted for resident and traveler, same durations as the majority.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Purification (Tahara)',
    topic: 'How many strikes of the earth for tayammum?',
    question: 'How is tayammum (dry ablution) performed?',
    rows: [
      { madhab: 'Hanafi', ruling: 'One strike: wipe the face with part of it and the arms with the rest, with the fingers spread. A second strike is disliked.', reference: 'Al-Hidayah (al-Marghinani)', evidence: 'Quran 4:43; hadith of Ammar ibn Yasir — Bukhari & Muslim' },
      { madhab: 'Shafi\'i', ruling: 'Two strikes: one for the face, one for the arms, per the narration of the Ammar hadith with two strikes.', reference: 'Minhaj al-Talibin (al-Nawawi)' },
      { madhab: 'Maliki', ruling: 'Two strikes; wiping the face then the hands to the elbows.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Two strikes, following the two-strike narration.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Purification (Tahara)',
    topic: 'Purity from dog saliva',
    question: 'How is something licked by a dog purified?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Wash seven times, one of them with earth (or a cleaning agent).', reference: 'Al-Hidayah (al-Marghinani)', evidence: 'Hadith: "The purification of any of your vessels, when a dog licks it, is to wash it seven times" — Muslim' },
      { madhab: 'Shafi\'i', ruling: 'Wash seven times: the first with earth mixed in before water; the remainder with water.', reference: 'Minhaj al-Talibin (al-Nawawi)' },
      { madhab: 'Maliki', ruling: 'Wash seven times; the earth is recommended and can be omitted if the saliva is removed.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Wash seven times, the first or eighth with earth; dog saliva is itself najis (impure).', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Purification (Tahara)',
    topic: 'Sleep and wudu',
    question: 'Does sleep nullify wudu?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Deep sleep nullifies wudu (lying down, or seated in an unstable way); light drowsiness in a seated, braced position does not.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Shafi\'i', ruling: 'Only sleep so deep that one would not notice losing wind breaks wudu; light sleep does not.', reference: 'Minhaj al-Talibin (al-Nawawi)' },
      { madhab: 'Maliki', ruling: 'Sleep lying down or leaning breaks wudu; light, seated sleep does not.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Abundant sleep breaks wudu regardless of posture; a little does not.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Purification (Tahara)',
    topic: 'Obligations of ghusl (full bath)',
    question: 'What are the integral obligations of ghusl from major impurity?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Three obligations: rinsing the mouth, rinsing the nose, and washing the entire body once. All else is sunnah.', reference: 'Nur al-Idah (al-Shurunbulali)' },
      { madhab: 'Shafi\'i', ruling: 'Two integrals: intention, and causing water to flow over the entire body and scalp hair.', reference: 'Minhaj al-Talibin (al-Nawawi)' },
      { madhab: 'Maliki', ruling: 'One integral: washing the entire body with intention; details such as nose-rinsing are obligations with sunnah-like status.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Intention and washing the entire body once; rinsing mouth and nose are included in "washing all of you" (Quran 4:43).', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Purification (Tahara)',
    topic: 'Menstruation and worship',
    question: 'What may a menstruating woman do and make up later?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'She does not pray or fast during menstruation; the missed fasts of Ramadan are made up, while the missed prayers are not. This is established by the practice of the Prophet\'s wives.', reference: 'Al-Mughni (Ibn Qudamah); Fath al-Bari (Ibn Hajar)', evidence: 'Hadith of Aisha: "We were ordered to make up the fasts, and we were not ordered to make up the prayers" — Bukhari & Muslim' },
    ],
  },

  // ================= SALAH =================
  {
    chapter: 'Prayer (Salah)',
    topic: 'Reciting Bismillah aloud in prayer',
    question: 'Is the Basmala recited aloud in audible prayers?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Recited silently in every prayer, audible or not; reciting it aloud is disliked.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Shafi\'i', ruling: 'Recited aloud in the audible prayers as part of the Fatiha\'s complete recitation.', reference: 'Al-Majmu\' (al-Nawawi)', evidence: 'Hadith of Anas on the Prophet reciting in prayer; hadith of Nafl ibn Ubaydillah\'s dispatch to Yemen? — see Sunan Abu Dawud (letter to Yemen including bismillah)' },
      { madhab: 'Maliki', ruling: 'Not recited aloud; the school in fact holds it is not recited at all in the obligatory prayer.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Recited silently; reciting aloud is permissible but not the school\'s practice.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Prayer (Salah)',
    topic: 'Saying Ameen aloud',
    question: 'Is Ameen said aloud after the Fatiha in audible prayers?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Ameen is said silently.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Shafi\'i', ruling: 'Ameen is said aloud in audible prayers; it is emphasized (the Angel Jibril instructed the Prophet, per hadith of Wa\'il ibn Hujr).', reference: 'Minhaj al-Talibin (al-Nawawi)', evidence: 'Hadith: "When the imam says Ameen, say Ameen" — Bukhari & Muslim' },
      { madhab: 'Maliki', ruling: 'Ameen is said silently.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Ameen is said aloud in audible prayers.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Prayer (Salah)',
    topic: 'Must the follower recite the Fatiha behind the imam?',
    question: 'Does a person praying behind an imam recite Surah al-Fatiha?',
    rows: [
      { madhab: 'Hanafi', ruling: 'The follower does not recite in audible prayers behind an imam who recites; he listens attentively, per "when the Quran is recited, listen to it" (Quran 7:204).', reference: 'Al-Hidayah (al-Marghinani)', evidence: 'Quran 7:204' },
      { madhab: 'Shafi\'i', ruling: 'The Fatiha is required of every praying person, imam or follower, in every raka\'ah, per "there is no prayer for one who does not recite the Fatiha".', reference: 'Minhaj al-Talibin (al-Nawawi)', evidence: 'Hadith of Ubadah ibn as-Samit — Bukhari 756' },
      { madhab: 'Maliki', ruling: 'The follower recites in the silent prayers, not in the audible ones.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'The follower recites the Fatiha in the imam\'s pauses; if the imam recites continuously, the follower remains silent.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Prayer (Salah)',
    topic: 'Is the Fatiha obligatory in every raka\'ah?',
    question: 'Must the Fatiha be recited in each unit of prayer?',
    rows: [
      { madhab: 'Hanafi', ruling: 'The Fatiha is a binding requirement (wajib) in the first two raka\'ahs; in the third and fourth only glorification is required.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Shafi\'i', ruling: 'The Fatiha is an integral (rukn) of every single raka\'ah; prayer without it is invalid.', reference: 'Minhaj al-Talibin (al-Nawawi)' },
      { madhab: 'Maliki', ruling: 'The Fatiha is required in the first raka\'ah only.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Required in every raka\'ah for the imam and the one praying alone; the follower suffices with the imam\'s recitation when unable in pauses.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Prayer (Salah)',
    topic: 'The qunut supplication',
    question: 'In which prayers is the qunut supplication recited?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Qunut is recited in the witr prayer before the ruku\' of the final raka\'ah, throughout the year.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Shafi\'i', ruling: 'Qunut is recited in the dawn (Subh) prayer after rising from ruku\', and in witr during the second half of Ramadan.', reference: 'Minhaj al-Talibin (al-Nawawi)' },
      { madhab: 'Maliki', ruling: 'There is no qunut in obligatory prayers.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Qunut is in witr during the second half of Ramadan, after ruku\'.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Prayer (Salah)',
    topic: 'The witr prayer: minimum and form',
    question: 'How is the witr prayer performed?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Witr is three raka\'ahs joined like Maghrib but with one salam at the end; praying it as one raka\'ah alone is disliked.', reference: 'Al-Hidayah (al-Marghinani)', evidence: 'Hadith of Aisha: "He used to pray witr as three, not sitting between them" — Muwatta' },
      { madhab: 'Shafi\'i', ruling: 'Witr may be one, three, five, seven, or nine raka\'ahs; the minimum valid is a single raka\'ah, per the hadith "Witr is one raka\'ah of the night".', reference: 'Minhaj al-Talibin (al-Nawawi)', evidence: 'Hadith: "Make the last of your night\'s prayer witr" — Bukhari & Muslim' },
      { madhab: 'Maliki', ruling: 'Witr of one or three raka\'ahs; like the majority, the last of the night.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'One to eleven raka\'ahs are all permitted; minimum one, with salam after each two then one.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Prayer (Salah)',
    topic: 'Combining two prayers (jam\')',
    question: 'May two prayers be combined at one time while traveling?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Combining is not permitted except the standing at Arafah (Dhuhr with Asr) and at Muzdalifah (Maghrib with Isha) during Hajj.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Shafi\'i', ruling: 'A traveler and one with genuine need may combine Dhuhr with Asr, and Maghrib with Isha, at the time of either.', reference: 'Minhaj al-Talibin (al-Nawawi)', evidence: 'Hadith of Ibn Abbas: the Prophet combined in Madinah without fear or rain — Muslim' },
      { madhab: 'Maliki', ruling: 'A traveler may combine Maghrib and Isha only (at Isha time).', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'A traveler and one with need may combine either pair at the time of the earlier or later prayer.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Prayer (Salah)',
    topic: 'Shortening the four-raka\'ah prayers in travel (qasr)',
    question: 'Is the traveler\'s prayer shortened, and until when?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'The four-raka\'ah prayers are shortened to two while on a journey of roughly 77-82 km (a day and night\'s travel). Shortening is a standing license, not a hardship concession.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith of Aisha: "The prayer was ordained as two, and the traveler\'s prayer stayed as it was" — Bukhari & Muslim' },
      { madhab: 'Hanafi', ruling: 'The traveler shortens as long as he is traveling, even for months, until he returns home or settles somewhere for 15+ days.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Shafi\'i', ruling: 'Shortening is only while actually in travel; settling, even briefly in one\'s own city, removes the license.', reference: 'Minhaj al-Talibin (al-Nawawi)' },
      { madhab: 'Maliki', ruling: 'Shortening applies while traveling; a resident of a place over four days prays in full (per the school\'s conditions).', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'One who intends to stay beyond four days prays in full; otherwise he shortens.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Prayer (Salah)',
    topic: 'The Asr prayer time',
    question: 'When does the time for Asr begin?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Asr begins when every object\'s shadow is twice its midday length (the position of Abu Hanifah); the position of his two companions is once the length, like the majority.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Shafi\'i', ruling: 'Asr begins when the shadow of an object equals its length plus its midday shadow.', reference: 'Minhaj al-Talibin (al-Nawawi)', evidence: 'Hadith of Jibril leading the prayers on two consecutive days — this timing per the school\'s reading' },
      { madhab: 'Maliki', ruling: 'Same as the Shafi\'i timing: shadow equal to the object\'s length.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Same as the majority: shadow equal to the object\'s length.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Prayer (Salah)',
    topic: 'The prostration of forgetfulness (sujud al-sahw)',
    question: 'When and how is the prostration of forgetfulness performed?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Required when a binding element (wajib) is delayed or omitted; performed before the salam, with one tasbih-free prostration on each side.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Shafi\'i', ruling: 'For an addition to the prayer it is after the salam; for an omission, before the salam.', reference: 'Minhaj al-Talibin (al-Nawawi)', evidence: 'Hadith of Abu Hurayrah on the two prostrations of forgetfulness — Muslim' },
      { madhab: 'Maliki', ruling: 'Performed before the salam in every case.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Before the salam in every case, per the reading of the hadith of Dhul-Yadayn.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith of Dhul-Yadayn (the man who prayed with the Prophet forgetting a raka\'h) — Bukhari' },
    ],
  },
  {
    chapter: 'Prayer (Salah)',
    topic: 'Verses of prostration during recitation (sujud al-tilawah)',
    question: 'How many verses of recitation-prostration are there, and is it obligatory?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Fourteen verses carry the prostration; it is a binding requirement (wajib) when recited or heard.', reference: 'Nur al-Idah (al-Shurunbulali)' },
      { madhab: 'Shafi\'i', ruling: 'Fifteen verses are agreed upon; the prostration is recommended (sunnah), not obligatory.', reference: 'Minhaj al-Talibin (al-Nawawi)' },
      { madhab: 'Maliki', ruling: 'The prostration is recommended; there are eleven such verses in the school\'s count.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Recommended; performed whether in prayer or outside it.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Prayer (Salah)',
    topic: 'The Friday (Jumu\'ah) prayer',
    question: 'Who is the Jumu\'ah prayer obligatory upon?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Obligatory upon free, adult, male, resident Muslims; not upon women, children, the sick, or travelers, though valid if they attend. It replaces Dhuhr for whoever attends it.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith of Tariq ibn Shihab: "The Jumu\'ah prayer is a binding duty upon every Muslim, in congregation" — Abu Dawud' },
    ],
  },
];
