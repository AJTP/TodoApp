"use strict";

const identityRepository = require("./identity.repository");
const userService = require("../users/user.service");
const { UnverifiedEmailError } = require("./exceptions");

async function findOrCreateUserFromIdentity(pg, profile) {
  const { provider, providerUserId, email, emailVerified, name, avatarUrl } = profile;

  if (!emailVerified) {
    throw new UnverifiedEmailError(provider);
  }

  const identity = await identityRepository.findByProvider(pg, provider, providerUserId);

  if (identity) {
    return userService.getUserById(pg, identity.user_id);
  }

  const client = await pg.connect();
  try {
    await client.query("BEGIN");

    let user = await userService.getUserByEmail(pg, email);

    if (!user) {
      user = await userService.createUser(pg, { name, email, avatarUrl });
    }

    await identityRepository.create(pg, user.id, provider, providerUserId);

    await client.query("COMMIT");
    return user;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  findOrCreateUserFromIdentity,
};
