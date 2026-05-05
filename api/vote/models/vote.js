'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */

module.exports = {
  lifecycles: {
    async beforeCreate(data) {
      // Only enforce dedup for votes coming from the public film page.
      // Kiosk votes (from === 'kiosk') are intentionally allowed unlimited per fingerprint.
      if (data.from !== 'film') return;
      if (!data.film_id || !data.voteoption_id) return;

      // If we have a verified user_id (set by the check-vote policy after Bearer
      // token validation), dedup by user_id — that lets a user vote once per option
      // across browsers/devices. user_id is the immutable primary key from the
      // users-permissions User table.
      // Otherwise fall back to fingerprint dedup for anonymous voters.
      let dedupQuery;
      if (data.user_id) {
        dedupQuery = {
          film_id: data.film_id,
          voteoption_id: data.voteoption_id,
          user_id: data.user_id,
          from: 'film',
        };
      } else if (data.fingerprint_hash) {
        dedupQuery = {
          film_id: data.film_id,
          voteoption_id: data.voteoption_id,
          fingerprint_hash: data.fingerprint_hash,
          from: 'film',
        };
      } else {
        // No identity at all — let it through (the policy already validated everything else)
        return;
      }

      const existing = await strapi.query('vote').findOne(dedupQuery);

      if (existing) {
        const err = new Error('Already voted');
        err.status = 409;
        throw err;
      }
    },
  },
};
