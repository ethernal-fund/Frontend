import { useEffect, useState } from 'react'
import { Loader2, WifiOff, Wifi } from 'lucide-react'

interface BackendStatusProps {
  apiUrl: string
}

export default function BackendStatus({ apiUrl }: BackendStatusProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected' | 'cold-start'>('checking')
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    let interval: NodeJS.Timeout

    const checkStatus = async () => {
      try {
        const response = await fetch(`${apiUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(10000),
        })

        if (response.ok) {
          setStatus('connected')
          clearInterval(interval)
        }
      } catch (error) {
        const elapsed = (Date.now() - startTime) / 1000
        setElapsedTime(elapsed)

        if (elapsed > 15 && elapsed < 60) {
          setStatus('cold-start')
        } else if (elapsed >= 60) {
          setStatus('disconnected')
          clearInterval(interval)
        }
      }
    }
    checkStatus()
    interval = setInterval(checkStatus, 10000)

    return () => clearInterval(interval)
  }, [apiUrl])

  if (status === 'connected') {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-600 backdrop-blur-sm border border-green-500/20">
        <Wifi className="h-4 w-4" />
        <span>Backend connected</span>
      </div>
    )
  }

  if (status === 'cold-start') {
    return (
      <div className="fixed top-4 right-4 z-50 max-w-md rounded-lg bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 backdrop-blur-sm border border-yellow-500/20">
        <div className="flex items-start gap-3">
          <Loader2 className="h-5 w-5 animate-spin shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-1">Backend is waking up...</p>
            <p className="text-xs text-yellow-600/80">
              Render.com free tier takes 1-2 minutes to start.
              Elapsed: {elapsedTime.toFixed(0)}s
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'disconnected') {
    return (
      <div className="fixed top-4 right-4 z-50 max-w-md rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 backdrop-blur-sm border border-red-500/20">
        <div className="flex items-start gap-3">
          <WifiOff className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-1">Backend unavailable</p>
            <p className="text-xs text-red-600/80">
              The app will work in offline mode. Some features may be limited.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2 text-sm text-blue-600 backdrop-blur-sm border border-blue-500/20">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Connecting to backend...</span>
    </div>
  )
}