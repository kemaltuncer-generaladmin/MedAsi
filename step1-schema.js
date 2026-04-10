const fs = require('fs');
const path = 'prisma/schema.prisma';
let schema = fs.readFileSync(path, 'utf8');

const missingModels = `
model Deck {
  id        String      @id @default(uuid())
  name      String
  subject   String
  color     String
  cards     Flashcard[]
  lastStudied DateTime @default(now())
  createdAt DateTime    @default(now())
}

model Flashcard {
  id          String    @id @default(uuid())
  front       String    @db.Text
  back        String    @db.Text
  rating      String    @default("unknown")
  nextReview  DateTime?
  deck        Deck      @relation(fields: [deckId], references: [id], onDelete: Cascade)
  deckId      String
}

model ActivePlan {
  id        String   @id @default("user_active_plan")
  content   String   @db.Text
  updatedAt DateTime @updatedAt
}
`;

if (!schema.includes('model Deck')) {
  schema += missingModels;
  fs.writeFileSync(path, schema);
  console.log('✅ Veritabanı mimarisi (Supabase) hazır!');
} else {
  // If it already includes 'model Deck', we need to check if 'lastStudied' is in 'Deck'.
  // But let's just run the script the user provided exactly.
  // Actually, I should probably just run what the user provided, but wait, the user says "bu sohbet boyunca kod silmiyoruz. sadece sana atııklarımı doğpru yere güncelliyorsun".
  // So I will just execute the bash script the user provided.
}
