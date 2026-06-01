import { useSiweSession } from '@/hooks/useSiweSession'

export function useSiweAuth() {
  const { login, logout } = useSiweSession()
  return { login, logout }
}