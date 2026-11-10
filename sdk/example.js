// node example.js            keyless, no secrets needed
// ILM_API_KEY=... node example.js    adds the key-only surface
const IlmApi = require('./index.js');

(async () => {
  const ilm = process.env.ILM_API_KEY ? new IlmApi({ apiKey: process.env.ILM_API_KEY }) : IlmApi.public();
  console.log('tier:', ilm.tier);

  const surahs = await ilm.quran.surahs();
  console.log('surahs:', surahs.length, '| first:', surahs[0].name_transliteration);

  const a = await ilm.quran.ayah(2, 255);
  console.log('2:255:', a.text_arabic.length, 'chars |', a.translation.slice(0, 50));

  const w = await ilm.quran.words(2, 255);
  console.log('2:255 words:', w.words.length, '| word 1:', w.words[0].text_arabic, '-', w.words[0].translation);

  console.log('citation:', (await ilm.quran.cite(2, 255)).citation);
  console.log('audio:', ilm.quran.audioUrl(2, 255, { reciter: 'ar.alafasy' }));

  const cols = await ilm.hadith.collections();
  console.log('hadith collections:', cols.length);

  const cat = await ilm.mutoon.list();
  console.log('mutoon:', cat.count, '| paths:', (await ilm.mutoon.paths()).count);
  console.log('mutoon stream:', ilm.mutoon.streamUrl('al-ajurrumiyyah'));

  if (ilm.tier !== 'v1') {
    console.log('keyed surface skipped (no ILM_API_KEY)');
    return;
  }

  const st = await ilm.status();
  console.log('status:', st.status, '| ayahs:', st.data.ayahs, '| hadiths:', st.data.hadiths);
  const u = await ilm.usage();
  console.log('quota:', u.tier, '| minute left:', u.minute.remaining, '| day left:', u.day.remaining);
  const l = await ilm.mutoon.lines('al-ajurrumiyyah').catch((e) => ({ error: e.message }));
  console.log('mutoon lines:', l.error || l.total_lines);
})().catch((e) => {
  console.error('FAILED:', e.status, e.code, e.message, e.hint || '');
  process.exit(1);
});
