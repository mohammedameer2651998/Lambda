// ============================================
// LOCAL DEVELOPMENT SERVER
// ============================================
// This file is ONLY used for local development.
// In Lambda, we use lambda.js instead.
// ============================================

const app = require('./app');

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💡 This is the LOCAL server. For Lambda, use lambda.js`);
});
