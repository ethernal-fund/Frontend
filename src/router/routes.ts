export const ROUTES = {
  // Public
  HOME:        '/',
  CALCULATOR:  '/calculator',
  CONTACT:     '/contact',
  SURVEY:      '/survey',
  LEARNING:    '/learning',

  // User (requires connected wallet)
  DASHBOARD:   '/dashboard',
  COURSES:     '/courses',

  // Admin (requires admin role)
  ADMIN:                '/admin',
  ADMIN_DASHBOARD:      '/admin/dashboard',
  ADMIN_TREASURY:       '/admin/treasury',
  ADMIN_PROTOCOL:       '/admin/protocols',
  ADMIN_CONTRACTS:      '/admin/contracts',
  ADMIN_CONTACT:        '/admin/contact',

  // Legacy redirects (do not remove — linked from external sites / emails)
  LEGACY_ADMIN_LOGIN:  '/admin/login',
  LEGACY_GOVERNANCE:   '/governance',
  LEGACY_FUND:         '/fund',

  // 404 catch-all
  NOT_FOUND: '*',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
export type RouteGuard = 'public' | 'auth' | 'admin';

export interface RouteMeta {
  guard: RouteGuard;
  navbar: boolean;
  footer: boolean;
  title: string;
  description?: string;
}

export const ROUTE_META: Partial<Record<AppRoute, RouteMeta>> = {
  [ROUTES.HOME]: {
    guard: 'public',
    navbar: true,
    footer: true,
    title: 'Home',
    description: 'Decentralized retirement funds on Arbitrum.',
  },
  [ROUTES.CALCULATOR]: {
    guard: 'public',
    navbar: true,
    footer: true,
    title: 'Retirement Calculator',
    description: 'Calculate how much you need to save for retirement.',
  },
  [ROUTES.CONTACT]: {
    guard: 'public',
    navbar: true,
    footer: true,
    title: 'Contact',
    description: 'Get in touch with the Ethernal team.',
  },
  [ROUTES.SURVEY]: {
    guard: 'public',
    navbar: true,
    footer: true,
    title: 'Survey',
    description: 'Anonymous survey to help us improve Ethernal.',
  },
  [ROUTES.LEARNING]: {
    guard: 'public',
    navbar: true,
    footer: true,
    title: 'Learning Center',
    description: 'Learn about DeFi, retirement planning, and blockchain.',
  },
  [ROUTES.DASHBOARD]: {
    guard: 'auth',
    navbar: true,
    footer: true,
    title: 'Dashboard',
    description: 'Manage your personal retirement fund.',
  },
    [ROUTES.COURSES]: {
    guard: 'auth',
    navbar: true,
    footer: true,
    title: 'Courses',
    description: 'Learn about DeFi, retirement planning, blockchain, economics and more.',
  },
  [ROUTES.ADMIN_DASHBOARD]: {
    guard: 'admin',
    navbar: true,
    footer: false,
    title: 'Admin — Overview',
  },
  [ROUTES.ADMIN_TREASURY]: {
    guard: 'admin',
    navbar: true,
    footer: false,
    title: 'Admin — Treasury',
  },
  [ROUTES.ADMIN_PROTOCOL]: {
  guard: 'admin',
  navbar: true,
  footer: false,
  title: 'Admin — Protocol',
  },
  [ROUTES.ADMIN_CONTRACTS]: {
    guard: 'admin',
    navbar: true,
    footer: false,
    title: 'Admin — Contracts',
  },
  [ROUTES.ADMIN_CONTACT]: {
    guard: 'admin',
    navbar: true,
    footer: false,
    title: 'Admin — Messages',
  },
};