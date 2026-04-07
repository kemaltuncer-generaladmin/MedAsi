'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { loginSchema, registerSchema } from '@/lib/schemas'
import { ROUTES } from '@/constants'

export async function login(formData: FormData): Promise<void> {
  const raw = Object.fromEntries(formData)
  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) throw new Error(error.message)

  if (user) {
    const existingUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!existingUser) {
      const defaultPackage = await prisma.package.findFirst({ orderBy: { price: 'asc' } })
      if (!defaultPackage) throw new Error('Varsayılan paket bulunamadı. Lütfen sistem yöneticisi ile iletişime geçin.')

      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.name || '',
          packageId: defaultPackage.id,
          role: user.user_metadata?.role || 'user',
        }
      })
    }
  }

  const role = user?.user_metadata?.role
  if (role === 'admin') redirect('/admin')
  if (role === 'org_admin') redirect('/org-admin')
  redirect(ROUTES.dashboard)
}

export async function register(formData: FormData): Promise<void> {
  const raw = Object.fromEntries(formData)
  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name, seniority: parsed.data.seniority } },
  })
  if (error) throw new Error(error.message)

  if (data.user) {
    const defaultPackage = await prisma.package.findFirst({ orderBy: { price: 'asc' } })
    if (!defaultPackage) throw new Error('Varsayılan paket bulunamadı.')

    await prisma.user.upsert({
      where: { id: data.user.id },
      update: {
        name: parsed.data.name,
      },
      create: {
        id: data.user.id,
        email: parsed.data.email,
        name: parsed.data.name,
        packageId: defaultPackage.id,
      },
    })
  }

  redirect('/verify-email')
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(ROUTES.login)
}
