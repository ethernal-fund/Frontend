import { useState, useEffect } from 'react'
import {
  Droplets,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Coins,
  Zap,
  Link,
  ArrowRightLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Clock,
  ServerCrash,
  Timer,
} from 'lucide-react'
import { useWallet }     from '@/hooks/web3/useWallet'
import { useChainCheck } from '@/hooks/web3/useChainCheck'
import {
  faucetClient,
  FaucetError,
  FaucetErrorCode,
  getChainFaucetConfig,
  hasFirstPartyFaucet,
} from '@/services/faucet/faucet-client'
import type { FaucetSuccessResponse } from '@/services/faucet/faucet-client'

// Types 

interface FaucetButtonProps {
  className?: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

// Constants 

const EXPLORER_URLS: Record<number, string> = {
  421614:   'https://sepolia.arbiscan.io',
  11155111: 'https://sepolia.etherscan.io',
  80002:    'https://amoy.polygonscan.com',
  84532:    'https://sepolia.basescan.org',
  11155420: 'https://sepolia-optimism.etherscan.io',
}

// Helpers 

function formatWaitTime(seconds: number): string {
  if (seconds < 60)   return `${seconds} segundo${seconds !== 1 ? 's' : ''}`
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} minuto${Math.ceil(seconds / 60) !== 1 ? 's' : ''}`
  const h = Math.floor(seconds / 3600)
  const m = Math.ceil((seconds % 3600) / 60)
  return m > 0 ? `${h} h ${m} min` : `${h} hora${h !== 1 ? 's' : ''}`
}

function UnsupportedChainPanel({
  currentChainId,
  supportedChains,
  isSwitching,
  switchError,
  onSwitch,
}: {
  currentChainId:  number
  supportedChains: { chainId: number; chainName: string; hasFirstPartyFaucet: boolean }[]
  isSwitching:     boolean
  switchError:     string | null
  onSwitch:        (chainId: number) => void
}) {
  const ordered = [
    ...supportedChains.filter((c) => c.hasFirstPartyFaucet),
    ...supportedChains.filter((c) => !c.hasFirstPartyFaucet),
  ]
  return (
    <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <WifiOff className="text-orange-500 shrink-0 mt-0.5" size={20} />
        <div>
          <p className="font-bold text-orange-800 text-sm">
            Red no soportada (ID: {currentChainId})
          </p>
          <p className="text-orange-700 text-xs mt-0.5">
            Cambiá a una de estas redes para usar el faucet:
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {ordered.map((chain) => (
          <button
            key={chain.chainId}
            onClick={() => onSwitch(chain.chainId)}
            disabled={isSwitching}
            className="w-full flex items-center justify-between gap-3 bg-white
                       border border-orange-200 hover:border-orange-400 hover:bg-orange-50
                       rounded-xl px-4 py-3 transition disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isSwitching
                ? <Loader2 size={14} className="text-orange-500 animate-spin shrink-0" />
                : <div className={`w-2 h-2 rounded-full shrink-0 ${chain.hasFirstPartyFaucet ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              }
              <span className="text-sm font-medium text-gray-800 truncate">{chain.chainName}</span>
              {chain.hasFirstPartyFaucet && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100
                                 border border-emerald-200 px-1.5 py-0.5 rounded-md shrink-0">
                  Faucet disponible
                </span>
              )}
            </div>
            <ChevronRight size={14} className="text-gray-400 group-hover:text-orange-500 transition shrink-0" />
          </button>
        ))}
      </div>
      {switchError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {switchError}
        </p>
      )}
      <p className="text-xs text-orange-600 text-center">
        Tu wallet te pedirá confirmar el cambio de red.
      </p>
    </div>
  )
}

function SuggestBetterChainBanner({
  currentChainName,
  firstPartyChains,
  isSwitching,
  onSwitch,
  onDismiss,
}: {
  currentChainName: string
  firstPartyChains: { chainId: number; chainName: string }[]
  isSwitching:      boolean
  onSwitch:         (chainId: number) => void
  onDismiss:        () => void
}) {
  if (firstPartyChains.length === 0) return null
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-start gap-3">
      <ArrowRightLeft className="text-indigo-500 shrink-0 mt-0.5" size={16} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-indigo-800">
          {currentChainName} no tiene faucet propio
        </p>
        <p className="text-xs text-indigo-600 mt-0.5 mb-2">
          Cambiá para recibir tokens directamente:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {firstPartyChains.map((chain) => (
            <button
              key={chain.chainId}
              onClick={() => onSwitch(chain.chainId)}
              disabled={isSwitching}
              className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700
                         disabled:bg-indigo-300 px-2.5 py-1 rounded-lg transition
                         inline-flex items-center gap-1"
            >
              {isSwitching ? <Loader2 size={10} className="animate-spin" /> : <ArrowRightLeft size={10} />}
              {chain.chainName}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="text-indigo-400 hover:text-indigo-600 text-xs shrink-0 transition"
        aria-label="Cerrar sugerencia"
      >
        ✕
      </button>
    </div>
  )
}

// Main Component 

export function FaucetButton({ className = '' }: FaucetButtonProps) {
  const { address, isConnected } = useWallet()
  const {
    currentChainId,
    isSupported,
    isSwitching,
    switchError,
    switchToChain,
    clearSwitchError,
    supportedChains,
    firstPartyChains,
  } = useChainCheck()

  // State 
  const [status,          setStatus         ] = useState<Status>('idle')
  const [loading,         setLoading        ] = useState(false)
  const [result,          setResult         ] = useState<FaucetSuccessResponse | null>(null)
  const [errorCode,       setErrorCode      ] = useState<FaucetErrorCode | null>(null)
  const [errorMsg,        setErrorMsg       ] = useState<string | null>(null)
  const [waitSeconds,     setWaitSeconds    ] = useState<number | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const chainConfig   = getChainFaucetConfig(currentChainId)
  const hasFirstParty = hasFirstPartyFaucet(currentChainId)
  const explorerBase  = EXPLORER_URLS[currentChainId] ?? 'https://etherscan.io'

  // Reset al cambiar wallet o chain
  useEffect(() => {
    setStatus('idle')
    setLoading(false)
    setResult(null)
    setErrorCode(null)
    setErrorMsg(null)
    setWaitSeconds(null)
    setBannerDismissed(false)
    clearSwitchError()
  }, [address, currentChainId, clearSwitchError])

  // Handlers 
  const handleSwitch = async (chainId: number) => {
    try { await switchToChain(chainId) } catch { /* error queda en switchError del hook */ }
  }

  const handleReset = () => {
    setStatus('idle')
    setLoading(false)
    setResult(null)
    setErrorCode(null)
    setErrorMsg(null)
    setWaitSeconds(null)
  }

  const handleRequest = async () => {
    if (!address || !isConnected || address.length !== 42) return

    setStatus('loading')
    setLoading(true)
    setResult(null)
    setErrorCode(null)
    setErrorMsg(null)
    setWaitSeconds(null)

    try {
      const res = await faucetClient.requestTokens({ address, chainId: currentChainId })
      setStatus('success')
      setResult(res)
    } catch (err) {
      setStatus('error')
      if (err instanceof FaucetError) {
        // Camino esperado: error tipado con toda la información necesaria
        setErrorCode(err.code)
        setErrorMsg(err.message)
        if (err.waitSeconds != null) setWaitSeconds(err.waitSeconds)
      } else {
        // Camino inesperado: excepción no tipada (no debería ocurrir)
        setErrorCode(FaucetErrorCode.UNKNOWN)
        setErrorMsg(err instanceof Error ? err.message : 'Error desconocido.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Guard: wallet no conectada
  if (!isConnected || !address) {
    return (
      <div className={`bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <AlertCircle className="text-amber-500 shrink-0" size={20} />
          <p className="text-amber-800 text-sm font-medium">
            Conectá tu wallet para recibir tokens de prueba.
          </p>
        </div>
      </div>
    )
  }

  // Guard: chain completamente fuera de config 
  if (!isSupported) {
    return (
      <div className={className}>
        <UnsupportedChainPanel
          currentChainId={currentChainId}
          supportedChains={supportedChains}
          isSwitching={isSwitching}
          switchError={switchError}
          onSwitch={handleSwitch}
        />
      </div>
    )
  }

  // Guard: chain en config pero sin datos (safety) 
  if (!chainConfig) {
    return (
      <div className={`bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <AlertCircle className="text-gray-400 shrink-0" size={20} />
          <p className="text-gray-600 text-sm">
            No hay faucet disponible para esta red ({currentChainId}).
          </p>
        </div>
      </div>
    )
  }

  // Chain sin faucet propio → links públicos 
  if (!hasFirstParty) {
    return (
      <div className={`space-y-3 ${className}`}>
        {!bannerDismissed && firstPartyChains.length > 0 && (
          <SuggestBetterChainBanner
            currentChainName={chainConfig.chainName}
            firstPartyChains={firstPartyChains}
            isSwitching={isSwitching}
            onSwitch={handleSwitch}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <Link className="text-blue-500 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-bold text-blue-800 text-sm mb-1">
                Faucets públicos para {chainConfig.chainName}
              </p>
              <p className="text-blue-700 text-xs">
                Esta red no tiene faucet propio todavía. Usá uno de estos:
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {chainConfig.publicUrls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900
                           bg-white border border-blue-200 rounded-xl px-4 py-2.5 transition hover:shadow-sm">
                <ExternalLink size={14} className="shrink-0" />
                <span className="truncate">{url.replace('https://', '')}</span>
              </a>
            ))}
          </div>
          <div className="mt-3 bg-white/60 rounded-xl px-3 py-2 border border-blue-200 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs text-gray-600 truncate">
              {address.slice(0, 10)}…{address.slice(-8)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Success 
  if (status === 'success' && result) {
    const usdcUrl = result.tx_hash     ? `${explorerBase}/tx/${result.tx_hash}`     : null
    const ethUrl  = result.eth_tx_hash ? `${explorerBase}/tx/${result.eth_tx_hash}` : null
    return (
      <div className={`bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 ${className}`}>
        <div className="flex items-start gap-3 mb-4">
          <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={24} />
          <div className="min-w-0">
            <p className="font-bold text-emerald-800 text-base leading-snug">{result.message}</p>
            {result.amount != null && (
              <div className="flex items-center gap-1.5 mt-2">
                <Coins size={14} className="text-emerald-600 shrink-0" />
                <p className="text-emerald-700 text-sm">
                  {chainConfig.tokenSymbol} recibido: <strong>{result.amount.toLocaleString()}</strong>
                </p>
              </div>
            )}
            {result.eth_amount != null && (
              <div className="flex items-center gap-1.5 mt-1">
                <Zap size={14} className="text-indigo-600 shrink-0" />
                <p className="text-indigo-700 text-sm">
                  ETH gas recibido: <strong>{result.eth_amount} ETH</strong>
                </p>
              </div>
            )}
            {result.balance != null && (
              <p className="text-emerald-600 text-xs mt-1.5">
                Balance actual: {result.balance.toLocaleString()} {chainConfig.tokenSymbol}
              </p>
            )}
          </div>
        </div>
        {(usdcUrl || ethUrl) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {usdcUrl && (
              <a href={usdcUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700
                           text-white font-semibold px-3 py-1.5 rounded-lg transition">
                <ExternalLink size={12} /> Ver tx {chainConfig.tokenSymbol}
              </a>
            )}
            {ethUrl && (
              <a href={ethUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700
                           text-white font-semibold px-3 py-1.5 rounded-lg transition">
                <ExternalLink size={12} /> Ver tx ETH
              </a>
            )}
          </div>
        )}
        <button onClick={handleReset}
          className="inline-flex items-center gap-2 text-xs text-emerald-700 hover:text-emerald-900 font-medium transition">
          <RefreshCw size={12} /> Solicitar de nuevo
        </button>
      </div>
    )
  }

  // Error — switch por código tipado, sin string matching
  if (status === 'error' && errorCode !== null) {
    // Botón de "volver" reutilizable dentro del bloque de error
    const BackBtn = ({
      label = 'Intentar de nuevo',
      color = 'red',
    }: {
      label?: string
      color?: 'red' | 'amber' | 'orange'
    }) => {
      const cls = { red: 'text-red-700 hover:text-red-900', amber: 'text-amber-700 hover:text-amber-900', orange: 'text-orange-700 hover:text-orange-900' }[color]
      return (
        <button onClick={handleReset} className={`inline-flex items-center gap-2 text-xs font-medium transition ${cls}`}>
          <RefreshCw size={12} /> {label}
        </button>
      )
    }

    // Links públicos reutilizables dentro del bloque de error
    const PublicLinks = ({ colorClass }: { colorClass: string }) =>
      chainConfig.publicUrls.length > 0 ? (
        <div className="mb-3">
          <p className={`text-xs font-medium mb-2 ${colorClass}`}>
            Mientras tanto, usá un faucet público:
          </p>
          <div className="space-y-1.5">
            {chainConfig.publicUrls.slice(0, 2).map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-2 text-xs bg-white border rounded-lg px-3 py-1.5 transition ${colorClass}`}>
                <ExternalLink size={12} className="shrink-0" />
                {url.replace('https://', '')}
              </a>
            ))}
          </div>
        </div>
      ) : null

    switch (errorCode) {

      // Red incorrecta (pre-fetch, determinístico) 
      case FaucetErrorCode.NETWORK_MISMATCH:
      case FaucetErrorCode.NO_FIRST_PARTY_FAUCET: {
        const orderedChains = [
          ...supportedChains.filter((c) => c.hasFirstPartyFaucet),
          ...supportedChains.filter((c) => !c.hasFirstPartyFaucet),
        ]
        return (
          <div className={`bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 space-y-4 ${className}`}>
            <div className="flex items-start gap-3">
              <WifiOff className="text-orange-500 shrink-0 mt-0.5" size={22} />
              <div>
                <p className="font-bold text-orange-800 text-sm">
                  {errorCode === FaucetErrorCode.NETWORK_MISMATCH
                    ? `Red no soportada (ID: ${currentChainId})`
                    : `${chainConfig.chainName} no tiene faucet propio`
                  }
                </p>
                <p className="text-orange-700 text-xs mt-1">
                  Cambiá a una red con faucet disponible:
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {orderedChains.map((chain) => (
                <button
                  key={chain.chainId}
                  onClick={() => handleSwitch(chain.chainId)}
                  disabled={isSwitching || chain.chainId === currentChainId}
                  className="w-full flex items-center justify-between gap-3 bg-white
                             border border-orange-200 hover:border-orange-400 hover:bg-orange-50
                             rounded-xl px-4 py-3 transition disabled:opacity-50 disabled:cursor-default group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isSwitching
                      ? <Loader2 size={14} className="text-orange-500 animate-spin shrink-0" />
                      : <div className={`w-2 h-2 rounded-full shrink-0 ${
                          chain.chainId === currentChainId ? 'bg-emerald-500'
                          : chain.hasFirstPartyFaucet      ? 'bg-emerald-400'
                          : 'bg-amber-400'
                        }`} />
                    }
                    <span className="text-sm font-medium text-gray-800 truncate">{chain.chainName}</span>
                    {chain.hasFirstPartyFaucet && chain.chainId !== currentChainId && (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-100
                                       border border-emerald-200 px-1.5 py-0.5 rounded-md shrink-0">
                        Faucet disponible
                      </span>
                    )}
                    {chain.chainId === currentChainId && (
                      <span className="text-xs text-emerald-600 font-semibold shrink-0">✓ actual</span>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-gray-400 group-hover:text-orange-500 transition shrink-0" />
                </button>
              ))}
            </div>

            {switchError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {switchError}
              </p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs text-orange-600">Tu wallet pedirá confirmar el cambio.</p>
              <BackBtn label="Cerrar" color="orange" />
            </div>
          </div>
        )
      }

      // Rate limit (HTTP 429 o wait_time presente) 
      case FaucetErrorCode.RATE_LIMITED:
        return (
          <div className={`bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 ${className}`}>
            <div className="flex items-start gap-3 mb-3">
              <Clock className="text-amber-500 shrink-0 mt-0.5" size={22} />
              <div>
                <p className="font-bold text-amber-800 text-sm">Ya recibiste tokens hoy</p>
                <p className="text-amber-700 text-xs mt-1">
                  El faucet permite una solicitud cada 24 horas por wallet.
                  Volvé mañana para recargar.
                </p>
                {waitSeconds != null && (
                  <p className="text-amber-600 text-xs mt-1.5 font-medium">
                    Tiempo restante: {formatWaitTime(waitSeconds)}
                  </p>
                )}
              </div>
            </div>
            <PublicLinks colorClass="text-amber-700 border-amber-200 hover:text-amber-900" />
            <BackBtn label="Volver" color="amber" />
          </div>
        )

      // CORS / backend inaccesible 
      case FaucetErrorCode.CORS_OR_NETWORK:
        return (
          <div className={`bg-red-50 border-2 border-red-200 rounded-2xl p-5 ${className}`}>
            <div className="flex items-start gap-3 mb-3">
              <ServerCrash className="text-red-500 shrink-0 mt-0.5" size={22} />
              <div>
                <p className="font-bold text-red-800 text-sm">Error de conexión con el servidor</p>
                <p className="text-red-700 text-xs mt-1">{errorMsg}</p>
                <p className="text-red-600 text-xs mt-1">
                  Probá habilitando{' '}
                  <code className="bg-red-100 px-1 rounded">VITE_FAUCET_DIRECT=true</code>{' '}
                  en tu <code>.env</code> o verificá que el backend esté activo.
                </p>
              </div>
            </div>
            <PublicLinks colorClass="text-red-700 border-red-200 hover:text-red-900" />
            <BackBtn />
          </div>
        )

      // Timeout
      case FaucetErrorCode.TIMEOUT:
        return (
          <div className={`bg-red-50 border-2 border-red-200 rounded-2xl p-5 ${className}`}>
            <div className="flex items-start gap-3 mb-3">
              <Timer className="text-red-500 shrink-0 mt-0.5" size={22} />
              <div>
                <p className="font-bold text-red-800 text-sm">La solicitud tardó demasiado</p>
                <p className="text-red-700 text-xs mt-1">
                  El servidor no respondió a tiempo. Puede estar iniciando (cold start) —
                  esperá unos segundos e intentá de nuevo.
                </p>
              </div>
            </div>
            <BackBtn />
          </div>
        )

      // Error de servidor o desconocido 
      case FaucetErrorCode.SERVER_ERROR:
      case FaucetErrorCode.UNKNOWN:
      default:
        return (
          <div className={`bg-red-50 border-2 border-red-200 rounded-2xl p-5 ${className}`}>
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={22} />
              <div>
                <p className="font-bold text-red-800 text-sm">Error al solicitar tokens</p>
                <p className="text-red-700 text-xs mt-1">{errorMsg}</p>
              </div>
            </div>
            <PublicLinks colorClass="text-red-700 border-red-200 hover:text-red-900" />
            <BackBtn />
          </div>
        )
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>

      {/* Chain + address badge */}
      <div className="flex items-center justify-between">
        <div className="bg-white/60 rounded-xl px-3 py-2 border border-blue-200 flex items-center gap-2 flex-1 mr-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-mono text-xs text-gray-600 truncate">
            {address.slice(0, 10)}…{address.slice(-8)}
          </span>
        </div>

        {/* Chain selector con dropdown */}
        <div className="relative group">
          <button
            className="text-xs font-semibold text-purple-700 bg-purple-100 border border-purple-200
                       px-2.5 py-1.5 rounded-xl shrink-0 flex items-center gap-1.5
                       hover:bg-purple-200 transition"
            title="Cambiar red"
          >
            <Wifi size={11} />
            {chainConfig.chainName}
            <ChevronRight size={10} className="rotate-90 opacity-60" />
          </button>
          <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200
                          rounded-xl shadow-xl z-20 hidden group-focus-within:block
                          group-hover:block py-1.5">
            <p className="text-xs text-gray-400 px-3 py-1 font-medium">Cambiar red</p>
            {[
              ...supportedChains.filter((c) => c.hasFirstPartyFaucet),
              ...supportedChains.filter((c) => !c.hasFirstPartyFaucet),
            ].map((chain) => (
              <button
                key={chain.chainId}
                onClick={() => handleSwitch(chain.chainId)}
                disabled={isSwitching || chain.chainId === currentChainId}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs
                           hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-default"
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  chain.chainId === currentChainId ? 'bg-emerald-500'
                  : chain.hasFirstPartyFaucet      ? 'bg-blue-400'
                  : 'bg-gray-300'
                }`} />
                <span className={`font-medium ${chain.chainId === currentChainId ? 'text-emerald-700' : 'text-gray-700'}`}>
                  {chain.chainName}
                </span>
                {chain.chainId === currentChainId && (
                  <span className="ml-auto text-emerald-600 text-xs">✓</span>
                )}
                {chain.hasFirstPartyFaucet && chain.chainId !== currentChainId && (
                  <span className="ml-auto text-blue-500 text-xs font-semibold">faucet</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* What you'll receive */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/70 rounded-xl p-3 border border-blue-100 text-center">
          <p className="text-xs text-gray-500 mb-0.5">{chainConfig.tokenSymbol}</p>
          <p className="font-black text-emerald-700 text-lg">~5,000</p>
          <p className="text-xs text-gray-400">para tu fondo</p>
        </div>
        <div className="bg-white/70 rounded-xl p-3 border border-blue-100 text-center">
          <p className="text-xs text-gray-500 mb-0.5">ETH gas</p>
          <p className="font-black text-indigo-700 text-lg">~0.01</p>
          <p className="text-xs text-gray-400">para transacciones</p>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleRequest}
        disabled={loading || isSwitching}
        className="w-full inline-flex items-center justify-center gap-3 px-5 py-3.5
                   bg-linear-to-r from-blue-600 to-indigo-600
                   hover:from-blue-700 hover:to-indigo-700
                   disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed
                   text-white font-bold rounded-xl transition-all transform
                   hover:scale-105 disabled:scale-100 shadow-lg"
      >
        {loading ? (
          <><Loader2 size={20} className="animate-spin" /> Minteando {chainConfig.tokenSymbol}…</>
        ) : isSwitching ? (
          <><Loader2 size={20} className="animate-spin" /> Cambiando red…</>
        ) : (
          <><Droplets size={20} /> Recibir {chainConfig.tokenSymbol} de Prueba</>
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        {chainConfig.tokenSymbol} en {chainConfig.chainName} · 1 solicitud / 24 hs por wallet
      </p>

      {/* Faucets públicos alternativos */}
      {chainConfig.publicUrls.length > 0 && (
        <details className="group">
          <summary className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer flex items-center gap-1 transition">
            <ExternalLink size={11} />
            Faucets públicos alternativos
          </summary>
          <div className="mt-2 space-y-1.5">
            {chainConfig.publicUrls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700
                           bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 transition">
                <ExternalLink size={11} className="shrink-0" />
                {url.replace('https://', '')}
              </a>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

export default FaucetButton