// node sdk/example.js  (ILM_API_KEY in env)
const IlmApi = require('./index.js');

(async () => {
  const ilm = new IlmApi({ apiKey: process.env.ILM_API_KEY });
  const st = await ilm.status();
  console.log('status:', st.status, '| ayahs:', st.data.ayahs, '| hadiths:', st.data.hadiths);

  const s1 = await ilm.quran.surah(1);
  console.log('1:1', s1.ayahs[0].text_arabic.length, 'chars |', s1.ayahs[0].translation.slice(0, 40));

  const ref = await ilm.search('2:255');
  console.log('2:255 ->', ref.sections.reference.count, 'record');

  const t = await ilm.tafsir.get(1, 1);
  console.log('tafsir sources:', t.tafsir.map(x => x.source).join(', '));

  const u = await ilm.usage();
  console.log('tier:', u.tier, '| minute left:', u.minute.remaining, '| day left:', u.day.remaining);
})().catch(e => { console.error('FAILED:', e.status, e.message); process.exit(1); });
