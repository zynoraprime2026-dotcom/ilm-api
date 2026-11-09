// Failure guards for the HTTP layer.
//
// The API's worst outage mode is silence. Express 4 does not forward a rejected
// promise from an async route handler to the error handler: the handler stops,
// nothing is written, and the caller waits until the serverless function times
// out (60s, empty body, no clue). One failing query was therefore
// indistinguishable from a dead server.
//
// These three pieces make every failure visible and fast:
//   1. wrapAsyncHandlers — a rejected handler becomes next(err), not a hang.
//   2. responseTimeout   — a request that never resolves answers 504 with JSON.
//   3. errorHandler      — turns an error into a classified status + short body,
//                          without leaking connection strings or SQL.

function classify(err) {
  const msg = String((err && err.message) || '');
  const code = String((err && err.code) || '');
  const sig = code + ' ' + msg;
  if (/relation .* does not exist/i.test(msg)) {
    return { status: 503, error: 'Database schema incomplete', db_error: 'missing_table' };
  }
  if (/permission denied/i.test(msg)) {
    return { status: 503, error: 'Database permission denied', db_error: 'permission_denied' };
  }
  if (/statement timeout|canceling statement/i.test(msg)) {
    return { status: 504, error: 'Database query timed out', db_error: 'statement_timeout' };
  }
  if (/password|SASL|authentication/i.test(msg)) {
    return { status: 503, error: 'Database authentication failed', db_error: 'auth_failed' };
  }
  if (/ENOTFOUND|getaddrinfo|EAI_AGAIN/i.test(sig)) {
    return { status: 503, error: 'Database host not found', db_error: 'dns_failed' };
  }
  if (/ECONNREFUSED|ECONNRESET|EPIPE|connection terminated|connection ended/i.test(sig)) {
    return { status: 503, error: 'Database connection lost', db_error: 'unreachable' };
  }
  if (/ETIMEDOUT|timeout/i.test(sig)) {
    return { status: 504, error: 'Request timed out', db_error: 'timeout' };
  }
  return { status: 500, error: 'Request failed', db_error: null };
}

// Wrap every handler already mounted on the app (routers and plain routes) so a
// rejected promise reaches the error handler instead of parking the request.
function wrapAsyncHandlers(app) {
  const wrap = (layer) => {
    const orig = layer.handle;
    if (typeof orig !== 'function' || orig.length > 3) return; // skip error handlers
    layer.handle = function wrapped(req, res, next) {
      try {
        const out = orig.call(this, req, res, next);
        if (out && typeof out.then === 'function') out.catch(next);
      } catch (e) {
        next(e);
      }
    };
  };
  const walk = (stack) => {
    for (const layer of stack || []) {
      if (layer.route) {
        for (const l of (layer.route.stack || [])) wrap(l);
      } else if (layer.handle && layer.handle.stack) {
        walk(layer.handle.stack);
      }
    }
  };
  const router = app._router || app.router;
  if (router && router.stack) walk(router.stack);
  return app;
}

function responseTimeout(ms = Number(process.env.RESPONSE_TIMEOUT_MS || 25000)) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: 'Request timed out',
          detail: `No response within ${Math.round(ms / 1000)}s. The upstream database did not answer.`,
        });
      }
    }, ms);
    if (timer.unref) timer.unref();
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    next();
  };
}

function errorHandler(err, req, res, next) {
  const { status, error, db_error } = classify(err);
  console.error('route error:', req.method, req.originalUrl, '|', err && (err.code || err.message));
  if (res.headersSent) return next(err);
  const body = { error };
  if (db_error) body.db_error = db_error;
  res.status(status).json(body);
}

module.exports = { classify, wrapAsyncHandlers, responseTimeout, errorHandler };
