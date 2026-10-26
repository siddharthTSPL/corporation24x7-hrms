// Small helper so every report error carries an HTTP status the shared
// errorhandling middleware (or our controller) can turn into a response.
const httpError = (statusCode, message, code) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
};

module.exports = { httpError };
