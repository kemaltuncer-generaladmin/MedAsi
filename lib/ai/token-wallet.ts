/**
 * Token Cüzdanı Sistemi
 * ─────────────────────
 * Her AI isteği gerçek token sayısına göre cüzdandan düşülür.
 * Tüm hareketler token_transactions tablosuna kaydedilir (tam defter).
 *
 * Token Grant Politikası:
 *   Ücretsiz  → 500.000
 *   Giriş     → 1.000.000
 *   Pro       → 2.000.000
 *
 * NOT: prisma generate çalışmadığından raw SQL kullanılıyor.
 */

import { prisma } from "@/lib/prisma";

// ─── Sabitler ────────────────────────────────────────────────────────────────
export const TOKEN_GRANTS = {
  ucretsiz: 100_000n,
  giris: 300_000n,
  pro: 500_000n,
  enterprise: 1_000_000n,
} as const;

// ─── Tipler ──────────────────────────────────────────────────────────────────
export interface WalletBalance {
  balance: bigint;
  totalEarned: bigint;
  totalSpent: bigint;
  updatedAt: Date;
}

export interface TransactionRecord {
  id: string;
  type: string;
  amount: bigint;
  balanceAfter: bigint;
  description: string;
  model: string | null;
  module: string | null;
  createdAt: Date;
}

// ─── Bakiye sorgula ───────────────────────────────────────────────────────
export async function getWalletBalance(userId: string): Promise<bigint> {
  const rows = await prisma.$queryRaw<{ balance: bigint }[]>`
    SELECT balance FROM token_wallets WHERE user_id = ${userId} LIMIT 1
  `;
  return rows[0]?.balance ?? 0n;
}

// ─── Cüzdanı al veya oluştur ──────────────────────────────────────────────
export async function getOrCreateWallet(userId: string): Promise<WalletBalance> {
  await prisma.$executeRaw`
    INSERT INTO token_wallets (id, user_id, balance, total_earned, total_spent, updated_at)
    VALUES (gen_random_uuid()::text, ${userId}, 0, 0, 0, NOW())
    ON CONFLICT (user_id) DO NOTHING
  `;
  const rows = await prisma.$queryRaw<WalletBalance[]>`
    SELECT balance, total_earned AS "totalEarned", total_spent AS "totalSpent", updated_at AS "updatedAt"
    FROM token_wallets WHERE user_id = ${userId} LIMIT 1
  `;
  return rows[0]!;
}

// ─── Token Yükle (kredi) ──────────────────────────────────────────────────
export async function creditTokens(
  userId: string,
  amount: bigint,
  type: "grant" | "purchase" | "refund" | "bonus" | "admin_adjust",
  description: string,
  refId?: string,
): Promise<bigint> {
  if (amount <= 0n) throw new Error("Kredi miktarı pozitif olmalıdır.");
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string; balance: bigint }[]>`
      INSERT INTO token_wallets (id, user_id, balance, total_earned, total_spent, updated_at)
      VALUES (gen_random_uuid()::text, ${userId}, ${amount}, ${amount}, 0, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET balance = token_wallets.balance + ${amount},
            total_earned = token_wallets.total_earned + ${amount},
            updated_at = NOW()
      RETURNING id, balance
    `;

    const walletId = rows[0]!.id;
    const newBalance = rows[0]!.balance;

    await tx.$executeRaw`
      INSERT INTO token_transactions (id, wallet_id, user_id, type, amount, balance_after, description, ref_id, created_at)
      VALUES (gen_random_uuid()::text, ${walletId}, ${userId}, ${type}, ${amount}, ${newBalance}, ${description}, ${refId ?? null}, NOW())
    `;

    return newBalance;
  });
}

// ─── Token Düş (debit) ────────────────────────────────────────────────────
export async function deductTokens(
  userId: string,
  amount: bigint,
  model: string,
  module: string,
  description?: string,
): Promise<{ success: boolean; balanceAfter: bigint }> {
  if (amount <= 0n) return { success: true, balanceAfter: await getWalletBalance(userId) };

  try {
    return await prisma.$transaction(async (tx) => {
      const walletRows = await tx.$queryRaw<{ id: string; balance: bigint }[]>`
        SELECT id, balance
        FROM token_wallets
        WHERE user_id = ${userId}
        FOR UPDATE
      `;

      const wallet = walletRows[0];
      if (!wallet) {
        return { success: false, balanceAfter: 0n };
      }

      const desc = description ?? `AI kullanımı — ${module}`;
      const walletId = wallet.id;

      if (wallet.balance >= amount) {
        const newBalance = wallet.balance - amount;
        await tx.$executeRaw`
          UPDATE token_wallets
          SET balance = ${newBalance},
              total_spent = total_spent + ${amount},
              updated_at = NOW()
          WHERE id = ${walletId}
        `;
        await tx.$executeRaw`
          INSERT INTO token_transactions (id, wallet_id, user_id, type, amount, balance_after, description, model, module, created_at)
          VALUES (gen_random_uuid()::text, ${walletId}, ${userId}, 'deduct', ${-amount}, ${newBalance}, ${desc}, ${model}, ${module}, NOW())
        `;
        return { success: true, balanceAfter: newBalance };
      }

      // Tam düşüm yapılamıyorsa, mevcut bakiyeyi sıfırlayıp ücretsiz kullanım döngüsünü kes.
      if (wallet.balance > 0n) {
        const drainedAmount = wallet.balance;
        await tx.$executeRaw`
          UPDATE token_wallets
          SET balance = 0,
              total_spent = total_spent + ${drainedAmount},
              updated_at = NOW()
          WHERE id = ${walletId}
        `;
        await tx.$executeRaw`
          INSERT INTO token_transactions (id, wallet_id, user_id, type, amount, balance_after, description, model, module, created_at)
          VALUES (gen_random_uuid()::text, ${walletId}, ${userId}, 'deduct', ${-drainedAmount}, 0, ${`${desc} (kısmi düşüm)`}, ${model}, ${module}, NOW())
        `;
      }

      return { success: false, balanceAfter: 0n };
    });
  } catch {
    return { success: false, balanceAfter: await getWalletBalance(userId) };
  }
}

// ─── İşlem geçmişi ───────────────────────────────────────────────────────
export async function getTransactionHistory(
  userId: string,
  limit = 50,
  offset = 0,
): Promise<TransactionRecord[]> {
  const rows = await prisma.$queryRaw<TransactionRecord[]>`
    SELECT
      id,
      type,
      amount,
      balance_after AS "balanceAfter",
      description,
      model,
      module,
      created_at AS "createdAt"
    FROM token_transactions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return rows;
}

// ─── Özet istatistikler ───────────────────────────────────────────────────
export async function getWalletStats(userId: string) {
  const [walletRows, moduleRows, last30days] = await Promise.all([
    prisma.$queryRaw<{ balance: bigint; totalEarned: bigint; totalSpent: bigint; updatedAt: Date }[]>`
      SELECT balance, total_earned AS "totalEarned", total_spent AS "totalSpent", updated_at AS "updatedAt"
      FROM token_wallets WHERE user_id = ${userId} LIMIT 1
    `,
    prisma.$queryRaw<{ module: string; spent: bigint }[]>`
      SELECT
        COALESCE(module, 'diğer') AS module,
        ABS(SUM(amount)) AS spent
      FROM token_transactions
      WHERE user_id = ${userId} AND type = 'deduct'
      GROUP BY module
    `,
    prisma.$queryRaw<{ day: string; spent: bigint }[]>`
      SELECT
        DATE_TRUNC('day', created_at)::date::text AS day,
        ABS(SUM(amount)) AS spent
      FROM token_transactions
      WHERE user_id = ${userId}
        AND type = 'deduct'
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY day ASC
    `,
  ]);

  const wallet = walletRows[0];
  return {
    balance: wallet?.balance ?? 0n,
    totalEarned: wallet?.totalEarned ?? 0n,
    totalSpent: wallet?.totalSpent ?? 0n,
    updatedAt: wallet?.updatedAt ?? new Date(),
    moduleBreakdown: moduleRows,
    last30days,
  };
}

// ─── Satın alma paketlerini listele ──────────────────────────────────────
export async function getTokenPackages() {
  const rows = await prisma.$queryRaw<{
    id: string;
    name: string;
    tokens: bigint;
    bonusPct: number;
    priceTry: number;
    priceUsd: number;
    isActive: boolean;
    isPopular: boolean;
    sortOrder: number;
  }[]>`
    SELECT
      id,
      name,
      tokens,
      bonus_pct AS "bonusPct",
      price_try AS "priceTry",
      price_usd AS "priceUsd",
      is_active AS "isActive",
      is_popular AS "isPopular",
      sort_order AS "sortOrder"
    FROM token_packages
    WHERE is_active = true
    ORDER BY sort_order ASC
  `;
  return rows;
}

// ─── Plan aktivasyonunda token grant ────────────────────────────────────
export async function grantPlanTokens(userId: string, packageName: string): Promise<bigint | null> {
  const nameLower = packageName.toLowerCase() as keyof typeof TOKEN_GRANTS;
  const grant = TOKEN_GRANTS[nameLower];
  if (!grant) return null;

  const newBalance = await creditTokens(
    userId,
    grant,
    "grant",
    `${packageName} planı aktivasyonu — ${grant.toLocaleString()} token`,
  );

  return newBalance;
}
