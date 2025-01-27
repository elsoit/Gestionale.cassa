'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff } from 'lucide-react'
import Cookies from 'js-cookie'

interface StoreAccess {
  storeId: number;
  role: string;
}

interface User {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  role: string;
  storeAccess: StoreAccess[];
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const username = formData.get('username')
    const password = formData.get('password')

    const payload = {
      username,
      password,
    }

    try {
      console.log('Login - Payload:', payload)
      console.log('Login - Invio richiesta...')

      const response = await fetch(`${process.env.API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      console.log('Login - Risposta:', { status: response.status, data })

      if (response.ok) {
        const user: User = data.user;
        
        // Salva token e dati utente
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(user))
        Cookies.set('token', data.token, { expires: 1 })
        console.log('Login - Token e utente salvati')

        // Controlla il ruolo e i permessi
        if (user.role === 'client') {
          // Verifica se tutti i ruoli di store sono "store operator"
          const isOnlyStoreOperator = user.storeAccess.every(
            access => access.role === 'store operator'
          );

          if (isOnlyStoreOperator) {
            // Se è solo store operator, reindirizza alla cassa
            console.log('Login - Utente è solo store operator, reindirizzo a POS')
            localStorage.setItem('userAccess', 'limited')
            Cookies.set('userAccess', 'limited', { expires: 1 })
            router.push('/cassa/pos')
          } else {
            // Se ha almeno un ruolo diverso, accesso completo
            console.log('Login - Utente ha accesso completo')
            localStorage.setItem('userAccess', 'full')
            Cookies.set('userAccess', 'full', { expires: 1 })
            router.push('/')
          }
        } else {
          // Per altri ruoli, accesso completo
          console.log('Login - Utente non è client, accesso completo')
          localStorage.setItem('userAccess', 'full')
          Cookies.set('userAccess', 'full', { expires: 1 })
          router.push('/')
        }
      } else {
        setError(data.error || 'Errore durante il login')
      }
    } catch (error) {
      console.error('Login - Errore:', error)
      setError('Errore durante il login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
         
          <CardTitle className="text-2xl font-bold text-center">Artex Gestionale</CardTitle>
          <CardDescription className="text-center text-gray-500">
            Inserisci la tua email e password per accedere
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="La tua email"
                name="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="La tua password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Accesso in corso..." : "Accedi"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <div className="w-full text-center">
            {/* <Link 
              href="/reset-password"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Password dimenticata?
            </Link> */}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
} 