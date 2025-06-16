const multer = require("multer");
const { createUploadMiddleware } = require("../utils/upload");

// Multer setup for evidence uploads (memory storage, 50MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// Multer setup for event logo uploads (now using memory storage)
const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}); // 10MB limit

// Multer setup for multi-file evidence upload (memory storage, 50MB per file)
const multiUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Avatar upload using utility function
const avatarUpload = createUploadMiddleware({
  allowedMimeTypes: ["image/png", "image/jpeg"],
  maxSizeMB: 2,
});

module.exports = { upload, uploadLogo, multiUpload, avatarUpload }; 