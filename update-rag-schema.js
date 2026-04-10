const fs = require('fs');
const path = 'prisma/schema.prisma';
let schema = fs.readFileSync(path, 'utf8');

const ragModel = `
model DocumentChunk {
  id        String   @id @default(uuid())
  title     String   // Kitap Adı
  branch    String   // Branş
  content   String   @db.Text
  embedding Unsupported("vector(768)")? // Gemini embedding boyutu (768)
  metadata  Json?
  createdAt DateTime @default(now())

  @@map("document_chunks")
}
`;

if (!schema.includes('model DocumentChunk')) {
  schema += ragModel;
  fs.writeFileSync(path, schema);
  console.log('✅ Vektör tablosu şemaya eklendi!');
}
