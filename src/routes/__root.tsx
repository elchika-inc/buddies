import { createRootRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Home, Cat, Dog } from 'lucide-react'

export const Route = createRootRoute({
  component: () => {
    const location = useLocation()
    const isHomePage = location.pathname === '/'
    
    return (
      <>
        {!isHomePage && (
          <nav className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex space-x-8">
                  <Link 
                    to="/" 
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300 transition-colors"
                    activeProps={{
                      className: "inline-flex items-center px-1 pt-1 text-sm font-medium text-indigo-600 border-b-2 border-indigo-500"
                    }}
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </Link>
                  <Link 
                    to="/cats" 
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300 transition-colors"
                    activeProps={{
                      className: "inline-flex items-center px-1 pt-1 text-sm font-medium text-purple-600 border-b-2 border-purple-500"
                    }}
                  >
                    <Cat className="w-4 h-4 mr-2" />
                    Cat Match
                  </Link>
                  <Link 
                    to="/dogs" 
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300 transition-colors"
                    activeProps={{
                      className: "inline-flex items-center px-1 pt-1 text-sm font-medium text-orange-600 border-b-2 border-orange-500"
                    }}
                  >
                    <Dog className="w-4 h-4 mr-2" />
                    Dog Match
                  </Link>
                </div>
              </div>
            </div>
          </nav>
        )}
        <Outlet />
        <TanStackRouterDevtools />
      </>
    )
  },
})