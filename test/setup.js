"use strict";

const build = require("../src/app");

async function buildTestApp() {
  const app = build();
  await app.ready();
  return app;
}

async function truncateAll(app) {
  await app.pg.query("TRUNCATE TABLE users RESTART IDENTITY CASCADE");
}

module.exports = {
  buildTestApp,
  truncateAll,
};
