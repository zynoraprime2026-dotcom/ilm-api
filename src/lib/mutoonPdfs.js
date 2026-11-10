// Downloadable editions for the mutoon, keyed by slug.
//
// Source: the Mutun Talib al-'Ilm collection on the Internet Archive (item
// mutun_talib_al-ilm), which holds Dr. 'Abdul-Muhsin al-Qasim's programme as
// PDFs. Only the plain text of each matn is mapped here, never the "with
// footnotes" edition, because a student memorising wants the matn alone.
//
// These are study PDFs of the printed editions, not our own text: the archive
// item states no licence. They are served through this API as a download, with
// the source credited in /v1/mutoon/pdf-sources, so a takedown request needs one
// edit here and nothing else.
const ARCHIVE_ITEM = 'mutun_talib_al-ilm';
const ARCHIVE_BASE = 'https://archive.org/download/' + ARCHIVE_ITEM + '/';

const MUTOON_PDFS = {
  'zad-al-mustaqni': { bytes: 3732102, file: "Mutūn Ṭālib al-'Ilm - Dr. 'Abdul-Muḥsin bin Muḥammad al-Qāsim (retreived 22.11.21) /Zād al-Mustaqni'/Matn Zād al-Mustaqni'.pdf" },
  'al-jazariyyah': { bytes: 994882, file: "Mutūn Ṭālib al-'Ilm - Dr. 'Abdul-Muḥsin bin Muḥammad al-Qāsim (retreived 22.11.21) /al-Jazariyyah/Matn al-Jazariyyah.pdf" },
  'al-muharrar': { bytes: 5126926, file: "Mutūn Ṭālib al-'Ilm - Dr. 'Abdul-Muḥsin bin Muḥammad al-Qāsim (retreived 22.11.21) /al-Muḥarrar fī Aḥadīth al-Aḥkām/Matn al-Muḥarrar fī Aḥadīth al-Aḥkām.pdf" },
  'alfiyyat-al-iraqi': { bytes: 1941236, file: "Mutūn Ṭālib al-'Ilm - Dr. 'Abdul-Muḥsin bin Muḥammad al-Qāsim (retreived 22.11.21) /Alfiyyah al-'Irāqī/Matn Alfiyyah al-'Irāqī.pdf" },
  'alfiyyat-al-suyuti': { bytes: 2048706, file: "Mutūn Ṭālib al-'Ilm - Dr. 'Abdul-Muḥsin bin Muḥammad al-Qāsim (retreived 22.11.21) /Alfiyyah as-Suyūtī/Matn Alfiyyah as-Suyūtī.pdf" },
  'alfiyyat-ibn-malik': { bytes: 3184934, file: "Mutūn Ṭālib al-'Ilm - Dr. 'Abdul-Muḥsin bin Muḥammad al-Qāsim (retreived 22.11.21) /Alfiyyah Ibn Mālik/Matn Alfiyyah Ibn Mālik.pdf" },
  'bulugh-al-maram': { bytes: 4596759, file: "Mutūn Ṭālib al-'Ilm - Dr. 'Abdul-Muḥsin bin Muḥammad al-Qāsim (retreived 22.11.21) /Bulūgh al-Maram/Matn Bulūgh al-Maram.pdf" },
  'kashf-al-shubuhat': { bytes: 3088117, file: "Mutūn Ṭālib al-'Ilm - Dr. 'Abdul-Muḥsin bin Muḥammad al-Qāsim (retreived 22.11.21) /Kashf ash-Shubuhāt/Matn Kashf ash-Shubuhāt.pdf" },
  'lamiyyat-al-afal': { bytes: 1091736, file: "Mutūn Ṭālib al-'Ilm - Dr. 'Abdul-Muḥsin bin Muḥammad al-Qāsim (retreived 22.11.21) /Lāmiyatul-Af'āl/Matn Lāmiyatul-Af'āl.pdf" },
  'matn-al-adhkar': { bytes: 2297310, file: "Mutūn Ṭālib al-'Ilm - Dr. 'Abdul-Muḥsin bin Muḥammad al-Qāsim (retreived 22.11.21) /Al-Adhkār/Matn al-Adhkār.pdf" },
  'mukhtasar-al-adhkar': { bytes: 1740077, file: "Mutūn Ṭālib al-'Ilm - Dr. 'Abdul-Muḥsin bin Muḥammad al-Qāsim (retreived 22.11.21) /Al-Adhkār/Matn Mukhtasar al-Adhkār.pdf" },
  'nukhbat-al-fikr': { bytes: 1138359, file: "Mutūn Ṭālib al-'Ilm - Dr. 'Abdul-Muḥsin bin Muḥammad al-Qāsim (retreived 22.11.21) /Nukhbatul-Fikr/Matn Nukhbatul-Fikr.pdf" },
  'al-bayquniyyah': { item: 'tzkerah_gmail_20170828_0352', bytes: 1375402, file: "المنظومة البيقونية في علم مصطلح الحديث_text.pdf", note: "Item title names the poem itself; 6 pages matches a 34-line matn." },
  'al-shatibiyyah': { item: '20251211_20251211_1821', bytes: 31232100, file: "متن_الشاطبية_حرز_الأماني_ووجه_التهاني_.pdf", note: "Item title and file name both name the matn; 111 pages fits 1,173 lines." },
  'al-usul-al-thalatha': { item: '506Pdf', bytes: 1816105, file: "506- الأصول الثلاثة وأدلتها وشروط الصلاة والقواعد الأربع - ابن عبد الوهاب - ط الرئاسة    pdf  _text.pdf", note: "Official Saudi print of the matn. Also carries the author's Conditions of Prayer and Four Rules, which is why it is 43 pages." },
  'kitab-al-tawhid': { item: '20230531_20230531_092514', bytes: 1950328, file: "محمد بن عبد الوهاب - كتاب التوحيد_text.pdf", note: "Item title is the matn itself; 165 pages is the standard extent with its hadith citations." },
  'nur-al-idah': { item: 'citamujahid88_gmail_201609', bytes: 4216489, file: "نور الإيضاح_text.pdf", note: "Item description reads 'Matan Nurul Idhoh wa Najatul Arwah', the matn, not a hashiyah." },
  'tuhfat-al-atfal': { item: 'toehopohu_crymail2_20171223', bytes: 518270, file: "تحفة الأطفال والغلمان.pdf", note: "From a 'series of tajwid matns' collection; text layer opens with the nazm and names Sulayman al-Jamzuri." },
  'umdat-al-ahkam': { bytes: 2477484, file: "Mutūn Ṭālib al-'Ilm - Dr. 'Abdul-Muḥsin bin Muḥammad al-Qāsim (retreived 22.11.21) /Umdatul-Aḥkām/Matn Umdatul-Aḥkām.pdf" },
};

function pdfFor(slug) {
  const e = MUTOON_PDFS[slug];
  if (!e) return null;
  // Most editions come from the one al-Qasim collection; a promoted candidate
  // comes from its own archive item, recorded here so the credit stays truthful.
  const item = e.item || ARCHIVE_ITEM;
  const base = e.item ? 'https://archive.org/download/' + item + '/' : ARCHIVE_BASE;
  return {
    file: e.file,
    bytes: e.bytes,
    note: e.note || null,
    // encode each path segment: the filenames carry Arabic and diacritics
    upstream: base + e.file.split('/').map(encodeURIComponent).join('/'),
    source: e.item
      ? 'Internet Archive — user-contributed upload (no licence stated)'
      : 'Internet Archive — Mutun Talib al-\'Ilm (Dr. \'Abdul-Muhsin al-Qasim)',
    source_item: item,
    licence: null,
  };
}

module.exports = { MUTOON_PDFS, pdfFor, ARCHIVE_ITEM };
