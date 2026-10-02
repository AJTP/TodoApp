"use strict";

const AppException = require("../../shared/exceptions/app-exception");

class UnverifiedEmailError extends AppException {
  constructor(provider) {
    super(`Email not verified by provider '${provider}'`, 401);
  }
}

module.exports = {
  UnverifiedEmailError,
};
