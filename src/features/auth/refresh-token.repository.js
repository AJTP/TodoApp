"use strict";

const crypto = require("node:crypto");

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

async function create(pg, userId) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await pg.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, hashToken(rawToken), expiresAt],
  );

  return rawToken;
}

async function findValid(pg, rawToken) {
  const { rows } = await pg.query(
    `SELECT id, user_id FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [hashToken(rawToken)],
  );
  return rows[0] || null;
}

async function revoke(pg, tokenId) {
  await pg.query("UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1", [tokenId]);
}

async function revokeAllByUserId(pg, userId) {
  await pg.query(
    "UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
    [userId],
  );
}

module.exports = {
  create,
  findValid,
  revoke,
  revokeAllByUserId,
};
