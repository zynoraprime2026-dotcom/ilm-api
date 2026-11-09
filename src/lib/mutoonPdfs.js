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
  'umdat-al-ahkam': { bytes: 2477484, file: "Mutūn Ṭālib al-'Ilm - Dr. 'Abdul-Muḥsin bin Muḥammad al-Qāsim (retreived 22.11.21) /Umdatul-Aḥkām/Matn Umdatul-Aḥkām.pdf" },
};

function pdfFor(slug) {
  const e = MUTOON_PDFS[slug];
  if (!e) return null;
  return {
    file: e.file,
    bytes: e.bytes,
    // encode each path segment: the filenames carry Arabic and diacritics
    upstream: ARCHIVE_BASE + e.file.split('/').map(encodeURIComponent).join('/'),
    source: 'Internet Archive — Mutun Talib al-\'Ilm (Dr. \'Abdul-Muhsin al-Qasim)',
    source_item: ARCHIVE_ITEM,
    licence: null,
  };
}

module.exports = { MUTOON_PDFS, pdfFor, ARCHIVE_ITEM };
