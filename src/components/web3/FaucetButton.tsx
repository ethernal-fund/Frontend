/**
 * FaucetButton.tsx — con detección y selección de chain
 *
 * Novedades respecto a la versión anterior:
 *  - Al conectar, detecta la chain del usuario
 *  - Si está en una chain soportada → flujo normal
 *  - Si está en una chain NO soportada → muestra panel de selección
 *    con las chains disponibles, destacando las que tienen faucet propio
 *  - Si está en una chain soportada pero sin faucet propio → opción de
 *    cambiar a una con faucet propio, o usar links públicos
 *  - useSwitchChain de wagmi para el cambio programático
 */

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
} from 'lucide-react'
import { useWallet }        from '@/hooks/web3/useWallet'
import { useFaucet }        from '@/hooks/web3/useFaucet'
import { useChainCheck }    from '@/hooks/web3/useChainCheck'
import {
  getChainFaucetConfig,
  hasFirstPartyFaucet,
} from '@/services/faucet/faucet-client'
import type { FaucetResponse } from '@/services/faucet/faucet-client'

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

// Sub-components 

/** Panel que se muestra cuando la chain del usuario no está en nuestra config */
function UnsupportedChainPanel({
  currentChainId,
  supportedChains,
  isSwitching,
  switchError,
  onSwitch,
}: {
  currentChainId:   number
  supportedChains:  { chainId: number; chainName: string; hasFirstPartyFaucet: boolean }[]
  isSwitching:      boolean
  switchError:      string | null
  onSwitch:         (chainId: number) => void
}) {
  // Mostrar primero las que tienen faucet propio
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
            className="w-full flex items-center justify-between gap-3
                       bg-white border border-orange-200 hover:border-orange-400
                       hover:bg-orange-50 rounded-xl px-4 py-3
                       transition disabled:opacity-60 disabled:cursor-not-allowed
                       group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isSwitching ? (
                <Loader2 size={14} className="text-orange-500 animate-spin shrink-0" />
              ) : (
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    chain.hasFirstPartyFaucet ? 'bg-emerald-500' : 'bg-amber-400'
                  }`}
                />
              )}
              <span className="text-sm font-medium text-gray-800 truncate">
                {chain.chainName}
              </span>
              {chain.hasFirstPartyFaucet && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100
                                 border border-emerald-200 px-1.5 py-0.5 rounded-md shrink-0">
                  Faucet disponible
                </span>
              )}
            </div>
            <ChevronRight
              size={14}
              className="text-gray-400 group-hover:text-orange-500 transition shrink-0"
            />
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

/** Banner que aparece cuando la chain actual es soportada pero SIN faucet propio */
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
              {isSwitching
                ? <Loader2 size={10} className="animate-spin" />
                : <ArrowRightLeft size={10} />
              }
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

// ─── Main Component ───────────────────────────────────────────────────────────

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

  const { requestTokens, loading, error: faucetError, clearError } = useFaucet()

  const [status,           setStatus]           = useState<Status>('idle')
  const [result,           setResult]           = useState<FaucetResponse | null>(null)
  const [errorMsg,         setErrorMsg]         = useState<string | null>(null)
  const [bannerDismissed,  setBannerDismissed]  = useState(false)

  const chainConfig   = getChainFaucetConfig(currentChainId)
  const hasFirstParty = hasFirstPartyFaucet(currentChainId)
  const explorerBase  = EXPLORER_URLS[currentChainId] ?? 'https://etherscan.io'

  // Reset on wallet/chain change
  useEffect(() => {
    setStatus('idle')
    setResult(null)
    setErrorMsg(null)
    setBannerDismissed(false)
    clearError()
    clearSwitchError()
  }, [address, currentChainId, clearError, clearSwitchError])

  const handleSwitch = async (chainId: number) => {
    try {
      await switchToChain(chainId)
      // El useChainId de wagmi se actualizará automáticamente
    } catch {
      // El error ya queda en switchError del hook
    }
  }

  const handleRequest = async () => {
    if (!address || !isConnected || address.length !== 42) return

    setStatus('loading')
    setResult(null)
    setErrorMsg(null)
    clearError()

    try {
      const res = await requestTokens({ address, chainId: currentChainId })

      if (res.success) {
        setStatus('success')
        setResult(res)
      } else {
        setStatus('error')
        setErrorMsg(res.message || 'El faucet no pudo procesar la solicitud.')
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(
        faucetError ?? (err instanceof Error ? err.message : 'Error al contactar el faucet.'),
      )
    }
  }

  const handleReset = () => {
    setStatus('idle')
    setResult(null)
    setErrorMsg(null)
    clearError()
  }

  // ── Wallet not connected ──────────────────────────────────────────────────────
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

  // Chain not supported at all → must switch 
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

  // Chain supported but no config (safety guard) 
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

  // ── Chain has NO first-party faucet → show public links + switch suggestion ───
  if (!hasFirstParty) {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Suggest switching */}
        {!bannerDismissed && firstPartyChains.length > 0 && (
          <SuggestBetterChainBanner
            currentChainName={chainConfig.chainName}
            firstPartyChains={firstPartyChains}
            isSwitching={isSwitching}
            onSwitch={handleSwitch}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}

        {/* Public faucet links for current chain */}
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
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900
                           bg-white border border-blue-200 rounded-xl px-4 py-2.5
                           transition hover:shadow-sm"
              >
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

  // ── Success ───────────────────────────────────────────────────────────────────
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
                  {chainConfig.tokenSymbol} recibido:{' '}
                  <strong>{result.amount.toLocaleString()}</strong>
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

  // ── Error ─────────────────────────────────────────────────────────────────────
  if (status === 'error') {
    const msg = errorMsg ?? ''
    const isRateLimit =
      msg.toLowerCase().includes('rate')   ||
      msg.toLowerCase().includes('limit')  ||
      msg.toLowerCase().includes('espera') ||
      msg.toLowerCase().includes('24')     ||
      msg.toLowerCase().includes('wallet') ||
      msg.toLowerCase().includes('ip')

    const isCORSError =
      msg.toLowerCase().includes('cors')            ||
      msg.toLowerCase().includes('proxy')           ||
      msg.toLowerCase().includes('failed to fetch') ||
      msg.toLowerCase().includes('conectar')

    return (
      <div className={`bg-red-50 border-2 border-red-200 rounded-2xl p-5 ${className}`}>
        <div className="flex items-start gap-3 mb-3">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-bold text-red-800 text-sm">
              {isRateLimit
                ? 'Límite de solicitudes alcanzado'
                : isCORSError
                ? 'Error de conexión con el servidor'
                : 'Error al solicitar tokens'}
            </p>
            <p className="text-red-700 text-xs mt-1">{msg}</p>

            {isRateLimit && (
              <p className="text-red-600 text-xs mt-1">
                El faucet permite una solicitud cada 24 horas por wallet.
              </p>
            )}

            {isCORSError && (
              <p className="text-red-600 text-xs mt-1">
                Probá habilitando{' '}
                <code className="bg-red-100 px-1 rounded">VITE_FAUCET_DIRECT=true</code>{' '}
                en tu <code>.env</code> o agregá{' '}
                <code className="bg-red-100 px-1 rounded">POST /api/v1/faucet/proxy</code>{' '}
                en tu backend.
              </p>
            )}
          </div>
        </div>

        {chainConfig.publicUrls.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-red-700 font-medium mb-2">
              Mientras tanto, usá un faucet público:
            </p>
            <div className="space-y-1.5">
              {chainConfig.publicUrls.slice(0, 2).map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-red-700 hover:text-red-900
                             bg-white border border-red-200 rounded-lg px-3 py-1.5 transition">
                  <ExternalLink size={12} className="shrink-0" />
                  {url.replace('https://', '')}
                </a>
              ))}
            </div>
          </div>
        )}

        <button onClick={handleReset}
          className="inline-flex items-center gap-2 text-xs text-red-700 hover:text-red-900 font-medium transition">
          <RefreshCw size={12} /> Intentar de nuevo
        </button>
      </div>
    )
  }

  // Idle / Loading — main CTA 
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

        {/* Chain selector — click to switch */}
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

          {/* Dropdown */}
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
                           hover:bg-gray-50 transition disabled:opacity-50
                           disabled:cursor-default"
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    chain.chainId === currentChainId
                      ? 'bg-emerald-500'
                      : chain.hasFirstPartyFaucet
                      ? 'bg-blue-400'
                      : 'bg-gray-300'
                  }`}
                />
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
        disabled={loading || status === 'loading' || isSwitching}
        className="w-full inline-flex items-center justify-center gap-3 px-5 py-3.5
                   bg-linear-to-r from-blue-600 to-indigo-600
                   hover:from-blue-700 hover:to-indigo-700
                   disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed
                   text-white font-bold rounded-xl transition-all transform
                   hover:scale-105 disabled:scale-100 shadow-lg"
      >
        {loading || status === 'loading' ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Minteando {chainConfig.tokenSymbol}…
          </>
        ) : isSwitching ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Cambiando red…
          </>
        ) : (
          <>
            <Droplets size={20} />
            Recibir {chainConfig.tokenSymbol} de Prueba
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        {chainConfig.tokenSymbol} en {chainConfig.chainName} · 1 solicitud / 24 hs por wallet
      </p>

      {/* Public faucet links (secondary) */}
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