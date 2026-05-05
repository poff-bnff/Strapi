'use strict';

/**
 * `check-vote` policy.
 *
 * Validates incoming POST /votes requests:
 * 1. Origin/Referer must be from an allowed domain (raises bar for casual abuse)
 * 2. Per-IP rate limit, separate budget for `from === 'film'` vs `from === 'kiosk'`
 * 3. film_id and voteoption_id must be numeric strings referencing real records
 * 4. `from` must be 'film' or 'kiosk'
 *
 * Errors are returned with appropriate HTTP status; the lifecycle hook in
 * api/vote/models/vote.js still runs after this policy passes (for fingerprint dedup).
 */

// Allowed origins — accepts any subdomain of these registered festival domains, plus localhost for dev.
const ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1|([a-z0-9-]+\.)*((hoff\.ee)|(poff\.ee)|(justfilm\.ee)|(oyafond\.ee)|(tartuff\.ee)))(:\d+)?($|\/)/;

// Rate limits per IP, sliding window of 60 seconds
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMITS = {
  film: 30,    // 30 votes/min from a single IP — generous for legitimate users (1 user × 4 options + retries)
  kiosk: 600,  // 600 votes/min from a single IP — generous for cinema crowd (10 users tapping per second)
};

// In-memory rate-limit store: ip -> { film: [timestamps], kiosk: [timestamps] }
const rateLimitStore = new Map();

// Periodic cleanup of stale IP entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, buckets] of rateLimitStore.entries()) {
    buckets.film = (buckets.film || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    buckets.kiosk = (buckets.kiosk || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (!buckets.film.length && !buckets.kiosk.length) {
      rateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

module.exports = async (ctx, next) => {
  const body = ctx.request.body || {};
  const { from, film_id, voteoption_id } = body;

  // 1. `from` must be one we accept
  if (from !== 'film' && from !== 'kiosk') {
    return ctx.badRequest('Invalid "from" value');
  }

  // 2. Origin/Referer check
  const origin = ctx.request.header.origin || ctx.request.header.referer || '';
  if (!ORIGIN_REGEX.test(origin)) {
    return ctx.forbidden('Invalid origin');
  }

  // 3. Rate limit per (IP, from) pair
  const ip = ctx.request.ip;
  const now = Date.now();
  const buckets = rateLimitStore.get(ip) || { film: [], kiosk: [] };
  const recent = (buckets[from] || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMITS[from]) {
    return ctx.tooManyRequests('Rate limit exceeded');
  }
  recent.push(now);
  buckets[from] = recent;
  rateLimitStore.set(ip, buckets);

  // 4. ID validation — must be numeric strings
  if (!film_id || !/^\d+$/.test(String(film_id))) {
    return ctx.badRequest('Invalid film_id');
  }
  if (!voteoption_id || !/^\d+$/.test(String(voteoption_id))) {
    return ctx.badRequest('Invalid voteoption_id');
  }

  // 5. Verify film_id and voteoption_id reference real records
  const filmIdInt = parseInt(film_id, 10);
  const voteOptionIdInt = parseInt(voteoption_id, 10);

  try {
    const [film, voteOption] = await Promise.all([
      strapi.query('film').findOne({ id: filmIdInt }),
      strapi.query('vote-options').findOne({ id: voteOptionIdInt }),
    ]);
    if (!film) return ctx.badRequest('Unknown film_id');
    if (!voteOption) return ctx.badRequest('Unknown voteoption_id');
  } catch (e) {
    strapi.log.error('check-vote policy DB lookup failed', e);
    return ctx.badRequest('Unable to validate vote');
  }

  await next();
};
