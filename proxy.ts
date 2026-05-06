import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const startedAt = performance.now()
  const timings: string[] = []
  const mark = (name: string, from: number) => {
    timings.push(`${name};dur=${(performance.now() - from).toFixed(1)}`)
  }
  const withTimings = (response: NextResponse) => {
    timings.push(`proxy;dur=${(performance.now() - startedAt).toFixed(1)}`)
    response.headers.set('Server-Timing', timings.join(', '))
    return response
  }

  let supabaseResponse = NextResponse.next({ request })

  // Refresh the session on every request (required by @supabase/ssr)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: always use getUser() not getSession() — getUser() validates
  // the token server-side and cannot be spoofed via manipulated cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  mark('auth-user', startedAt)

  const { pathname } = request.nextUrl

  const isAppRoute =
    pathname.startsWith('/profile') || pathname.startsWith('/feedback')
  const isModRoute = pathname.startsWith('/mod')
  const isAdminRoute = pathname.startsWith('/admin')
  const isProtected = isAppRoute || isModRoute || isAdminRoute

  // Redirect unauthenticated users away from protected routes
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirectTo', pathname)
    return withTimings(NextResponse.redirect(url))
  }

  if (user && isProtected) {
    // Check approval status
    const profileStartedAt = performance.now()
    const { data: profile } = await supabase
      .from('profiles')
      .select('approved')
      .eq('id', user.id)
      .single()
    mark('profile', profileStartedAt)

    if (!profile?.approved) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/pending'
      return withTimings(NextResponse.redirect(url))
    }

    // Check role for mod/admin routes
    if (isModRoute || isAdminRoute) {
      const rolesStartedAt = performance.now()
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
      mark('roles', rolesStartedAt)

      const userRoles = roles?.map((r) => r.role) ?? []
      const hasAccess = isAdminRoute
        ? userRoles.includes('admin')
        : userRoles.includes('mod') || userRoles.includes('admin')

      if (!hasAccess) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return withTimings(NextResponse.redirect(url))
      }
    }
  }

  return withTimings(supabaseResponse)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
