import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'
import { PageWrapper } from './PageWrapper'
import { Header } from './Header'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  handleReload = () => {
    window.sessionStorage.clear()
    window.location.replace('/')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header title="Something went wrong" />
          <PageWrapper>
            <div className="flex flex-col items-center justify-center text-center py-20 px-4">
              <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Oops! An error occurred.</h2>
              <p className="text-gray-500 mb-8 max-w-sm">
                We're sorry, but the application encountered an unexpected error. This might be due to a recent update.
              </p>
              <Button onClick={this.handleReload} size="lg" className="w-full max-w-xs shadow-md">
                <RefreshCw className="h-5 w-5 mr-2" />
                Reload Application
              </Button>
            </div>
          </PageWrapper>
        </div>
      )
    }

    return this.props.children
  }
}
