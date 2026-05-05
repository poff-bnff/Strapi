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
      if (!data.fingerprint_hash || !data.film_id || !data.voteoption_id) return;

      const existing = await strapi.query('vote').findOne({
        film_id: data.film_id,
        voteoption_id: data.voteoption_id,
        fingerprint_hash: data.fingerprint_hash,
        from: 'film',
      });

      if (existing) {
        const err = new Error('Already voted from this device');
        err.status = 409;
        throw err;
      }
    },
  },
};
