import { lazy, Suspense } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { ROUTES }        from './routes';
import ScrollToTop       from './ScrollToTop';
import ErrorBoundary     from './ErrorBoundary';
import ProtectedRoute    from './ProtectedRoute';
import { AdminGuard }    from '@/router/AdminGuard';
import LoadingScreen     from '@/components/common/LoadingScreen';
import Navbar            from '@/components/layout/Navbar';
import Footer            from '@/components/layout/Footer';
import { Analytics }     from '@vercel/analytics/react';

// Public 
const HomePage       = lazy(() => import('@/pages/public/LandingPage'));
const CalculatorPage = lazy(() => import('@/pages/public/CalculatorPage'));
const ContactPage    = lazy(() => import('@/pages/public/ContactPage'));
const SurveyPage     = lazy(() => import('@/pages/public/SurveyPage'));
const NotFoundPage   = lazy(() => import('@/pages/public/NotFoundPage'));

// Legal (public, sin Navbar/Footer propios — LegalPage los omite)
const PrivacyPage    = lazy(() => import('@/pages/legal/PrivacyPage'));
const TermsPage      = lazy(() => import('@/pages/legal/TermsPage'));
const DisclaimerPage = lazy(() => import('@/pages/legal/DisclaimerPage'));

// User (wallet required)
const DashboardPage  = lazy(() => import('@/pages/user/DashboardPage'));
const CreateFundPage = lazy(() => import('@/pages/user/CoursesPage'));
const LearningPage   = lazy(() => import('@/pages/user/LearningPage'));

// Admin (AdminGuard lo protege — no necesitan ProtectedRoute individual) ─
const AdminDashboard    = lazy(() => import('@/pages/admin/AdminDashboard'));
const TreasuryPage      = lazy(() => import('@/pages/admin/TreasuryPage'));
const ProtocolManager   = lazy(() => import('@/pages/admin/ProtocolManager'));
const ContactManagement = lazy(() => import('@/pages/admin/ContactManagement'));

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppShell />
      </ErrorBoundary>
    </BrowserRouter>
  );
}

function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-background-light">
      <ScrollToTop />

      {/* Navbar fuera de Suspense — siempre visible durante navegación */}
      <Navbar />

      <main className="grow">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path={ROUTES.HOME} element={<HomePage />} />

            {/* Public */}
            <Route path={ROUTES.CALCULATOR} element={<CalculatorPage />} />
            <Route path={ROUTES.CONTACT}    element={<ContactPage />}    />
            <Route path={ROUTES.SURVEY}     element={<SurveyPage />}     />

            {/* Legal */}
            <Route path={ROUTES.PRIVACY}    element={<PrivacyPage />}    />
            <Route path={ROUTES.TERMS}      element={<TermsPage />}      />
            <Route path={ROUTES.DISCLAIMER} element={<DisclaimerPage />} />

            {/* User — wallet required */}
            <Route
              path={ROUTES.DASHBOARD}
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.COURSES}
              element={
                <ProtectedRoute>
                  <CreateFundPage />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.LEARNING}
              element={
                <ProtectedRoute>
                  <LearningPage />
                </ProtectedRoute>
              }
            />

            {/* Admin — AdminGuard valida el rol on-chain  */}
            <Route
              path={ROUTES.ADMIN}
              element={<Navigate to={ROUTES.ADMIN_DASHBOARD} replace />}
            />
            <Route element={<AdminGuard />}>
              <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboard />}    />
              <Route path={ROUTES.ADMIN_TREASURY}  element={<TreasuryPage />}      />
              <Route path={ROUTES.ADMIN_PROTOCOL}  element={<ProtocolManager />}   />
              <Route path={ROUTES.ADMIN_CONTACT}   element={<ContactManagement />} />
            </Route>

            <Route
              path={ROUTES.LEGACY_ADMIN_LOGIN}
              element={<Navigate to={ROUTES.ADMIN_DASHBOARD} replace />}
            />
            <Route
              path={ROUTES.LEGACY_GOVERNANCE}
              element={<Navigate to={ROUTES.DASHBOARD} replace />}
            />
            <Route
              path={ROUTES.LEGACY_FUND}
              element={<Navigate to={ROUTES.COURSES} replace />}
            />
            <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />

          </Routes>
        </Suspense>
      </main>

      {/* Footer fuera de Suspense — siempre visible durante navegación */}
      <Footer />

      {/* Vercel Analytics — zero-config, sin datos personales y sin afectar performance */}
      <Analytics />
    </div>
  );
}