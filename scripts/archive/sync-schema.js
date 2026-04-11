const fs = require('fs');
const path = 'prisma/schema.prisma';
let schema = fs.readFileSync(path, 'utf8');

// Eksik tabloları ve ilişkileri ekleyelim
const newModels = `
model Deck {
  id        String   @id @default(uuid())
  name      String
  subject   String
  color     String
  cards     Flashcard[]
  createdAt DateTime @default(now())
}

model Flashcard {
  id          String   @id @default(uuid())
  front       String   @db.Text
  back        String   @db.Text
  rating      String   @default("unknown")
  nextReview  DateTime?
  deck        Deck     @relation(fields: [deckId], references: [id], onDelete: Cascade)
  deckId      String
}

model ActivePlan {
  id        String   @id @default("user_active_plan")
  content   String   @db.Text
  updatedAt DateTime @updatedAt
}
`;

if (!schema.includes('model Deck')) {
  schema += newModels;
  fs.writeFileSync(path, schema);
  console.log('✅ Şema Supabase senkronizasyonu için güncellendi!');
}
