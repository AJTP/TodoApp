"use strict";

async function findByProvider(pg, provider, providerUserId) {
  const { rows } = await pg.query(
    "SELECT user_id FROM identities WHERE provider = $1 AND provider_user_id = $2",
    [provider, providerUserId],
  );
  return rows[0] || null;
}

async function create(pg, userId, provider, providerUserId) {
  await pg.query(
    "INSERT INTO identities (user_id, provider, provider_user_id) VALUES ($1, $2, $3)",
    [userId, provider, providerUserId],
  );
}

module.exports = {
  findByProvider,
  create,
};
