import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [adminPkg, freePkg] = await Promise.all([
    prisma.package.findUnique({ where: { name: "Kurumsal" } }),
    prisma.package.findUnique({ where: { name: "Ücretsiz" } }),
  ]);

  if (!adminPkg || !freePkg) {
    throw new Error(
      "Gerekli paketlerden biri eksik: Ücretsiz ve Kurumsal paketleri",
    );
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, packageId: true },
  });

  let updated = 0;
  for (const user of users) {
    let targetPackageId = freePkg.id;
    let targetRole = "user";

    if (user.role === "admin" || user.email === "admin@medasi.com.tr") {
      targetPackageId = adminPkg.id;
      targetRole = "admin";
    } else if (user.role === "org_admin" || user.role === "researcher") {
      targetPackageId = adminPkg.id;
      targetRole = user.role;
    }

    if (user.packageId !== targetPackageId || user.role !== targetRole) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          packageId: targetPackageId,
          role: targetRole,
        },
      });
      updated += 1;
    }
  }

  console.log(
    `Dagitim tamamlandi. Toplam kullanici: ${users.length}, guncellenen: ${updated}`,
  );
}

main()
  .catch((e) => {
    console.error("Hata:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
