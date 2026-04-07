'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.user_metadata?.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
  return user
}

export async function getUsers() {
  await checkAdmin()
  const users = await prisma.user.findMany({
    include: {
      package: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
  return users
}

export async function getPackages() {
  await checkAdmin()
  return prisma.package.findMany()
}

export async function updateUserRole(userId: string, role: string) {
  await checkAdmin()
  const supabase = await createClient()
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/users')
}

export async function updateUserPackage(userId: string, packageId: string) {
  await checkAdmin()
  await prisma.user.update({
    where: { id: userId },
    data: { packageId },
  })
  revalidatePath('/admin/users')
}

export async function getPackagesWithCount() {
  await checkAdmin()
  return prisma.package.findMany({
    include: {
      _count: {
        select: { users: true },
      },
    },
  })
}

export async function updatePackage(
  packageId: string,
  data: { dailyAiLimit: number; price: number }
) {
  await checkAdmin()
  await prisma.package.update({
    where: { id: packageId },
    data,
  })
  revalidatePath('/admin/packages')
}