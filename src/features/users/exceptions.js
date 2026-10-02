"use strict";

const AppException = require("../../shared/exceptions/app-exception");

class UserNotFoundError extends AppException {
  constructor(userId) {
    super(`User not found with id '${userId}'`, 404);
  }
}

module.exports = {
  UserNotFoundError,
};
