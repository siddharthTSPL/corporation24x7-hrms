class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.statusCode = status; // your errorhandling middleware reads statusCode
    this.details = details;
  }
}
module.exports = { AppError };
