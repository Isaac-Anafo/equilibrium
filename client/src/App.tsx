import { RouterProvider } from 'react-router'
import { router } from './routes'
import { AuthProvider } from './state/auth'
import { PortfolioProvider } from './state/portfolio'
import { NotificationsProvider } from './state/notifications'

export default function App() {
  return (
    <AuthProvider>
      <PortfolioProvider>
        <NotificationsProvider>
          <RouterProvider router={router}/>
        </NotificationsProvider>
      </PortfolioProvider>
    </AuthProvider>
  )
}
