// Fiqh comparative rulings — Part 3: Muamalat (Transactions), Nikah (Marriage & Family),
// At'imah (Food), Libas (Clothing), Janaiz (Funerals).
// Same sourcing standard as Parts 1-2.
module.exports = [
  // ================= MUAMALAT =================
  {
    chapter: 'Transactions (Muamalat)',
    topic: 'The prohibition of riba (usury) in exchanges',
    question: 'When is an exchange of goods or currency riba (prohibited)?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Exchanging the same commodity (gold for gold, silver for silver, wheat for wheat, etc.) requires equal measure and hand-to-hand exchange; exchanging gold for silver (or modern currencies) requires hand-to-hand but not equality.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith of Ubadah ibn as-Samit listing the six categories — Muslim; hadith of Abu Sa\'id al-Khudri on selling gold for gold — Bukhari & Muslim' },
    ],
  },
  {
    chapter: 'Transactions (Muamalat)',
    topic: 'Bay\' al-salam (deferred payment sale)',
    question: 'Is selling goods before they exist, with deferred delivery, permitted?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Permitted with strict conditions: the full price is paid at the contract, and the item, its quality, quantity, and delivery date are clearly defined.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith of Ibn Abbas: the Prophet came to Madinah while people were selling dates years in advance, and said: whoever sells something, let him sell a known measure for a known price for a known term — Bukhari & Muslim' },
    ],
  },
  {
    chapter: 'Transactions (Muamalat)',
    topic: 'Sales containing gharar (uncertainty)',
    question: 'What invalidates a sale through uncertainty?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'A sale is invalid when the item, price, or delivery is unknown or uncertain: selling a runaway animal, a bird in flight, an unborn animal without its mother, "whatever is in this container", or produce before it is ready to be measured.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith of Abu Hurayrah: the Prophet forbade the sale of gharar — Muslim' },
    ],
  },
  {
    chapter: 'Transactions (Muamalat)',
    topic: 'Bay\' al-\'inah (sell-and-buy-back)',
    question: 'Is a sale with a buy-back at a different price valid?',
    rows: [
      { madhab: 'Shafi\'i', ruling: 'Valid in form when the contracts are separate, though some of the school\'s scholars consider it a disliked workaround.', reference: 'Minhaj al-Talibin (al-Nawawi)' },
      { madhab: 'Hanafi', ruling: 'Invalid: it is a trick to obtain a loan with interest, so it carries the ruling of what it achieves (a prohibited loan).', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Maliki', ruling: 'Prohibited and void as a means to riba.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Prohibited: a means that takes the ruling of its end (riba).', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Transactions (Muamalat)',
    topic: 'Khiyar al-majlis (option of the sitting)',
    question: 'May either party withdraw after agreeing but before parting?',
    rows: [
      { madhab: 'Shafi\'i', ruling: 'Either party may revoke the sale until they physically part; the contract binds only at separation.', reference: 'Al-Majmu\' (al-Nawawi)', evidence: 'Hadith of Hakeem ibn Hizam: "The two parties do not separate except from a sale in which both are satisfied" — Bukhari & Muslim' },
      { madhab: 'Hanafi', ruling: 'The sale binds at the meeting of offer and acceptance, not at parting.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Maliki', ruling: 'The contract binds upon agreement.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'The option of the sitting is valid until parting, following the hadith of Hakeem ibn Hizam.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Transactions (Muamalat)',
    topic: 'Mudarabah (profit-sharing partnership)',
    question: 'Is a partnership of capital and labor valid?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Valid: one party provides capital, the other labor, and profit is split by an agreed percentage. Loss is borne by the capital provider alone; the worker loses his effort.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Established by the Prophet\'s practice with Khadijah and the continuous practice of the ummah' },
    ],
  },
  {
    chapter: 'Transactions (Muamalat)',
    topic: 'Muzara\'ah (sharecropping)',
    question: 'Is leasing land for a share of the crop permitted?',
    rows: [
      { madhab: 'Hanafi', ruling: 'Permitted with a defined share of the actual produce (e.g., a third), per the Khaybar arrangement and the practice of the companions in Iraq.', reference: 'Al-Hidayah (al-Marghinani)', evidence: 'The Prophet contracted the people of Khaybar with half the produce — Bukhari & Muslim' },
      { madhab: 'Shafi\'i', ruling: 'Permitted for a known share of the produce from specified land.', reference: 'Minhaj al-Talibin (al-Nawawi)' },
      { madhab: 'Maliki', ruling: 'Permitted with a share of the produce; the contract governs the produce itself.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'Permitted per the Khaybar precedent with a defined share.', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Transactions (Muamalat)',
    topic: 'Debts before inheritance',
    question: 'What is settled first from a deceased person\'s estate?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Debts and bequests are settled before the estate is divided among the heirs; a bequest cannot exceed one third of the estate after debts.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Quran 4:11-12 (division after any bequest or debt); hadith: the soul of the believer is suspended until his debt is paid — al-Nasa\'i' },
    ],
  },
  {
    chapter: 'Transactions (Muamalat)',
    topic: 'The limit of the bequest (wasiyyah)',
    question: 'How much of the estate may be bequeathed?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'A bequest to non-heirs is valid up to one third of the estate, and only with the heirs\' consent beyond that; a bequest to an heir requires the other heirs\' consent entirely.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith of Sa\'d ibn Abi Waqqas: "One third, and one third is much... you are better leaving your heirs rich" — Bukhari & Muslim' },
    ],
  },

  // ================= NIKAH =================
  {
    chapter: 'Marriage & Family (Nikah)',
    topic: 'The wali (guardian) in marriage',
    question: 'Is a guardian required for a valid marriage contract?',
    rows: [
      { madhab: 'Shafi\'i', ruling: 'The wali is a condition of validity; a woman may not contract her own marriage or that of another.', reference: 'Minhaj al-Talibin (al-Nawawi)', evidence: 'Hadith: "There is no marriage except with a wali" — Abu Dawud, al-Tirmidhi, Ibn Majah' },
      { madhab: 'Maliki', ruling: 'The wali is required for validity.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'The wali is required for validity.', reference: 'Al-Mughni (Ibn Qudamah)' },
      { madhab: 'Hanafi', ruling: 'An adult woman may contract her own marriage (the wali\'s involvement is recommended); the court may block a marriage below her status if she marries unsuitably.', reference: 'Al-Hidayah (al-Marghinani)', evidence: 'Quran 2:232 read as addressing women directly about marriage' },
    ],
  },
  {
    chapter: 'Marriage & Family (Nikah)',
    topic: 'The mahr (dowry)',
    question: 'Is the dowry required, and is there a minimum?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'The mahr is the wife\'s right and a requirement of the marriage (Quran 4:4).', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Quran 4:4; hadith of Sahl ibn Sa\'d (mahr of teaching the Quran — Bukhari & Muslim)' },
      { madhab: 'Shafi\'i', ruling: 'The minimum valid mahr is ten dirhams; anything agreed above that is binding.' },
      { madhab: 'Hanafi', ruling: 'Any valuable, agreed amount is valid; there is no fixed minimum, though custom governs what is fitting.' },
      { madhab: 'Maliki', ruling: 'The customary mahr of her peers is the benchmark when unspecified.' },
      { madhab: 'Hanbali', ruling: 'Any agreed valuable suffices.' },
    ],
  },
  {
    chapter: 'Marriage & Family (Nikah)',
    topic: 'The waiting period (iddah)',
    question: 'What is the iddah after divorce or widowhood?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'A divorced (non-pregnant) woman waits three menstrual cycles; a widow waits four months and ten days; a pregnant woman\'s iddah ends at delivery. She remains in the marital home during a revocable divorce\'s iddah.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Quran 2:228 (three quru\'), Quran 2:234 (four months and ten days), Quran 65:4 (pregnancy)' },
    ],
  },
  {
    chapter: 'Marriage & Family (Nikah)',
    topic: 'The limit of four wives',
    question: 'How many wives may a man have at once?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'A maximum of four free wives at one time, conditional on the ability to be just; justice in sustenance and treatment is required, and inability to be just restricts a man to one.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Quran 4:3: "marry women of your choice, two, three, or four; but if you fear you cannot be just, then only one"' },
    ],
  },
  {
    chapter: 'Marriage & Family (Nikah)',
    topic: 'Temporary marriage (mut\'ah)',
    question: 'Is a marriage contracted for a fixed term valid?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Invalid and prohibited: a marriage must be intended as permanent; a fixed-term marriage is not recognized and is treated as zina by the established laws of the four schools.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith of Ali: the Prophet forbade temporary marriage on the day of Khaybar — Bukhari & Muslim' },
    ],
  },
  {
    chapter: 'Marriage & Family (Nikah)',
    topic: 'Khul\' (divorce at the wife\'s initiative)',
    question: 'May a wife obtain a separation by returning the mahr?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Valid: if the wife dislikes the marriage and returns the mahr (or its equivalent), the husband separates from her; per the hadith of Thabit ibn Qays\'s wife, the Prophet called it a permissible khul\'.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Quran 2:229; hadith of the wife of Thabit ibn Qays — Bukhari' },
    ],
  },
  {
    chapter: 'Marriage & Family (Nikah)',
    topic: 'Foster relationships (rida\'ah)',
    question: 'Does breastfeeding create marriage-prohibiting relationships?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Breastfeeding creates the same prohibitions as blood lineage: the wet-nurse is like the mother, her children like siblings.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Quran 4:23; hadith of Aisha: "Suckling makes forbidden what birth makes forbidden" — Bukhari & Muslim' },
      { madhab: 'Hanafi', ruling: 'Prohibitions attach at any amount of feeding within two lunar years (the majority reading of the texts).' },
      { madhab: 'Shafi\'i', ruling: 'Five separate feedings within two years are the threshold per the school\'s accepted reading.' },
      { madhab: 'Maliki', ruling: 'Any suckling within two years creates prohibition.' },
      { madhab: 'Hanbali', ruling: 'Prohibition attaches with any feeding within the nursing age.' },
    ],
  },
  {
    chapter: 'Marriage & Family (Nikah)',
    topic: 'Custody of children (hadanah)',
    question: 'Who has custody of children after separation?',
    rows: [
      { madhab: 'Hanafi', ruling: 'The mother has custody of a boy until seven and a girl until nine (in the school\'s standard works), after which custody passes to the father.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Shafi\'i', ruling: 'The mother until a boy reaches seven and a girl nine; then the child may choose, with priority in practice to the father.', reference: 'Minhaj al-Talibin (al-Nawawi)', evidence: 'Hadith: the mother\'s right and mercy — the woman who was granted custody of her child — Abu Dawud' },
      { madhab: 'Maliki', ruling: 'The mother holds the boy until puberty and the girl until marriage, unless she remarries an unrelated man, in which case custody shifts to the father\'s side.', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanbali', ruling: 'The mother until the boy is seven; then either parent who the child chooses among the eligible.' },
    ],
  },

  // ================= AT'IMAH =================
  {
    chapter: 'Food & Drink (At\'imah)',
    topic: 'The fundamental food prohibitions',
    question: 'What categories of food are forbidden by the Quran?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Forbidden: the dead animal (not ritually slaughtered), flowing blood, pork, and what was slaughtered for other than Allah, with the exception of dead fish and locusts.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Quran 2:173, 5:3; hadith of Ibn Umar on the two carrions (fish and locusts) — Bukhari' },
    ],
  },
  {
    chapter: 'Food & Drink (At\'imah)',
    topic: 'Sea creatures',
    question: 'Which sea animals may be eaten?',
    rows: [
      { madhab: 'Shafi\'i', ruling: 'All sea animals are permissible, even those found dead, per "the catch of the sea is lawful to you" (Quran 5:96).', reference: 'Minhaj al-Talibin (al-Nawawi)', evidence: 'Quran 5:96; hadith of the tide-called sea: "Its water is pure and its dead are lawful" — Abu Dawud, al-Tirmidhi' },
      { madhab: 'Maliki', ruling: 'All sea animals are permissible (aside from what is harmful).', reference: 'Mukhtasar Khalil' },
      { madhab: 'Hanafi', ruling: 'Only fish are permissible from the sea; other sea animals are not eaten in the school.', reference: 'Al-Hidayah (al-Marghinani)' },
      { madhab: 'Hanbali', ruling: 'Fish only (with everything from the sea debated; the school\'s standard restricts to fish and that which resembles it).', reference: 'Al-Mughni (Ibn Qudamah)' },
    ],
  },
  {
    chapter: 'Food & Drink (At\'imah)',
    topic: 'Slaughter by the People of the Book',
    question: 'Is meat slaughtered by a Christian or Jew permissible?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'The Quran permits the food of the People of the Book (5:5), with the schools adding conditions: a valid slaughter with the name of Allah (per some detail within the schools), and the animal itself must be of a permissible kind.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Quran 5:5; hadith of the companions eating from a Christian woman\'s cheese and butter — Bukhari' },
      { madhab: 'Hanafi', ruling: 'Permitted, except what they slaughter for their festivals or dedicate to their saints, which the Hanafi school prohibits.' },
      { madhab: 'Shafi\'i', ruling: 'Permitted generally; what they slaughter as Christians and Jews is treated as their lawful food.' },
    ],
  },
  {
    chapter: 'Food & Drink (At\'imah)',
    topic: 'Intoxicants',
    question: 'What is the ruling on intoxicating drinks?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Every intoxicant is khamr and every khamr is forbidden; a small amount of what intoxicates in large amounts is itself forbidden.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Quran 5:90-91; hadith: "Every intoxicant is khamr and every khamr is haram" — Muslim; hadith of Jabir on the small and large — Muslim' },
    ],
  },

  // ================= LIBAS =================
  {
    chapter: 'Clothing (Libas)',
    topic: 'Gold and silk for men',
    question: 'May men wear gold and silk?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Gold and natural silk are forbidden for men and permitted for women; silver is permitted for men (rings, sword fittings).', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith of Ali: the Prophet forbade him from gold rings, silk, and garment hems — Muslim; hadith of the silk and gold: "these are for the people of this world and for the wives of the believers in the hereafter" — Bukhari' },
      { madhab: 'Hanafi', ruling: 'Permits for men a small measure of silk (up to four joined finger-widths) when sewn into a broader garment — the school\'s well-known dispensation.' },
    ],
  },

  // ================= JANAIZ =================
  {
    chapter: 'Funerals (Janaiz)',
    topic: 'The communal obligations for the deceased',
    question: 'What must the community do for a deceased Muslim?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'Four communal obligations: washing the body, shrouding it, the funeral prayer, and burial. Performed by some, the obligation lifts from all.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'The Prophet\'s practice at the funerals of the dead of Uhud and others — Bukhari & Muslim' },
    ],
  },
  {
    chapter: 'Funerals (Janaiz)',
    topic: 'The martyr (shahid) in battle',
    question: 'Is a battle martyr washed and prayed over?',
    rows: [
      { madhab: 'Consensus (all four madhabs)', ruling: 'The battle martyr is buried in his garments without washing or funeral prayer, per the Prophet\'s command at Uhud.', reference: 'Al-Mughni (Ibn Qudamah)', evidence: 'Hadith of Jabir: the Prophet buried the Uhud martyrs in their blood-stained garments without washing — Abu Dawud, al-Tirmidhi' },
    ],
  },
];
