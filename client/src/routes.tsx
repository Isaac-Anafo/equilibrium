import { lazy } from 'react'
import { createBrowserRouter, Navigate, useLocation } from 'react-router'

import AppLayout from './layouts/AppLayout'
import SignIn from './pages/SignIn'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Legal from './pages/Legal'
import NotFound from './pages/NotFound'
import OnboardingLayout from './pages/onboarding/OnboardingLayout'
import StepAccount from './pages/onboarding/StepAccount'
import StepPortfolio from './pages/onboarding/StepPortfolio'
import StepHoldings from './pages/onboarding/StepHoldings'
import StepComplete from './pages/onboarding/StepComplete'
import { useAuth } from './state/auth'

// Chart-heavy authenticated screens are split out of the entry bundle.
const Dashboard     = lazy(() => import('./pages/Dashboard'))
const Rebalance     = lazy(() => import('./pages/Rebalance'))
const ConfirmTrades = lazy(() => import('./pages/ConfirmTrades'))
const Analytics     = lazy(() => import('./pages/Analytics'))
const Settings      = lazy(() => import('./pages/Settings'))
const Notifications = lazy(() => import('./pages/Notifications'))

function ProtectedLayout() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }}/>
  return <AppLayout/>
}

export const router = createBrowserRouter([
  { path: '/', Component: SignIn },
  { path: '/forgot-password', Component: ForgotPassword },
  { path: '/reset-password', Component: ResetPassword },
  { path: '/legal/:topic', Component: Legal },
  {
    path: '/onboarding',
    Component: OnboardingLayout,
    children: [
      { index: true, element: <Navigate to="account" replace/> },
      { path: 'account',   Component: StepAccount   },
      { path: 'portfolio', Component: StepPortfolio },
      { path: 'holdings',  Component: StepHoldings  },
      { path: 'complete',  Component: StepComplete  },
    ],
  },
  {
    Component: ProtectedLayout,
    children: [
      { path: 'dashboard', Component: Dashboard },
      {
        path: 'rebalance',
        Component: Rebalance,
        children: [{ path: 'confirm', Component: ConfirmTrades }],
      },
      { path: 'analytics',     Component: Analytics     },
      { path: 'settings',      Component: Settings      },
      { path: 'notifications', Component: Notifications },
    ],
  },
  { path: '*', Component: NotFound },
])
