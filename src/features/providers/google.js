"use strict";

const { OAuth2Client } = require("google-auth-library");
const config = require("../../config");

const client = new OAuth2Client(config.googleClientId);

// Verifica un id_token de Google y devuelve el perfil normalizado que
// espera identity.service.js, independientemente del proveedor.
async function verifyGoogleIdToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: config.googleClientId,
  });
  const payload = ticket.getPayload();

  return {
    provider: "google",
    providerUserId: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: payload.name,
    avatarUrl: payload.picture,
  };
}

module.exports = {
  verifyGoogleIdToken,
};
