import fs from "fs";
import { google } from "googleapis";

const credentialPath = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || "/Users/veyselkemal/Downloads/service_account.json";
const creds = JSON.parse(fs.readFileSync(credentialPath, "utf8"));

const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ["https://www.googleapis.com/auth/drive"],
});
const drive = google.drive({ version: "v3", auth });

async function findOrCreateRoot() {
  const list = await drive.files.list({
    q: "name='Medasi Root' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: "files(id,name)",
    pageSize: 1,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });
  const existing = list.data.files?.[0]?.id;
  if (existing) return { id: existing, created: false };

  const created = await drive.files.create({
    requestBody: {
      name: "Medasi Root",
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id,name",
    supportsAllDrives: true,
  });

  if (!created.data.id) throw new Error("Medasi Root olusturulamadi");
  return { id: created.data.id, created: true };
}

async function ensureChild(parentId, name) {
  const q = `'${parentId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const list = await drive.files.list({
    q,
    fields: "files(id,name)",
    pageSize: 1,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });
  const existing = list.data.files?.[0]?.id;
  if (existing) return existing;
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });
  if (!created.data.id) throw new Error(`${name} klasoru olusturulamadi`);
  return created.data.id;
}

async function main() {
  const root = await findOrCreateRoot();
  const usersId = await ensureChild(root.id, "03_users");
  console.log(
    JSON.stringify(
      {
        ok: true,
        rootFolderId: root.id,
        rootCreated: root.created,
        usersFolderId: usersId,
        serviceAccountEmail: creds.client_email,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});

