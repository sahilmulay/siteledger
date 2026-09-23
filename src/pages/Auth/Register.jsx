import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { HardHat, UserPlus } from 'lucide-react'

export function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const {
    register, handleSubmit, watch, formState: { errors, isSubmitting }
  } = useForm()

  const onSubmit = async ({ email, password, firm_name }) => {
    try {
      const data = await signUp(email, password, { firm_name })
      if (data?.session) {
        toast.success('Account created successfully!')
        navigate('/projects')
      } else {
        toast.success('Account created! Please check your email or sign in.')
        navigate('/login')
      }
    } catch (err) {
      if (err.message?.includes('rate limit')) {
        toast.error('Email rate limit reached. Please disable "Confirm email" in Supabase settings.')
      } else {
        toast.error(err.message || 'Registration failed.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 to-blue-900 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
          <HardHat className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">SiteLedger</h1>
        <p className="text-blue-200 text-sm mt-1">Construction Finance Tracker</p>
      </div>

      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-10 shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Create account</h2>
        <p className="text-gray-500 text-sm mb-6">Start managing your projects</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Firm / Company Name"
            placeholder="e.g. JadhavPatil Construction"
            required
            {...register('firm_name', { required: 'Firm name is required' })}
            error={errors.firm_name?.message}
          />
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
            placeholder="Min 6 characters"
            required
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'Min 6 characters' }
            })}
            error={errors.password?.message}
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Repeat your password"
            required
            {...register('confirmPassword', {
              required: 'Please confirm password',
              validate: v => v === watch('password') || 'Passwords do not match'
            })}
            error={errors.confirmPassword?.message}
          />

          <Button type="submit" fullWidth loading={isSubmitting} size="lg" className="mt-2">
            <UserPlus className="h-4 w-4" />
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-700 font-semibold">Sign In</Link>
        </p>
      </div>
    </div>
  )
}
