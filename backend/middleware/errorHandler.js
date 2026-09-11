export const errorHandler = (err, req, res, next) => {
  // Explicit application status codes (thrown by services)
  if (err.statusCode && err.statusCode < 500) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.code ? { code: err.code } : {})
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large. Maximum allowed request body size is 250kb.' });
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload.' });
  }

  if (err.message === 'CORS origin not allowed' || err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS origin not allowed.' });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid identifier format.' });
  }

  if (err.name === 'ValidationError') {
    const details = err.errors ? Object.values(err.errors).map(e => e.message) : [err.message];
    return res.status(400).json({ error: 'Validation error.', details });
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  // Upstream / external 5xx errors with explicit codes (e.g. AI_TIMEOUT, AI_UPSTREAM_ERROR)
  if (err.statusCode && err.statusCode >= 500 && err.code) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code
    });
  }

  // Safe logging: redact potential API keys or tokens in message
  const safeMessage = String(err?.message || err)
    .replace(/key=[^&\s]+/gi, 'key=REDACTED')
    .replace(/appid=[^&\s]+/gi, 'appid=REDACTED')
    .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer REDACTED');

  console.error('Centralized server error:', safeMessage);
  res.status(500).json({ error: 'An unexpected internal error occurred.' });
};
