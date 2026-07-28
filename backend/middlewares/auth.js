// Compatibility export for older imports. Keep authorization behaviour in one middleware.
module.exports = require("./authMiddleware").authMiddleware;
