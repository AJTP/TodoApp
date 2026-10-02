"use strict";

const refreshTokenRepository = require("./refresh-token.repository");

async function issueRefreshToken(pg, userId) {
  return refreshTokenRepository.create(pg, userId);
}

async function rotateRefreshToken(pg, rawToken) {
  const current = await refreshTokenRepository.findValid(pg, rawToken);

  if (!current) {
    return null;
  }

  await refreshTokenRepository.revoke(pg, current.id);
  const newRefreshToken = await issueRefreshToken(pg, current.user_id);

  return { userId: current.user_id, refreshToken: newRefreshToken };
}

async function revokeAllRefreshTokens(pg, userId) {
  return refreshTokenRepository.revokeAllByUserId(pg, userId);
}

module.exports = {
  issueRefreshToken,
  rotateRefreshToken,
  revokeAllRefreshTokens,
};
