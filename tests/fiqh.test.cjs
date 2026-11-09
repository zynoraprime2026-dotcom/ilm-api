// Mount the real fiqh router with a stubbed database and check the index answers.
const path = require('path');
const express = require('express');
const http = require('http');
const root = '/app/conversations/6ad23d2e4ce18c326725032f/work/ilmapi';

const fake = {
  query: async (sql) => {
    if (/count\(DISTINCT chapter\)/i.test(sql)) return { rows: [{ n: 12 }] };
    if (/count\(DISTINCT topic\)/i.test(sql)) return { rows: [{ n: 77 }] };
    if (/count\(\*\).*fiqh_rulings/i.test(sql)) return { rows: [{ n: 308 }] };
    if (/fiqh_books/i.test(sql)) return { rows: [{ n: 9 }] };
    if (/fiqh_scholars/i.test(sql)) return { rows: [{ n: 6 }] };
    return { rows: [] };
  },
};
require.cache[require.resolve(path.join(root, 'src/config/db.js'))] = { id: 'db', filename: 'db', loaded: true, exports: fake };

const app = express();
app.use('/v1/fiqh', require(path.join(root, 'src/routes/fiqh.js')));
const server = app.listen(0, async () => {
  const port = server.address().port;
  http.get({ host: '127.0.0.1', port, path: '/v1/fiqh' }, (res) => {
    let b = '';
    res.on('data', (c) => (b += c));
    res.on('end', () => {
      const d = JSON.parse(b);
      console.log('status:', res.statusCode);
      console.log('counts:', JSON.stringify(d.counts));
      console.log('endpoints:', d.endpoints.length);
      console.log('note present:', Boolean(d.note));
      const ok = res.statusCode === 200 && d.counts.topics === 77 && d.endpoints.length === 6;
      console.log(ok ? 'fiqh index OK' : 'fiqh index FAILED');
      server.close();
      process.exit(ok ? 0 : 1);
    });
  });
});
