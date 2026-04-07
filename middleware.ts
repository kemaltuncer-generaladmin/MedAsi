import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.user_metadata?.role as string | undefined

  // ── Kimlik doğrulama gerektiren rotalar ────────────────────────────────
  const protectedPrefixes = ['/dashboard', '/admin', '/org-admin']
  const needsAuth = protectedPrefixes.some((p) => pathname.startsWith(p))

  if (!user && needsAuth) {
    return NextResponse.redirect(new URL('/welcome', request.url))
  }

  // ── /admin: yalnızca super admin ──────────────────────────────────────
  if (user && pathname.startsWith('/admin')) {
    if (role !== 'admin') {
      const dest = role === 'org_admin' ? '/org-admin' : '/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    }
  }

  // ── /org-admin: yalnızca org_admin ────────────────────────────────────
  if (user && pathname.startsWith('/org-admin')) {
    if (role !== 'org_admin') {
      const dest = role === 'admin' ? '/admin' : '/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    }
  }

  // ── Giriş yapmış kullanıcı /welcome veya /login'e girmeye çalışırsa ──
  if (user && (pathname === '/welcome' || pathname === '/login')) {
    if (role === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
    if (role === 'org_admin') return NextResponse.redirect(new URL('/org-admin', request.url))
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/org-admin/:path*', '/welcome', '/login'],
}
