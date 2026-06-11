import multer from 'multer';
import path from 'path';
import fs from 'fs';

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads/';
    if (file.fieldname === 'profilePicture') folder += 'profiles/';
    else if (file.fieldname === 'attachments') folder += 'assignments/';
    else if (file.fieldname === 'file') folder += 'submissions/';
    else if (file.fieldname === 'logo') folder += 'logos/';
    ensureDir(folder);
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) cb(null, true);
  else cb(new Error('Only images, PDFs, and Word documents are allowed'));
};

export const uploadProfilePicture = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
export const uploadAssignmentFile = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
export const uploadSubmissionFile = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
export const uploadLogo = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });
