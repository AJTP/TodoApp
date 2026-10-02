"use strict";

const userRepository = require("./user.repository");
const { UserNotFoundError } = require("./exceptions");

async function getUserById(pg, userId) {
  const user = await userRepository.findById(pg, userId);
  if (!user) {
    throw new UserNotFoundError(userId);
  }
  return user;
}

async function getUserByEmail(pg, email) {
  return userRepository.findByEmail(pg, email);
}

async function createUser(pg, userData) {
  return userRepository.create(pg, userData);
}

module.exports = {
  getUserById,
  getUserByEmail,
  createUser,
};
