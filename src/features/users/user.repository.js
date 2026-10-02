"use strict";

async function findById(pg, userId) {
  const { rows } = await pg.query(
    "SELECT id, name, email, avatar_url, created_at FROM users WHERE id = $1",
    [userId],
  );
  return rows[0] || null;
}

async function findByEmail(pg, email) {
  const { rows } = await pg.query(
    "SELECT id, name, email, avatar_url, created_at FROM users WHERE email = $1",
    [email],
  );
  return rows[0] || null;
}

async function create(pg, userData) {
  const { name, email, avatarUrl } = userData;
  const { rows } = await pg.query(
    "INSERT INTO users (name, email, avatar_url) VALUES ($1, $2, $3) RETURNING id, name, email, avatar_url, created_at",
    [name, email, avatarUrl],
  );
  return rows[0];
}

module.exports = {
  findById,
  findByEmail,
  create,
};
