// Candidate editions for the matns the main collection does not cover.
//
// Found by searching the Internet Archive per missing matn. Each entry records
// only what could be established cheaply and honestly: that the item exists, the
// exact file, its size, and whether fetching it returned real PDF bytes
// (check: 'pdf-magic-ok'), failed, or turned out to be book-sized rather than a
// matn. Archive uploads are user-contributed, so an identifier can hold a
// different edition, a commentary, or an unrelated book.
//
// Deliberately NOT published as download links in the catalogue. A wrong file is
// worse than a missing one in a text people memorise from. Promotion path: open
// the first page, confirm it is the matn, move the entry into mutoonPdfs.js.
const PDF_CANDIDATES = {
  'al-ajurrumiyyah': { identifier: "kamalmostafa75_gmail_20160222", bytes: 1034866, check: "pdf-magic-ok", file: "الآجرومية العاشر.pdf" },
  'al-arbaun-al-nawawiyyah': { identifier: "nawawi00", bytes: 271974, check: "pdf-magic-ok", file: "الأربعون النووية..pdf" },
  'al-murshid-al-muin': { identifier: "AlhabluMatin", bytes: 2539587, check: "pdf-magic-ok", file: "ElhablElmatine.pdf" },
  'al-mutammimah': { identifier: "20241216_20241216_2133", bytes: 1634064, check: "pdf-magic-ok", file: "البهجة المرضية فى نظم المتممة الآجرومية لتقريب المسائل النحوية للشيخ محمد على آدم الأثيوبى_text.pdf" },
  'al-qawaid-al-arba': { identifier: "szjtvbzsf_tm2mail_1_201802", bytes: 833754, check: "pdf-magic-ok", file: "القواعد الأربع ح1.pdf" },
  'al-rahabiyyah': { identifier: "20201229_20201229_2230", bytes: 1277297, check: "fetch-failed", file: "رسالتان في علم الفرائض   الحجج القاطعة في المواريث الواقعة - السبيكة الذهبية على المنظومة الرحبية.pdf" },
  'al-waraqat': { identifier: "20250423_20250423_0745", bytes: 3147452, check: "pdf-magic-ok", file: "شرح_جلال_الدين_المحلي_على_الورقات_لإمام_الحرمين.pdf" },
  'matn-abi-shuja': { identifier: "MatnAbiChedja3", bytes: 2649295, check: "fetch-failed", file: "MatnAbiChedjaa.pdf" },
  'matn-al-bina': { identifier: "20230707_20230707_0935", bytes: 143004367, check: "book-sized", file: "شروح متن البناء.pdf" },
};

module.exports = { PDF_CANDIDATES };
