import { prisma } from "@/lib/prisma";
import { ensureStudyCoreSchema } from "@/lib/db/schema-guard";
import type {
  FlashcardDeck,
  MaterialQualityReport,
  MaterialSlideInsight,
  StudyPlan,
  StudyRecommendation,
  StudyWorkspace,
  WrongQuestionEntry,
} from "@/types";

type MaterialRow = {
  id: string;
  name: string;
  status: string;
  source: string;
  branch: string;
  chunkCount: number;
  pageCount: number | null;
  slideCount: number | null;
  qualityScore: number | null;
  extractionConfidence: number | null;
  readyForQuestions: boolean;
  readyForFlashcards: boolean;
  processingStage: string;
  errorMessage: string | null;
  driveWebViewLink: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MaterialMark = {
  id: string;
  slideNo: number | null;
  color: string;
  note: string;
  createdAt: Date;
};

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeDifficulty(value: unknown): WrongQuestionEntry["difficulty"] {
  if (value === "Kolay" || value === "Zor") return value;
  return "Orta";
}

function getWeekKey(timeZone = "Europe/Istanbul") {
  const date = new Date(
    new Date().toLocaleString("en-US", {
      timeZone,
    }),
  );
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

function mapWrongRow(row: any): WrongQuestionEntry {
  return {
    id: row.id,
    sourceQuestionId: row.sourceQuestionId ?? null,
    subject: row.subject,
    difficulty: normalizeDifficulty(row.difficulty),
    questionText: row.questionText,
    options: Array.isArray(row.options) ? row.options : [],
    correctAnswer: Number(row.correctAnswer ?? 0),
    userAnswer: Number(row.userAnswer ?? 0),
    explanation: row.explanation ?? null,
    learned: Boolean(row.learned),
    addedAt: new Date(row.addedAt).toISOString(),
    learnedAt: row.learnedAt ? new Date(row.learnedAt).toISOString() : null,
  };
}

export async function listWrongQuestions(userId: string): Promise<WrongQuestionEntry[]> {
  await ensureStudyCoreSchema();
  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      id,
      source_question_id AS "sourceQuestionId",
      subject,
      difficulty,
      question_text AS "questionText",
      options,
      correct_answer AS "correctAnswer",
      user_answer AS "userAnswer",
      explanation,
      learned,
      added_at AS "addedAt",
      learned_at AS "learnedAt"
    FROM public.user_wrong_questions
    WHERE user_id = ${userId}
    ORDER BY added_at DESC
  `;
  return rows.map(mapWrongRow);
}

export async function createWrongQuestion(
  userId: string,
  input: Omit<WrongQuestionEntry, "id" | "addedAt" | "learnedAt"> & { addedAt?: string },
) {
  await ensureStudyCoreSchema();
  const rows = await prisma.$queryRaw<any[]>`
    INSERT INTO public.user_wrong_questions (
      user_id,
      source_question_id,
      subject,
      difficulty,
      question_text,
      options,
      correct_answer,
      user_answer,
      explanation,
      learned,
      added_at,
      learned_at
    )
    VALUES (
      ${userId},
      ${input.sourceQuestionId ?? null},
      ${input.subject},
      ${normalizeDifficulty(input.difficulty)},
      ${input.questionText},
      ${JSON.stringify(input.options)}::jsonb,
      ${input.correctAnswer},
      ${input.userAnswer},
      ${input.explanation ?? null},
      ${input.learned},
      ${input.addedAt ? new Date(input.addedAt) : new Date()},
      ${input.learned ? new Date() : null}
    )
    RETURNING
      id,
      source_question_id AS "sourceQuestionId",
      subject,
      difficulty,
      question_text AS "questionText",
      options,
      correct_answer AS "correctAnswer",
      user_answer AS "userAnswer",
      explanation,
      learned,
      added_at AS "addedAt",
      learned_at AS "learnedAt"
  `;
  return mapWrongRow(rows[0]);
}

export async function importWrongQuestions(
  userId: string,
  entries: Array<Partial<WrongQuestionEntry>>,
): Promise<number> {
  await ensureStudyCoreSchema();
  let inserted = 0;
  for (const entry of entries) {
    const questionText = typeof entry.questionText === "string" ? entry.questionText.trim() : "";
    if (!questionText) continue;
    await createWrongQuestion(userId, {
      sourceQuestionId: entry.sourceQuestionId ?? null,
      subject: typeof entry.subject === "string" && entry.subject.trim() ? entry.subject : "Genel",
      difficulty: normalizeDifficulty(entry.difficulty),
      questionText,
      options: Array.isArray(entry.options) ? entry.options.map((item) => String(item)) : [],
      correctAnswer: Number(entry.correctAnswer ?? 0),
      userAnswer: Number(entry.userAnswer ?? 0),
      explanation: typeof entry.explanation === "string" ? entry.explanation : null,
      learned: Boolean(entry.learned),
      addedAt: typeof entry.addedAt === "string" ? entry.addedAt : undefined,
    });
    inserted += 1;
  }
  return inserted;
}

export async function replaceWrongQuestions(
  userId: string,
  entries: Array<Partial<WrongQuestionEntry>>,
): Promise<number> {
  await ensureStudyCoreSchema();
  await prisma.$executeRaw`
    DELETE FROM public.user_wrong_questions
    WHERE user_id = ${userId}
  `;
  return importWrongQuestions(userId, entries);
}

export async function updateWrongQuestion(
  userId: string,
  id: string,
  input: { learned?: boolean },
) {
  await ensureStudyCoreSchema();
  const rows = await prisma.$queryRaw<any[]>`
    UPDATE public.user_wrong_questions
    SET
      learned = COALESCE(${input.learned ?? null}, learned),
      learned_at = CASE
        WHEN ${input.learned ?? null} = true THEN NOW()
        WHEN ${input.learned ?? null} = false THEN NULL
        ELSE learned_at
      END
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING
      id,
      source_question_id AS "sourceQuestionId",
      subject,
      difficulty,
      question_text AS "questionText",
      options,
      correct_answer AS "correctAnswer",
      user_answer AS "userAnswer",
      explanation,
      learned,
      added_at AS "addedAt",
      learned_at AS "learnedAt"
  `;
  return rows[0] ? mapWrongRow(rows[0]) : null;
}

export async function deleteWrongQuestion(userId: string, id: string) {
  await ensureStudyCoreSchema();
  await prisma.$executeRaw`
    DELETE FROM public.user_wrong_questions
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

function mapDeckRows(rows: any[]): FlashcardDeck[] {
  const map = new Map<string, FlashcardDeck>();
  for (const row of rows) {
    const existing: FlashcardDeck = map.get(row.id) ?? {
      id: row.id,
      name: row.name,
      subject: row.subject,
      color: row.color,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
      cards: [],
    };
    if (row.cardId) {
      existing.cards.push({
        id: row.cardId,
        front: row.front,
        back: row.back,
        rating: row.rating ?? "unknown",
        nextReview: row.nextReview ? new Date(row.nextReview).toISOString() : null,
        lastStudiedAt: row.lastStudiedAt ? new Date(row.lastStudiedAt).toISOString() : null,
        createdAt: new Date(row.cardCreatedAt).toISOString(),
      });
    }
    map.set(row.id, existing);
  }
  return Array.from(map.values());
}

export async function listFlashcardDecks(userId: string): Promise<FlashcardDeck[]> {
  await ensureStudyCoreSchema();
  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      d.id,
      d.name,
      d.subject,
      d.color,
      d.created_at AS "createdAt",
      d.updated_at AS "updatedAt",
      c.id AS "cardId",
      c.front,
      c.back,
      c.rating,
      c.next_review AS "nextReview",
      c.last_studied_at AS "lastStudiedAt",
      c.created_at AS "cardCreatedAt"
    FROM public.user_flashcard_decks d
    LEFT JOIN public.user_flashcard_cards c ON c.deck_id = d.id
    WHERE d.user_id = ${userId}
    ORDER BY d.updated_at DESC, c.position ASC, c.created_at ASC
  `;
  return mapDeckRows(rows);
}

export async function replaceFlashcardDecks(
  userId: string,
  decks: Array<Partial<FlashcardDeck>>,
): Promise<FlashcardDeck[]> {
  await ensureStudyCoreSchema();
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      DELETE FROM public.user_flashcard_decks
      WHERE user_id = ${userId}
    `;

    for (const [deckIndex, deck] of decks.entries()) {
      const deckId = typeof deck.id === "string" && deck.id.trim() ? deck.id : `deck_${Date.now()}_${deckIndex}`;
      await tx.$executeRaw`
        INSERT INTO public.user_flashcard_decks (
          id, user_id, name, subject, color, created_at, updated_at
        )
        VALUES (
          ${deckId},
          ${userId},
          ${deck.name?.trim() || "İsimsiz Deste"},
          ${deck.subject?.trim() || "Genel"},
          ${deck.color?.trim() || "#6366f1"},
          ${deck.createdAt ? new Date(deck.createdAt) : new Date()},
          NOW()
        )
      `;

      const cards = Array.isArray(deck.cards) ? deck.cards : [];
      for (const [cardIndex, card] of cards.entries()) {
        await tx.$executeRaw`
          INSERT INTO public.user_flashcard_cards (
            id, deck_id, user_id, front, back, rating, position, next_review, last_studied_at, created_at, updated_at
          )
          VALUES (
            ${card.id || `${deckId}_card_${cardIndex}`},
            ${deckId},
            ${userId},
            ${card.front?.trim() || "Ön yüz"},
            ${card.back?.trim() || "Arka yüz"},
            ${card.rating || "unknown"},
            ${cardIndex},
            ${card.nextReview ? new Date(card.nextReview) : null},
            ${card.lastStudiedAt ? new Date(card.lastStudiedAt) : null},
            ${card.createdAt ? new Date(card.createdAt) : new Date()},
            NOW()
          )
        `;
      }
    }
  });

  return listFlashcardDecks(userId);
}

export async function saveStudyPlan(
  userId: string,
  input: { weekKey?: string; sourceSummary?: string; content: string },
): Promise<StudyPlan> {
  await ensureStudyCoreSchema();
  const weekKey = input.weekKey ?? getWeekKey();
  const rows = await prisma.$queryRaw<any[]>`
    INSERT INTO public.user_study_plans (
      user_id, week_key, source_summary, content, created_at, updated_at
    )
    VALUES (
      ${userId},
      ${weekKey},
      ${input.sourceSummary ?? ""},
      ${input.content},
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, week_key)
    DO UPDATE SET
      source_summary = EXCLUDED.source_summary,
      content = EXCLUDED.content,
      updated_at = NOW()
    RETURNING
      id,
      week_key AS "weekKey",
      source_summary AS "sourceSummary",
      content,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;
  const row = rows[0];
  return {
    id: row.id,
    weekKey: row.weekKey,
    sourceSummary: row.sourceSummary,
    content: row.content,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function getStudyPlan(userId: string, weekKey = getWeekKey()): Promise<StudyPlan | null> {
  await ensureStudyCoreSchema();
  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      id,
      week_key AS "weekKey",
      source_summary AS "sourceSummary",
      content,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM public.user_study_plans
    WHERE user_id = ${userId} AND week_key = ${weekKey}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    weekKey: row.weekKey,
    sourceSummary: row.sourceSummary,
    content: row.content,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function listStudyRecommendations(userId: string): Promise<StudyRecommendation[]> {
  await ensureStudyCoreSchema();
  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      id,
      kind,
      title,
      body,
      href,
      score,
      created_at AS "createdAt"
    FROM public.user_study_recommendations
    WHERE user_id = ${userId}
      AND dismissed_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY score DESC, created_at DESC
    LIMIT 6
  `;
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href ?? null,
    score: Number(row.score ?? 0),
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}

export async function refreshDerivedStudyRecommendations(userId: string) {
  await ensureStudyCoreSchema();
  const [wrongs, decks, materials, profile] = await Promise.all([
    listWrongQuestions(userId),
    listFlashcardDecks(userId),
    prisma.$queryRaw<MaterialRow[]>`
      SELECT
        id,
        name,
        status,
        source,
        branch,
        chunk_count AS "chunkCount",
        page_count AS "pageCount",
        slide_count AS "slideCount",
        quality_score AS "qualityScore",
        extraction_confidence AS "extractionConfidence",
        ready_for_questions AS "readyForQuestions",
        ready_for_flashcards AS "readyForFlashcards",
        processing_stage AS "processingStage",
        error_message AS "errorMessage",
        drive_web_view_link AS "driveWebViewLink",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM public.user_materials
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
      LIMIT 4
    `,
    prisma.studentLearningProfile.findUnique({
      where: { userId },
      select: { weakAreas: true },
    }),
  ]);

  await prisma.$executeRaw`
    DELETE FROM public.user_study_recommendations
    WHERE user_id = ${userId} AND kind IN ('wrong-questions', 'flashcards', 'materials', 'weak-area')
  `;

  const inserts: Array<{ kind: string; title: string; body: string; href: string; score: number }> = [];
  if (wrongs.filter((item) => !item.learned).length > 0) {
    inserts.push({
      kind: "wrong-questions",
      title: "Hatalı sorular birikti",
      body: `${wrongs.filter((item) => !item.learned).length} soru tekrar bekliyor.`,
      href: "/questions/hatali",
      score: 92,
    });
  }
  const dueCards = decks.flatMap((deck) => deck.cards).filter((card) =>
    !card.nextReview || new Date(card.nextReview) <= new Date(),
  ).length;
  if (dueCards > 0) {
    inserts.push({
      kind: "flashcards",
      title: "Tekrar zamanı gelen kartlar var",
      body: `${dueCards} kart bugün gözden geçirilmeli.`,
      href: "/flashcards/flashcard",
      score: 88,
    });
  }
  const bestMaterial = materials.find((item) => item.status === "ready");
  if (bestMaterial) {
    inserts.push({
      kind: "materials",
      title: "Materyalden üretim yap",
      body: `${bestMaterial.name} için soru/flashcard üretimine geçebilirsin.`,
      href: "/materials",
      score: 84,
    });
  }
  const weakAreas = safeStringArray(profile?.weakAreas);
  if (weakAreas[0]) {
    inserts.push({
      kind: "weak-area",
      title: "Ana zayıf alanına yüklen",
      body: `Bugün ${weakAreas[0]} üzerine plan ve soru pratiği kur.`,
      href: "/questions",
      score: 86,
    });
  }

  for (const insert of inserts) {
    await prisma.$executeRaw`
      INSERT INTO public.user_study_recommendations (
        user_id, kind, title, body, href, score, created_at
      )
      VALUES (
        ${userId},
        ${insert.kind},
        ${insert.title},
        ${insert.body},
        ${insert.href},
        ${insert.score},
        NOW()
      )
    `;
  }
}

export async function getStudyWorkspace(userId: string): Promise<StudyWorkspace> {
  await ensureStudyCoreSchema();
  const [wrongs, decks, materials, plan, recommendations, profile] = await Promise.all([
    listWrongQuestions(userId),
    listFlashcardDecks(userId),
    prisma.$queryRaw<MaterialRow[]>`
      SELECT
        id,
        name,
        status,
        source,
        branch,
        chunk_count AS "chunkCount",
        page_count AS "pageCount",
        slide_count AS "slideCount",
        quality_score AS "qualityScore",
        extraction_confidence AS "extractionConfidence",
        ready_for_questions AS "readyForQuestions",
        ready_for_flashcards AS "readyForFlashcards",
        processing_stage AS "processingStage",
        error_message AS "errorMessage",
        drive_web_view_link AS "driveWebViewLink",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM public.user_materials
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
      LIMIT 5
    `,
    getStudyPlan(userId),
    listStudyRecommendations(userId),
    prisma.studentLearningProfile.findUnique({
      where: { userId },
      select: {
        weakAreas: true,
        strongAreas: true,
        totalQuestions: true,
        totalCorrect: true,
        motivationScore: true,
      },
    }),
  ]);

  const dueFlashcards = decks.flatMap((deck) => deck.cards).filter((card) =>
    !card.nextReview || new Date(card.nextReview) <= new Date(),
  ).length;
  const totalQuestions = profile?.totalQuestions ?? 0;
  const accuracy = totalQuestions > 0
    ? Math.round(((profile?.totalCorrect ?? 0) / totalQuestions) * 100)
    : 0;

  return {
    focus: {
      weakAreas: safeStringArray(profile?.weakAreas).slice(0, 3),
      strongAreas: safeStringArray(profile?.strongAreas).slice(0, 3),
      motivationScore: profile?.motivationScore ?? null,
      accuracy,
    },
    counts: {
      wrongQuestions: wrongs.filter((item) => !item.learned).length,
      flashcardDecks: decks.length,
      flashcardsDue: dueFlashcards,
      readyMaterials: materials.filter((item) => item.status === "ready").length,
      activePlan: Boolean(plan?.content?.trim()),
    },
    plan,
    recommendations,
    highlights: [
      {
        label: "Hatalı Sorular",
        value: `${wrongs.filter((item) => !item.learned).length} aktif`,
        href: "/questions/hatali",
        tone: wrongs.filter((item) => !item.learned).length > 0 ? "warning" : "success",
      },
      {
        label: "Flashcard Tekrarı",
        value: `${dueFlashcards} kart`,
        href: "/flashcards/flashcard",
        tone: dueFlashcards > 0 ? "primary" : "success",
      },
      {
        label: "Materyal Hazırlığı",
        value: `${materials.filter((item) => item.status === "ready").length} hazır`,
        href: "/materials",
        tone: "primary",
      },
    ],
    materials: materials.map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
      branch: item.branch,
      qualityScore: item.qualityScore,
      slideCount: item.slideCount,
      readyForQuestions: item.readyForQuestions,
      readyForFlashcards: item.readyForFlashcards,
    })),
  };
}

export async function recordMaterialProcessingEvent(
  userId: string,
  materialId: string,
  stage: string,
  status: string,
  message: string,
  details: Record<string, unknown> = {},
) {
  await ensureStudyCoreSchema();
  await prisma.$executeRaw`
    INSERT INTO public.user_material_processing_events (
      user_id, material_id, stage, status, message, details, created_at
    )
    VALUES (
      ${userId},
      ${materialId},
      ${stage},
      ${status},
      ${message},
      ${JSON.stringify(details)}::jsonb,
      NOW()
    )
  `;
}

export async function updateMaterialStudyMetadata(
  materialId: string,
  input: {
    processingStage?: string;
    qualityScore?: number | null;
    extractionConfidence?: number | null;
    slideCount?: number | null;
    readyForQuestions?: boolean;
    readyForFlashcards?: boolean;
  },
) {
  await ensureStudyCoreSchema();
  await prisma.$executeRaw`
    UPDATE public.user_materials
    SET
      processing_stage = COALESCE(${input.processingStage ?? null}, processing_stage),
      quality_score = COALESCE(${input.qualityScore ?? null}, quality_score),
      extraction_confidence = COALESCE(${input.extractionConfidence ?? null}, extraction_confidence),
      slide_count = COALESCE(${input.slideCount ?? null}, slide_count),
      ready_for_questions = COALESCE(${input.readyForQuestions ?? null}, ready_for_questions),
      ready_for_flashcards = COALESCE(${input.readyForFlashcards ?? null}, ready_for_flashcards),
      last_analyzed_at = CASE
        WHEN ${input.qualityScore ?? null} IS NOT NULL THEN NOW()
        ELSE last_analyzed_at
      END,
      updated_at = NOW()
    WHERE id = ${materialId}
  `;
}

export async function saveMaterialAnalysis(
  userId: string,
  materialId: string,
  report: MaterialQualityReport,
  slides: MaterialSlideInsight[],
) {
  await ensureStudyCoreSchema();
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO public.user_material_analysis (
        user_id, material_id, summary, quality_score, extraction_confidence, slide_count, chunk_coverage,
        readability_score, density_score, exam_relevance_score, clinical_relevance_score,
        flashcard_readiness, question_readiness, strengths, issues, recommendations, metadata, created_at, updated_at
      )
      VALUES (
        ${userId},
        ${materialId},
        ${report.summary},
        ${report.qualityScore},
        ${report.extractionConfidence},
        ${report.slideCount},
        ${report.chunkCoverage},
        ${report.readabilityScore},
        ${report.densityScore},
        ${report.examRelevanceScore},
        ${report.clinicalRelevanceScore},
        ${report.flashcardReadiness},
        ${report.questionReadiness},
        ${JSON.stringify(report.strengths)}::jsonb,
        ${JSON.stringify(report.issues)}::jsonb,
        ${JSON.stringify(report.recommendations)}::jsonb,
        ${JSON.stringify({ source: "material-agent-v2" })}::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (material_id)
      DO UPDATE SET
        summary = EXCLUDED.summary,
        quality_score = EXCLUDED.quality_score,
        extraction_confidence = EXCLUDED.extraction_confidence,
        slide_count = EXCLUDED.slide_count,
        chunk_coverage = EXCLUDED.chunk_coverage,
        readability_score = EXCLUDED.readability_score,
        density_score = EXCLUDED.density_score,
        exam_relevance_score = EXCLUDED.exam_relevance_score,
        clinical_relevance_score = EXCLUDED.clinical_relevance_score,
        flashcard_readiness = EXCLUDED.flashcard_readiness,
        question_readiness = EXCLUDED.question_readiness,
        strengths = EXCLUDED.strengths,
        issues = EXCLUDED.issues,
        recommendations = EXCLUDED.recommendations,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `;

    await tx.$executeRaw`
      DELETE FROM public.user_material_slide_insights
      WHERE material_id = ${materialId}
    `;

    for (const slide of slides) {
      await tx.$executeRaw`
        INSERT INTO public.user_material_slide_insights (
          user_id, material_id, slide_no, title, extracted_text, text_density, quality_score,
          has_visual_gap, duplicate_risk, key_points, warnings, created_at, updated_at
        )
        VALUES (
          ${userId},
          ${materialId},
          ${slide.slideNo},
          ${slide.title ?? null},
          ${slide.extractedText},
          ${slide.textDensity},
          ${slide.qualityScore},
          ${slide.hasVisualGap},
          ${slide.duplicateRisk},
          ${JSON.stringify(slide.keyPoints)}::jsonb,
          ${JSON.stringify(slide.warnings)}::jsonb,
          NOW(),
          NOW()
        )
      `;
    }
  });

  await updateMaterialStudyMetadata(materialId, {
    processingStage: "ready",
    qualityScore: report.qualityScore,
    extractionConfidence: report.extractionConfidence,
    slideCount: report.slideCount,
    readyForQuestions: report.questionReadiness >= 60,
    readyForFlashcards: report.flashcardReadiness >= 60,
  });
}

export async function getMaterialTextForAnalysis(userId: string, materialId: string): Promise<string> {
  await ensureStudyCoreSchema();
  const rows = await prisma.$queryRaw<Array<{ content: string }>>`
    SELECT content
    FROM public.user_document_chunks
    WHERE user_id = ${userId}
      AND material_id = ${materialId}
    ORDER BY COALESCE((metadata->>'chunk_index')::int, 0) ASC, created_at ASC
  `;
  return rows.map((row) => row.content).join("\n\n");
}

export async function getMaterialDetail(userId: string, materialId: string) {
  await ensureStudyCoreSchema();
  const [materialRows, analysisRows, slideRows, markRows, eventRows] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT
        id,
        name,
        type,
        status,
        source,
        branch,
        chunk_count AS "chunkCount",
        page_count AS "pageCount",
        slide_count AS "slideCount",
        quality_score AS "qualityScore",
        extraction_confidence AS "extractionConfidence",
        ready_for_questions AS "readyForQuestions",
        ready_for_flashcards AS "readyForFlashcards",
        processing_stage AS "processingStage",
        error_message AS "errorMessage",
        drive_web_view_link AS "driveWebViewLink",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM public.user_materials
      WHERE user_id = ${userId} AND id = ${materialId}
      LIMIT 1
    `,
    prisma.$queryRaw<any[]>`
      SELECT
        summary,
        quality_score AS "qualityScore",
        extraction_confidence AS "extractionConfidence",
        slide_count AS "slideCount",
        chunk_coverage AS "chunkCoverage",
        readability_score AS "readabilityScore",
        density_score AS "densityScore",
        exam_relevance_score AS "examRelevanceScore",
        clinical_relevance_score AS "clinicalRelevanceScore",
        flashcard_readiness AS "flashcardReadiness",
        question_readiness AS "questionReadiness",
        strengths,
        issues,
        recommendations
      FROM public.user_material_analysis
      WHERE user_id = ${userId} AND material_id = ${materialId}
      LIMIT 1
    `,
    prisma.$queryRaw<any[]>`
      SELECT
        id,
        slide_no AS "slideNo",
        title,
        extracted_text AS "extractedText",
        text_density AS "textDensity",
        quality_score AS "qualityScore",
        has_visual_gap AS "hasVisualGap",
        duplicate_risk AS "duplicateRisk",
        key_points AS "keyPoints",
        warnings
      FROM public.user_material_slide_insights
      WHERE user_id = ${userId} AND material_id = ${materialId}
      ORDER BY slide_no ASC
    `,
    prisma.$queryRaw<MaterialMark[]>`
      SELECT
        id,
        slide_no AS "slideNo",
        color,
        note,
        created_at AS "createdAt"
      FROM public.user_material_marks
      WHERE user_id = ${userId} AND material_id = ${materialId}
      ORDER BY created_at DESC
    `,
    prisma.$queryRaw<any[]>`
      SELECT
        id,
        stage,
        status,
        message,
        details,
        created_at AS "createdAt"
      FROM public.user_material_processing_events
      WHERE user_id = ${userId} AND material_id = ${materialId}
      ORDER BY created_at DESC
      LIMIT 20
    `,
  ]);

  const material = materialRows[0];
  if (!material) return null;

  const analysis = analysisRows[0]
    ? {
        summary: analysisRows[0].summary ?? "",
        qualityScore: analysisRows[0].qualityScore ?? 0,
        extractionConfidence: analysisRows[0].extractionConfidence ?? 0,
        slideCount: analysisRows[0].slideCount ?? 0,
        chunkCoverage: analysisRows[0].chunkCoverage ?? 0,
        readabilityScore: analysisRows[0].readabilityScore ?? 0,
        densityScore: analysisRows[0].densityScore ?? 0,
        examRelevanceScore: analysisRows[0].examRelevanceScore ?? 0,
        clinicalRelevanceScore: analysisRows[0].clinicalRelevanceScore ?? 0,
        flashcardReadiness: analysisRows[0].flashcardReadiness ?? 0,
        questionReadiness: analysisRows[0].questionReadiness ?? 0,
        strengths: safeStringArray(analysisRows[0].strengths),
        issues: safeStringArray(analysisRows[0].issues),
        recommendations: safeStringArray(analysisRows[0].recommendations),
      }
    : null;

  const slides: MaterialSlideInsight[] = slideRows.map((row) => ({
    id: row.id,
    slideNo: Number(row.slideNo ?? 0),
    title: row.title ?? null,
    extractedText: row.extractedText ?? "",
    textDensity: Number(row.textDensity ?? 0),
    qualityScore: Number(row.qualityScore ?? 0),
    hasVisualGap: Boolean(row.hasVisualGap),
    duplicateRisk: Boolean(row.duplicateRisk),
    keyPoints: safeStringArray(row.keyPoints),
    warnings: safeStringArray(row.warnings),
  }));

  return {
    material: {
      ...material,
      createdAt: new Date(material.createdAt).toISOString(),
      updatedAt: new Date(material.updatedAt).toISOString(),
    },
    analysis,
    slides,
    marks: markRows.map((row) => ({
      id: row.id,
      slideNo: row.slideNo,
      color: row.color,
      note: row.note,
      createdAt: new Date(row.createdAt).toISOString(),
    })),
    events: eventRows.map((row) => ({
      id: row.id,
      stage: row.stage,
      status: row.status,
      message: row.message,
      details: row.details ?? {},
      createdAt: new Date(row.createdAt).toISOString(),
    })),
    actions: [
      analysis?.questionReadiness >= 60
        ? { label: "Sorulara dönüştür", href: "/questions/bank", enabled: true }
        : { label: "Sorulara dönüştür", href: "/questions/bank", enabled: false },
      analysis?.flashcardReadiness >= 60
        ? { label: "Flashcard üret", href: "/flashcards/flashcard", enabled: true }
        : { label: "Flashcard üret", href: "/flashcards/flashcard", enabled: false },
      { label: "Mentor ile tartış", href: "/ai-assistant/mentor", enabled: true },
    ],
  };
}

export async function getAdminStudyOverview() {
  await ensureStudyCoreSchema();
  const [
    materialRows,
    wrongCount,
    deckCount,
    dueCards,
    recommendationCount,
  ] = await Promise.all([
    prisma.$queryRaw<Array<{ status: string; processingStage: string; qualityScore: number | null }>>`
      SELECT
        status,
        processing_stage AS "processingStage",
        quality_score AS "qualityScore"
      FROM public.user_materials
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM public.user_wrong_questions`,
    prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM public.user_flashcard_decks`,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM public.user_flashcard_cards
      WHERE next_review IS NULL OR next_review <= NOW()
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM public.user_study_recommendations
      WHERE dismissed_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())
    `,
  ]);

  const failedMaterials = materialRows.filter((row) => row.status === "failed").length;
  const stuckProcessing = materialRows.filter(
    (row) => row.status === "processing" || row.processingStage !== "ready",
  ).length;
  const avgQuality = materialRows.filter((row) => typeof row.qualityScore === "number");
  const averageQualityScore = avgQuality.length
    ? Math.round(avgQuality.reduce((sum, row) => sum + Number(row.qualityScore ?? 0), 0) / avgQuality.length)
    : 0;

  return {
    failedMaterials,
    stuckProcessing,
    averageQualityScore,
    wrongQuestionCount: Number(wrongCount[0]?.count ?? 0n),
    flashcardDeckCount: Number(deckCount[0]?.count ?? 0n),
    dueFlashcardCount: Number(dueCards[0]?.count ?? 0n),
    recommendationCount: Number(recommendationCount[0]?.count ?? 0n),
  };
}
