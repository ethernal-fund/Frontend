import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';

import { ROUTES } from './routes';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminGuard } from './AdminGuard';
import { SessionGuard } from './SessionGuard';
import ScrollToTop from './ScrollToTop';
import ErrorBoundary from './ErrorBoundary';
import LoadingScreen from '@/components/common/LoadingScreen';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Analytics } from '@vercel/analytics/react';

const HomePage       = lazy(() => import('@/pages/public/LandingPage'));
const CalculatorPage = lazy(() => import('@/pages/public/CalculatorPage'));
const ContactPage    = lazy(() => import('@/pages/public/ContactPage'));
const SurveyPage     = lazy(() => import('@/pages/public/SurveyPage'));
const OurHistoryPage = lazy(() => import('@/pages/public/OurHistoryPage'));
const NotFoundPage   = lazy(() => import('@/pages/public/NotFoundPage'));

const PrivacyPage    = lazy(() => import('@/pages/legal/PrivacyPage'));
const TermsPage      = lazy(() => import('@/pages/legal/TermsPage'));
const DisclaimerPage = lazy(() => import('@/pages/legal/DisclaimerPage'));

const DashboardPage  = lazy(() => import('@/pages/user/DashboardPage'));
const CoursesPage    = lazy(() => import('@/pages/user/CoursesPage'));
const LearningPage   = lazy(() => import('@/pages/user/LearningPage'));

const AdminDashboard    = lazy(() => import('@/pages/admin/AdminDashboard'));
const TreasuryPage      = lazy(() => import('@/pages/admin/TreasuryPage'));
const ProtocolManager   = lazy(() => import('@/pages/admin/ProtocolManager'));
const ContactManagement = lazy(() => import('@/pages/admin/ContactManagement'));

// Layout principal
function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background-light">
      <ScrollToTop />
      <SessionGuard />
      <Navbar />
      <main className="grow">
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <Analytics />
    </div>
  );
}

const routerErrorBoundary = (
  <ErrorBoundary
    fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Algo salió mal</h1>
        <p className="text-gray-500 mb-6 max-w-md">
          Ocurrió un error inesperado. Por favor intenta recargar la página.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-forest-green text-white rounded-lg font-semibold hover:opacity-90 transition"
        >
          Recargar Página
        </button>
      </div>
    }
  />
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: routerErrorBoundary,           
    children: [
      { index: true, element: <HomePage /> },
      { path: ROUTES.CALCULATOR, element: <CalculatorPage /> },
      { path: ROUTES.CONTACT,    element: <ContactPage /> },
      { path: ROUTES.SURVEY,     element: <SurveyPage /> },
      { path: ROUTES.OUR_HISTORY, element: <OurHistoryPage /> },
      { path: ROUTES.PRIVACY,    element: <PrivacyPage /> },
      { path: ROUTES.TERMS,      element: <TermsPage /> },
      { path: ROUTES.DISCLAIMER, element: <DisclaimerPage /> },
      {
        path: ROUTES.DASHBOARD,
        element: <ProtectedRoute><DashboardPage /></ProtectedRoute>,
      },
      {
        path: ROUTES.COURSES,
        element: <ProtectedRoute><CoursesPage /></ProtectedRoute>,
      },
      {
        path: ROUTES.LEARNING,
        element: <ProtectedRoute><LearningPage /></ProtectedRoute>,
      },
      {
        path: ROUTES.ADMIN,
        element: <AdminGuard />,
        children: [
          { index: true, element: <Navigate to={ROUTES.ADMIN_DASHBOARD} replace /> },
          { path: 'dashboard', element: <AdminDashboard /> },
          { path: 'treasury',  element: <TreasuryPage /> },
          { path: 'protocols', element: <ProtocolManager /> },
          { path: 'contact',   element: <ContactManagement /> },
        ],
      },

      { path: ROUTES.LEGACY_ADMIN_LOGIN, element: <Navigate to={ROUTES.ADMIN_DASHBOARD} replace /> },
      { path: ROUTES.LEGACY_GOVERNANCE,  element: <Navigate to={ROUTES.DASHBOARD} replace /> },
      { path: ROUTES.LEGACY_FUND,        element: <Navigate to={ROUTES.COURSES} replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}

export { ROUTES, ROUTE_META } from './routes';
export type { AppRoute, RouteMeta, RouteGuard } from './routes';
export { ProtectedRoute };
export { default as ScrollToTop } from './ScrollToTop';
export { default as ErrorBoundary } from './ErrorBoundary';