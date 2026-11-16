import { useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'

export function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="Page Not Found" />
      <PageWrapper>
        <div className="flex flex-col items-center justify-center text-center py-20 px-4">
          <div className="text-gray-300 mb-6">
            <span className="text-6xl font-black">404</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Looks like you're lost.</h2>
          <p className="text-gray-500 mb-8 max-w-sm">
            The page you are looking for does not exist or has been moved.
          </p>
          <Button onClick={() => navigate('/projects')} size="lg" className="w-full max-w-xs shadow-md">
            <Home className="h-5 w-5 mr-2" />
            Go to Dashboard
          </Button>
        </div>
      </PageWrapper>
    </div>
  )
}
