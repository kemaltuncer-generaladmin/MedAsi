import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_SPACE_SLUG = "global-hub";

const DEFAULT_REPORT_REASONS = [
  {
    key: "spam",
    label: "Spam veya alakasız içerik",
    description: "Reklam, tekrar veya konu dışı paylaşım.",
    severity: "medium",
  },
  {
    key: "abuse",
    label: "Hakaret veya toksik davranış",
    description: "Kişisel saldırı, taciz veya zorbalık.",
    severity: "high",
  },
  {
    key: "privacy",
    label: "Hasta verisi veya mahremiyet ihlali",
    description: "Kimlik açığa çıkaran hasta verisi, fotoğraf veya belge.",
    severity: "critical",
  },
  {
    key: "copyright",
    label: "Telif veya kaynak ihlali",
    description: "İzinsiz PDF, slayt veya ücretli içerik paylaşımı.",
    severity: "high",
  },
];

type FeedFilters = {
  universityId?: string | null;
  programId?: string | null;
  termId?: string | null;
  courseId?: string | null;
  contentType?: string | null;
  visibilityScope?: string | null;
  q?: string | null;
};

function normalizeText(input?: string | null): string | null {
  const value = input?.trim();
  return value ? value : null;
}

function stringArrayToJson(values: string[] = []): Prisma.InputJsonValue {
  return values.filter(Boolean) as unknown as Prisma.InputJsonValue;
}

function nowMinusDays(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function ensureCommunitySeedData() {
  await prisma.communitySpace.upsert({
    where: { slug: DEFAULT_SPACE_SLUG },
    update: {},
    create: {
      type: "global",
      title: "Topluluk Merkezi",
      slug: DEFAULT_SPACE_SLUG,
      description:
        "Tum tip fakultesi ogrencilerinin ortak akisi, kaynak paylasimi ve duyuru merkezi.",
      accessType: "public",
    },
  });

  await Promise.all(
    DEFAULT_REPORT_REASONS.map((reason) =>
      prisma.communityReportReason.upsert({
        where: { key: reason.key },
        update: {
          label: reason.label,
          description: reason.description,
          severity: reason.severity,
          isActive: true,
        },
        create: reason,
      }),
    ),
  );
}

export async function getCommunityTaxonomy() {
  await ensureCommunitySeedData();

  const [universities, programs, terms, courses, spaces, reportReasons] =
    await Promise.all([
      prisma.university.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.program.findMany({
        where: { isActive: true },
        orderBy: [{ university: { name: "asc" } }, { name: "asc" }],
        include: { university: true },
      }),
      prisma.academicTerm.findMany({
        where: { isActive: true },
        orderBy: [{ program: { university: { name: "asc" } } }, { sortOrder: "asc" }],
        include: { program: { include: { university: true } } },
      }),
      prisma.course.findMany({
        where: { isActive: true },
        orderBy: [{ program: { university: { name: "asc" } } }, { name: "asc" }],
        include: {
          program: { include: { university: true } },
          term: true,
        },
      }),
      prisma.communitySpace.findMany({
        where: { status: "active" },
        orderBy: [{ type: "asc" }, { title: "asc" }],
        include: {
          university: true,
          program: true,
          term: true,
          course: true,
        },
      }),
      prisma.communityReportReason.findMany({
        where: { isActive: true },
        orderBy: [{ severity: "desc" }, { label: "asc" }],
      }),
    ]);

  return { universities, programs, terms, courses, spaces, reportReasons };
}

export async function getUserAcademicProfile(userId: string) {
  return prisma.userAcademicProfile.findUnique({
    where: { userId },
    include: {
      university: true,
      program: true,
      term: true,
    },
  });
}

export async function upsertUserAcademicProfile(
  userId: string,
  input: {
    universityId?: string | null;
    programId?: string | null;
    termId?: string | null;
    specialty?: string | null;
    studentNoHash?: string | null;
    visibilityLevel?: string | null;
  },
) {
  return prisma.userAcademicProfile.upsert({
    where: { userId },
    update: {
      universityId: input.universityId ?? null,
      programId: input.programId ?? null,
      termId: input.termId ?? null,
      specialty: normalizeText(input.specialty),
      studentNoHash: normalizeText(input.studentNoHash),
      visibilityLevel: input.visibilityLevel ?? "verified_only",
    },
    create: {
      userId,
      universityId: input.universityId ?? null,
      programId: input.programId ?? null,
      termId: input.termId ?? null,
      specialty: normalizeText(input.specialty),
      studentNoHash: normalizeText(input.studentNoHash),
      visibilityLevel: input.visibilityLevel ?? "verified_only",
    },
    include: {
      university: true,
      program: true,
      term: true,
    },
  });
}

function buildThreadWhere(filters: FeedFilters): Prisma.CommunityThreadWhereInput {
  const search = normalizeText(filters.q);
  return {
    status: "active",
    contentType: filters.contentType ?? undefined,
    visibilityScope: filters.visibilityScope ?? undefined,
    OR: search
      ? [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ]
      : undefined,
    space: {
      universityId: filters.universityId ?? undefined,
      programId: filters.programId ?? undefined,
      termId: filters.termId ?? undefined,
      courseId: filters.courseId ?? undefined,
    },
  };
}

function buildResourceWhere(filters: FeedFilters): Prisma.CommunityResourceWhereInput {
  const search = normalizeText(filters.q);
  return {
    status: "active",
    visibilityScope: filters.visibilityScope ?? undefined,
    courseId: filters.courseId ?? undefined,
    termId: filters.termId ?? undefined,
    programId: filters.programId ?? undefined,
    universityId: filters.universityId ?? undefined,
    OR: search
      ? [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ]
      : undefined,
  };
}

export async function getCommunityFeed(userId: string, filters: FeedFilters = {}) {
  await ensureCommunitySeedData();

  const profile = await getUserAcademicProfile(userId);

  const [threads, resources, spaces, activeRoles, topContributors] =
    await Promise.all([
      prisma.communityThread.findMany({
        where: buildThreadWhere(filters),
        take: 24,
        orderBy: [{ isPinned: "desc" }, { lastActivityAt: "desc" }],
        include: {
          author: { select: { id: true, name: true, email: true } },
          space: {
            include: {
              university: true,
              program: true,
              term: true,
              course: true,
            },
          },
          posts: {
            take: 2,
            orderBy: { createdAt: "desc" },
            include: { author: { select: { id: true, name: true, email: true } } },
          },
        },
      }),
      prisma.communityResource.findMany({
        where: buildResourceWhere(filters),
        take: 12,
        orderBy: [{ qualityScore: "desc" }, { createdAt: "desc" }],
        include: {
          author: { select: { id: true, name: true, email: true } },
          space: true,
          university: true,
          program: true,
          term: true,
          course: true,
        },
      }),
      prisma.communitySpace.findMany({
        where: {
          status: "active",
          OR: [
            { type: "global" },
            { universityId: filters.universityId ?? profile?.universityId ?? undefined },
            { termId: filters.termId ?? profile?.termId ?? undefined },
            { courseId: filters.courseId ?? undefined },
          ],
        },
        include: {
          _count: { select: { threads: true, resources: true, chats: true } },
          university: true,
          program: true,
          term: true,
          course: true,
        },
        orderBy: [{ type: "asc" }, { updatedAt: "desc" }],
        take: 12,
      }),
      prisma.communityRoleAssignment.findMany({
        where: {
          expiresAt: { gt: new Date() },
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          university: true,
          course: true,
        },
        take: 20,
        orderBy: { createdAt: "desc" },
      }),
      prisma.communityThread.groupBy({
        by: ["authorId"],
        _count: { authorId: true },
        orderBy: { _count: { authorId: "desc" } },
        take: 6,
        where: {
          createdAt: { gte: nowMinusDays(30) },
        },
      }),
    ]);

  const contributorIds = topContributors.map((item) => item.authorId);
  const contributorUsers = contributorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: contributorIds } },
        include: {
          academicProfile: {
            include: { university: true, term: true },
          },
        },
      })
    : [];

  return {
    profile,
    filters,
    threads,
    resources,
    spaces,
    activeRoles,
    topContributors: contributorUsers.map((user) => ({
      id: user.id,
      name: user.name ?? user.email,
      email: user.email,
      university: user.academicProfile?.university?.name ?? null,
      term: user.academicProfile?.term?.name ?? null,
      contributionCount:
        topContributors.find((item) => item.authorId === user.id)?._count.authorId ?? 0,
    })),
  };
}

export async function getSpaceDetails(slug: string, userId: string) {
  await ensureCommunitySeedData();

  const [space, profile] = await Promise.all([
    prisma.communitySpace.findUnique({
      where: { slug },
      include: {
        university: true,
        program: true,
        term: true,
        course: true,
        _count: { select: { threads: true, resources: true, chats: true } },
      },
    }),
    getUserAcademicProfile(userId),
  ]);

  if (!space) return null;

  const [threads, resources, chats] = await Promise.all([
    prisma.communityThread.findMany({
      where: { spaceId: space.id, status: "active" },
      orderBy: [{ isPinned: "desc" }, { lastActivityAt: "desc" }],
      include: {
        author: { select: { id: true, name: true, email: true } },
        posts: {
          take: 3,
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, name: true, email: true } } },
        },
      },
      take: 20,
    }),
    prisma.communityResource.findMany({
      where: { spaceId: space.id, status: "active" },
      orderBy: [{ qualityScore: "desc" }, { createdAt: "desc" }],
      include: {
        author: { select: { id: true, name: true, email: true } },
        course: true,
      },
      take: 12,
    }),
    prisma.communityGroupChat.findMany({
      where: {
        spaceId: space.id,
        status: "active",
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);

  return { space, threads, resources, chats, profile };
}

export async function createCommunityThread(
  userId: string,
  input: {
    spaceId: string;
    title: string;
    description?: string | null;
    contentType: string;
    visibilityScope?: string | null;
    tags?: string[];
    containsSpoiler?: boolean;
    attachedMaterialId?: string | null;
    initialPostBody?: string | null;
  },
) {
  const title = normalizeText(input.title);
  if (!title) throw new Error("Baslik gerekli");

  return prisma.$transaction(async (tx) => {
    const thread = await tx.communityThread.create({
      data: {
        spaceId: input.spaceId,
        authorId: userId,
        title,
        description: normalizeText(input.description),
        contentType: input.contentType,
        visibilityScope: input.visibilityScope ?? "global",
        tags: stringArrayToJson(input.tags ?? []),
        containsSpoiler: Boolean(input.containsSpoiler),
        attachedMaterialId: normalizeText(input.attachedMaterialId),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        space: true,
      },
    });

    if (normalizeText(input.initialPostBody)) {
      await tx.communityPost.create({
        data: {
          threadId: thread.id,
          authorId: userId,
          body: input.initialPostBody!.trim(),
        },
      });

      await tx.communityThread.update({
        where: { id: thread.id },
        data: {
          postCount: 1,
          lastActivityAt: new Date(),
        },
      });
    }

    return thread;
  });
}

export async function createCommunityPost(
  userId: string,
  threadId: string,
  input: {
    body: string;
    quotedPostId?: string | null;
    markAsBestAnswer?: boolean;
  },
) {
  const body = normalizeText(input.body);
  if (!body) throw new Error("Mesaj gerekli");

  return prisma.$transaction(async (tx) => {
    const post = await tx.communityPost.create({
      data: {
        threadId,
        authorId: userId,
        body,
        quotedPostId: input.quotedPostId ?? null,
        isBestAnswer: Boolean(input.markAsBestAnswer),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    const threadUpdate: Prisma.CommunityThreadUpdateInput = {
      postCount: { increment: 1 },
      lastActivityAt: new Date(),
    };

    if (input.markAsBestAnswer) {
      threadUpdate.bestAnswerPostId = post.id;
    }

    await tx.communityThread.update({
      where: { id: threadId },
      data: threadUpdate,
    });

    return post;
  });
}

export async function createCommunityResource(
  userId: string,
  input: {
    title: string;
    description?: string | null;
    resourceType?: string | null;
    visibilityScope?: string | null;
    url?: string | null;
    filePath?: string | null;
    linkedMaterialId?: string | null;
    spaceId?: string | null;
    universityId?: string | null;
    programId?: string | null;
    termId?: string | null;
    courseId?: string | null;
    tags?: string[];
  },
) {
  const title = normalizeText(input.title);
  if (!title) throw new Error("Kaynak basligi gerekli");

  return prisma.communityResource.create({
    data: {
      authorId: userId,
      spaceId: input.spaceId ?? null,
      title,
      description: normalizeText(input.description),
      resourceType: input.resourceType ?? "file",
      visibilityScope: input.visibilityScope ?? "global",
      url: normalizeText(input.url),
      filePath: normalizeText(input.filePath),
      linkedMaterialId: normalizeText(input.linkedMaterialId),
      universityId: input.universityId ?? null,
      programId: input.programId ?? null,
      termId: input.termId ?? null,
      courseId: input.courseId ?? null,
      tags: stringArrayToJson(input.tags ?? []),
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
      space: true,
      course: true,
    },
  });
}

async function ensureUserCanMessage(chatId: string, userId: string) {
  const membership = await prisma.communityChatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
  });
  if (!membership || membership.status !== "active") {
    throw new Error("Bu sohbete erisiminiz yok");
  }
}

export async function createOrGetDirectMessageChat(
  userId: string,
  targetUserId: string,
) {
  if (userId === targetUserId) {
    throw new Error("Kendinize mesaj gonderemezsiniz");
  }

  const existing = await prisma.communityGroupChat.findFirst({
    where: {
      isDirectMessage: true,
      status: "active",
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: targetUserId } } },
      ],
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  if (existing) return existing;

  const [self, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.user.findUnique({ where: { id: targetUserId } }),
  ]);

  if (!self || !target) throw new Error("Kullanici bulunamadi");

  return prisma.communityGroupChat.create({
    data: {
      createdByUserId: userId,
      title: `${self.name ?? self.email} / ${target.name ?? target.email}`,
      isDirectMessage: true,
      members: {
        create: [
          { userId, role: "owner" },
          { userId: targetUserId, role: "member" },
        ],
      },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
}

export async function sendDirectMessage(
  userId: string,
  input: { targetUserId: string; body: string },
) {
  const chat = await createOrGetDirectMessageChat(userId, input.targetUserId);
  return sendGroupMessage(userId, {
    chatId: chat.id,
    body: input.body,
  });
}

export async function sendGroupMessage(
  userId: string,
  input: {
    chatId?: string | null;
    title?: string | null;
    spaceId?: string | null;
    memberIds?: string[];
    body: string;
    replyToMessageId?: string | null;
  },
) {
  const body = normalizeText(input.body);
  if (!body) throw new Error("Mesaj gerekli");

  let chatId = input.chatId ?? null;

  if (!chatId) {
    const title = normalizeText(input.title) ?? "Calisma Grubu";
    const memberIds = Array.from(new Set([userId, ...(input.memberIds ?? [])])).filter(Boolean);
    const chat = await prisma.communityGroupChat.create({
      data: {
        createdByUserId: userId,
        title,
        description: "Topluluk calisma grubu sohbeti",
        spaceId: input.spaceId ?? null,
        members: {
          create: memberIds.map((memberId) => ({
            userId: memberId,
            role: memberId === userId ? "owner" : "member",
          })),
        },
      },
    });
    chatId = chat.id;
  }

  await ensureUserCanMessage(chatId, userId);

  return prisma.$transaction(async (tx) => {
    const message = await tx.communityChatMessage.create({
      data: {
        chatId,
        authorUserId: userId,
        body,
        replyToMessageId: input.replyToMessageId ?? null,
      },
      include: {
        authorUser: { select: { id: true, name: true, email: true } },
      },
    });

    await tx.communityGroupChat.update({
      where: { id: chatId },
      data: {
        lastMessageAt: new Date(),
      },
    });

    await tx.communityChatMember.updateMany({
      where: { chatId },
      data: {
        lastReadAt: new Date(),
      },
    });

    return message;
  });
}

export async function getUserChats(userId: string) {
  await ensureCommunitySeedData();

  return prisma.communityGroupChat.findMany({
    where: {
      status: "active",
      members: {
        some: { userId, status: "active" },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              academicProfile: {
                include: { university: true, term: true },
              },
            },
          },
        },
      },
      messages: {
        take: 30,
        orderBy: { createdAt: "asc" },
        include: {
          authorUser: { select: { id: true, name: true, email: true } },
        },
      },
      space: true,
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
  });
}

export async function markChatAsRead(userId: string, chatId: string) {
  await ensureUserCanMessage(chatId, userId);

  const messages = await prisma.communityChatMessage.findMany({
    where: { chatId },
    select: { id: true },
  });

  if (!messages.length) return { success: true };

  await prisma.communityMessageRead.createMany({
    data: messages.map((message) => ({
      messageId: message.id,
      userId,
    })),
    skipDuplicates: true,
  });

  await prisma.communityChatMember.update({
    where: { chatId_userId: { chatId, userId } },
    data: { lastReadAt: new Date() },
  });

  return { success: true };
}

export async function createCommunityReport(
  userId: string,
  input: {
    reasonId?: string | null;
    targetType: string;
    targetId: string;
    details?: string | null;
  },
) {
  return prisma.communityReport.create({
    data: {
      reporterUserId: userId,
      reasonId: input.reasonId ?? null,
      targetType: input.targetType,
      targetId: input.targetId,
      details: normalizeText(input.details),
    },
  });
}

export async function userCanModerate(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      communityRoleAssignments: true,
    },
  });

  if (!user) return false;
  if (user.role === "admin") return true;

  return user.communityRoleAssignments.some((assignment) =>
    ["community_admin", "campus_moderator", "course_moderator"].includes(assignment.role),
  );
}

export async function performModerationAction(
  actorUserId: string,
  input: {
    targetType: string;
    targetId: string;
    actionType: string;
    targetUserId?: string | null;
    reason?: string | null;
  },
) {
  const canModerate = await userCanModerate(actorUserId);
  if (!canModerate) throw new Error("Moderasyon yetkisi gerekli");

  const action = await prisma.communityModerationAction.create({
    data: {
      actorUserId,
      targetType: input.targetType,
      targetId: input.targetId,
      targetUserId: input.targetUserId ?? null,
      actionType: input.actionType,
      reason: normalizeText(input.reason),
    },
  });

  if (input.targetType === "thread") {
    const nextStatus =
      input.actionType === "hide"
        ? "hidden"
        : input.actionType === "archive"
          ? "archived"
          : undefined;
    if (nextStatus) {
      await prisma.communityThread.update({
        where: { id: input.targetId },
        data: { status: nextStatus },
      });
    }
  }

  if (input.targetType === "post" && input.actionType === "hide") {
    await prisma.communityPost.update({
      where: { id: input.targetId },
      data: { status: "hidden" },
    });
  }

  if (input.targetType === "resource" && input.actionType === "hide") {
    await prisma.communityResource.update({
      where: { id: input.targetId },
      data: { status: "hidden" },
    });
  }

  if (input.actionType === "ban" && input.targetUserId) {
    await prisma.communityBan.create({
      data: {
        userId: input.targetUserId,
        imposedByUserId: actorUserId,
        reason: normalizeText(input.reason),
      },
    });
  }

  return action;
}

export async function getAdminCommunityOverview() {
  await ensureCommunitySeedData();

  const thirtyDaysAgo = nowMinusDays(30);
  const sevenDaysAgo = nowMinusDays(7);

  const [
    totalSpaces,
    totalThreads,
    totalResources,
    totalChats,
    openReports,
    recentThreads,
    recentResources,
    pendingVerifications,
    topUniversities,
    topCourses,
    roleAssignments,
    reportQueue,
    moderationActions,
  ] = await Promise.all([
    prisma.communitySpace.count({ where: { status: "active" } }),
    prisma.communityThread.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.communityResource.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.communityGroupChat.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.communityReport.count({ where: { status: "open" } }),
    prisma.communityThread.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true, email: true } },
        space: true,
      },
    }),
    prisma.communityResource.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true, email: true } },
        course: true,
      },
    }),
    prisma.userAcademicProfile.count({
      where: { verificationStatus: { in: ["pending", "manual_review"] } },
    }),
    prisma.userAcademicProfile.groupBy({
      by: ["universityId"],
      _count: { universityId: true },
      where: {
        createdAt: { gte: thirtyDaysAgo },
        universityId: { not: null },
      },
      orderBy: { _count: { universityId: "desc" } },
      take: 6,
    }),
    prisma.communityResource.groupBy({
      by: ["courseId"],
      _count: { courseId: true },
      where: {
        createdAt: { gte: thirtyDaysAgo },
        courseId: { not: null },
      },
      orderBy: { _count: { courseId: "desc" } },
      take: 6,
    }),
    prisma.communityRoleAssignment.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        university: true,
        course: true,
      },
    }),
    prisma.communityReport.findMany({
      where: { status: "open" },
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        reporterUser: { select: { id: true, name: true, email: true } },
        reason: true,
        assignedModerator: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.communityModerationAction.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        actorUser: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  const [universityMap, courseMap] = await Promise.all([
    prisma.university.findMany({
      where: { id: { in: topUniversities.map((item) => item.universityId!).filter(Boolean) } },
    }),
    prisma.course.findMany({
      where: { id: { in: topCourses.map((item) => item.courseId!).filter(Boolean) } },
    }),
  ]);

  return {
    metrics: {
      totalSpaces,
      totalThreads,
      totalResources,
      totalChats,
      openReports,
      pendingVerifications,
    },
    recentThreads,
    recentResources,
    roleAssignments,
    reportQueue,
    moderationActions,
    topUniversities: topUniversities.map((item) => ({
      id: item.universityId,
      name: universityMap.find((u) => u.id === item.universityId)?.name ?? "Bilinmeyen",
      count: item._count.universityId,
    })),
    topCourses: topCourses.map((item) => ({
      id: item.courseId,
      name: courseMap.find((course) => course.id === item.courseId)?.name ?? "Bilinmeyen",
      count: item._count.courseId,
    })),
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function createTaxonomyItem(
  entity: string,
  input: Record<string, unknown>,
) {
  switch (entity) {
    case "universities": {
      const name = normalizeText(String(input.name ?? ""));
      if (!name) throw new Error("Universite adi gerekli");
      const slug = slugify(String(input.slug ?? name));
      return prisma.$transaction(async (tx) => {
        const university = await tx.university.create({
          data: {
            name,
            slug,
            city: normalizeText(String(input.city ?? "")),
          },
        });
        await tx.communitySpace.create({
          data: {
            type: "campus",
            title: `${name} Kampusu`,
            slug: `campus-${slug}`,
            description: `${name} ogrencileri icin kampus akisi ve duyurulari.`,
            universityId: university.id,
          },
        });
        return university;
      });
    }
    case "programs": {
      const name = normalizeText(String(input.name ?? ""));
      const universityId = normalizeText(String(input.universityId ?? ""));
      if (!name || !universityId) throw new Error("Program adi ve universite gerekli");
      return prisma.program.create({
        data: {
          name,
          slug: slugify(String(input.slug ?? name)),
          universityId,
          degreeType: normalizeText(String(input.degreeType ?? "")) ?? "medicine",
        },
      });
    }
    case "terms": {
      const name = normalizeText(String(input.name ?? ""));
      const programId = normalizeText(String(input.programId ?? ""));
      if (!name || !programId) throw new Error("Donem adi ve program gerekli");
      const term = await prisma.academicTerm.create({
        data: {
          name,
          code: normalizeText(String(input.code ?? "")) ?? slugify(name),
          sortOrder: Number(input.sortOrder ?? 0),
          programId,
        },
      });
      await prisma.communitySpace.create({
        data: {
          type: "term",
          title: name,
          slug: `term-${term.code}-${term.id.slice(0, 6)}`,
          description: `${name} ogrencileri icin donem alani.`,
          termId: term.id,
          programId,
        },
      });
      return term;
    }
    case "courses": {
      const name = normalizeText(String(input.name ?? ""));
      const programId = normalizeText(String(input.programId ?? ""));
      if (!name || !programId) throw new Error("Ders adi ve program gerekli");
      const course = await prisma.course.create({
        data: {
          name,
          slug: slugify(String(input.slug ?? name)),
          courseType: normalizeText(String(input.courseType ?? "")) ?? "course",
          programId,
          termId: normalizeText(String(input.termId ?? "")),
        },
      });
      await prisma.communitySpace.create({
        data: {
          type: "course",
          title: name,
          slug: `course-${course.slug}-${course.id.slice(0, 6)}`,
          description: `${name} icin soru-cevap, kaynak ve grup akisi.`,
          courseId: course.id,
          programId,
          termId: course.termId,
        },
      });
      return course;
    }
    case "report-reasons": {
      const key = normalizeText(String(input.key ?? ""));
      const label = normalizeText(String(input.label ?? ""));
      if (!key || !label) throw new Error("Sebep anahtari ve etiketi gerekli");
      return prisma.communityReportReason.create({
        data: {
          key,
          label,
          description: normalizeText(String(input.description ?? "")),
          severity: normalizeText(String(input.severity ?? "")) ?? "medium",
        },
      });
    }
    default:
      throw new Error("Desteklenmeyen taksonomi varligi");
  }
}

export async function listRoleAssignments() {
  return prisma.communityRoleAssignment.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      grantedByUser: { select: { id: true, name: true, email: true } },
      university: true,
      course: true,
      term: true,
      space: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function assignCommunityRole(
  actorUserId: string,
  input: {
    userId: string;
    role: string;
    universityId?: string | null;
    programId?: string | null;
    termId?: string | null;
    courseId?: string | null;
    spaceId?: string | null;
    expiresAt?: string | null;
  },
) {
  const canModerate = await userCanModerate(actorUserId);
  const actor = await prisma.user.findUnique({ where: { id: actorUserId } });
  if (!actor || (actor.role !== "admin" && !canModerate)) {
    throw new Error("Rol atama yetkisi gerekli");
  }

  return prisma.communityRoleAssignment.create({
    data: {
      userId: input.userId,
      role: input.role,
      universityId: input.universityId ?? null,
      programId: input.programId ?? null,
      termId: input.termId ?? null,
      courseId: input.courseId ?? null,
      spaceId: input.spaceId ?? null,
      grantedByUserId: actorUserId,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      grantedByUser: { select: { id: true, name: true, email: true } },
      university: true,
      course: true,
      term: true,
      space: true,
    },
  });
}
