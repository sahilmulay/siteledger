import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { HardHat, Mail, Lock } from 'lucide-react'

export function Login() {
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [googleLoading, setGoogleLoading] = useState(false)
  const from = location.state?.from?.pathname || '/projects'

  const {
    register, handleSubmit, formState: { errors, isSubmitting }
  } = useForm()

  const onSubmit = async ({ email, password }) => {
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err.message || 'Login failed. Check your credentials.')
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed.')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 to-blue-900 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
          <HardHat className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">SiteLedger</h1>
        <p className="text-blue-200 text-sm mt-1">Construction Finance Tracker</p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-10 shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
        <p className="text-gray-500 text-sm mb-6">Sign in to your account</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            required
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' }
            })}
            error={errors.email?.message}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            required
            {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
            error={errors.password?.message}
          />

          <Button type="submit" fullWidth loading={isSubmitting} size="lg" className="mt-2">
            <Mail className="h-4 w-4" />
            Sign In with Email
          </Button>
        </form>

        <div className="flex items-center my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="px-3 text-sm text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <Button
          variant="secondary" fullWidth size="lg"
          onClick={handleGoogle} loading={googleLoading}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </Button>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-700 font-semibold">Register</Link>
        </p>
      </div>
    </div>
  )
}
