import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { HardHat, LogIn } from 'lucide-react'

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
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
        <p className="text-gray-500 text-sm mb-6">Sign in to your contractor account</p>

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
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-700 font-semibold">Register</Link>
        </p>
      </div>
    </div>
  )
}
