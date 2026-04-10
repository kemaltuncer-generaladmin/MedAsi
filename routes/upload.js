const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const User = require('../models/User');
const { uploadFileToDrive } = require('../utils/driveService');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

const PACKAGE_LIMITS = {
  'Free': 0,
  'Standard': 5 * 1024 * 1024 * 1024,
  'Pro': 10 * 1024 * 1024 * 1024
};

router.post('/', upload.single('pdfFile'), async (req, res) => {
  try {
    const userId = req.body.userId;
    const file = req.file;

    if (!file) return res.status(400).json({ message: "Lütfen bir dosya yükleyin." });

    const user = await User.findById(userId);
    if (!user) {
      fs.unlinkSync(file.path);
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    if (user.storageUsed + file.size > PACKAGE_LIMITS[user.package]) {
      fs.unlinkSync(file.path);
      return res.status(403).json({ message: "Depolama kotanızı aştınız." });
    }

    const driveResponse = await uploadFileToDrive(
      file.path, file.originalname, file.mimetype, process.env.DRIVE_FOLDER_ID
    );

    user.storageUsed += file.size;
    await user.save();
    fs.unlinkSync(file.path);

    res.status(200).json({ 
      message: "Dosya başarıyla Drive'a yüklendi.",
      storageUsed: user.storageUsed,
      driveLink: driveResponse.webViewLink
    });
  } catch (error) {
    console.error("Yükleme işlemi sırasında hata:", error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;
