const multer = require('multer');

function createUploadMiddleware({ allowedMimeTypes, maxSizeMB }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error('Invalid file type'), false);
      }
      cb(null, true);
    },
  });
}

module.exports = {
  createUploadMiddleware,
}; 