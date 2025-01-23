import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rotte pubbliche che non richiedono autenticazione
const publicRoutes = ['/login', '/reset-password']

// Rotte permesse per gli store operator
const limitedRoutes = ['/cassa', '/products', '/etichette', '/loads']

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Permetti sempre l'accesso alle rotte pubbliche
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('token')?.value
  const userAccess = request.cookies.get('userAccess')?.value

  // Se non c'è token, reindirizza al login
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Se l'utente ha accesso limitato, controlla che la rotta sia permessa
  if (userAccess === 'limited') {
    // Verifica se la rotta corrente inizia con una delle rotte permesse
    const isAllowedRoute = limitedRoutes.some(route => pathname.startsWith(route))
    
    if (!isAllowedRoute) {
      console.log('Accesso negato:', pathname)
      // Se la rotta non è permessa, reindirizza alla cassa
      const cassaUrl = new URL('/cassa', request.url)
      return NextResponse.redirect(cassaUrl)
    }
  }

  return NextResponse.next()
}

// Configura su quali path deve essere eseguito il middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/ (API routes)
     * 2. /_next/ (Next.js internals)
     * 3. /_static (inside /public)
     * 4. /_vercel (Vercel internals)
     * 5. /favicon.ico, /sitemap.xml (static files)
     */
    '/((?!api|_next|_static|_vercel|favicon.ico|sitemap.xml).*)',
  ]
} 