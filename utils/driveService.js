const { google } = require('googleapis');
const fs = require('fs');

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

async function uploadFileToDrive(filePath, fileName, mimeType, folderId) {
  try {
    const fileMetadata = { name: fileName, parents: [folderId] };
    const media = { mimeType: mimeType, body: fs.createReadStream(filePath) };
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });
    return response.data;
  } catch (error) {
    console.error("Google Drive Yükleme Hatası:", error);
    throw error;
  }
}

module.exports = { uploadFileToDrive };
