"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
const logger_1 = require("../config/logger");
class AppError extends Error {
    statusCode;
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.AppError = AppError;
function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    // Only log full stack trace as logger.error for 500-level internal server errors
    if (statusCode >= 500) {
        logger_1.logger.error(message, { stack: err.stack, path: req.originalUrl, method: req.method });
    }
    else {
        logger_1.logger.warn(`${req.method} ${req.originalUrl} - ${statusCode}: ${message}`);
    }
    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack })
    });
}
