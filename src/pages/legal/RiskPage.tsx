import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Shield, Clock, TrendingDown, Zap, Globe } from 'lucide-react';

// Types 

interface RiskItem {
  icon:        React.ReactNode;
  title:       string;
  severity:    'critical' | 'high' | 'medium';
  summary:     string;
  detail:      string;
}

// Constants 

const SEVERITY_CONFIG = {
  critical: {
    label:  'Riesgo Crítico',
    badge:  'bg-red-100 text-red-800 border border-red-200',
    bar:    'bg-red-500',
    border: 'border-l-red-500',
  },
  high: {
    label:  'Riesgo Alto',
    badge:  'bg-orange-100 text-orange-800 border border-orange-200',
    bar:    'bg-orange-400',
    border: 'border-l-orange-400',
  },
  medium: {
    label:  'Riesgo Medio',
    badge:  'bg-yellow-100 text-yellow-800 border border-yellow-200',
    bar:    'bg-yellow-400',
    border: 'border-l-yellow-400',
  },
} as const;

const RISKS: RiskItem[] = [
  {
    icon:     <TrendingDown size={20} />,
    title:    'Podés perder todo lo que depositás',
    severity: 'critical',
    summary:  'Los fondos depositados en el protocolo pueden perderse en su totalidad.',
    detail:   'Ethernal Fund opera sobre contratos inteligentes en blockchain. Si existe un bug, una vulnerabilidad de seguridad o un exploit en el código — incluso después de ser auditado — los fondos pueden perderse de forma irreversible. No existe ningún seguro, garantía estatal ni mecanismo de recuperación. Antes de depositar, asegurate de entender que estás asumiendo ese riesgo completamente.',
  },
  {
    icon:     <Shield size={20} />,
    title:    'Las transacciones son irreversibles',
    severity: 'critical',
    summary:  'Una vez que enviás USDC al protocolo, no hay devolución posible.',
    detail:   'Las operaciones en blockchain son permanentes. El protocolo no tiene la capacidad técnica de revertir transacciones, devolver fondos por error ni procesar reembolsos. Si enviás fondos a una dirección incorrecta, usás la red equivocada o cometés cualquier error en la transacción, esos fondos se perderán definitivamente.',
  },
  {
    icon:     <Clock size={20} />,
    title:    'Tus fondos estarán bloqueados por años',
    severity: 'critical',
    summary:  'El timelock es de mínimo 15 años. No podés retirar antes sin aprobación del protocolo.',
    detail:   'Al crear un fondo de retiro, elegís un período de bloqueo de entre 15 y 50 años. Durante ese tiempo, no podés retirar tus fondos bajo ninguna circunstancia sin solicitar y recibir aprobación explícita de la Fundación Ethernal. El protocolo puede rechazar la solicitud. Pensá esto como un compromiso de muy largo plazo: no es para fondos que puedas necesitar en los próximos años.',
  },
  {
    icon:     <Zap size={20} />,
    title:    'Los protocolos DeFi integrados también tienen riesgos',
    severity: 'high',
    summary:  'Aave v3 y Ondo USDY son protocolos externos. Un problema en ellos también te afecta.',
    detail:   'Ethernal invierte tus fondos en protocolos como Aave v3 (lending) y Ondo USDY (bonos del Tesoro tokenizados). Estos son protocolos externos con sus propios riesgos: exploits, pausas de emergencia, cambios de gobernanza, o problemas de liquidez. Un incidente en cualquiera de esos protocolos podría reducir o eliminar tu balance, independientemente del funcionamiento correcto de Ethernal.',
  },
  {
    icon:     <AlertTriangle size={20} />,
    title:    'USDC puede perder su valor',
    severity: 'high',
    summary:  'USDC es una stablecoin, pero no está garantizada 1:1 con el dólar en todo momento.',
    detail:   'Aunque USDC está diseñado para mantener paridad con el dólar estadounidense, existen escenarios de riesgo: problemas de liquidez en Circle (el emisor), cambios regulatorios que afecten las reservas, o eventos sistémicos de mercado. En marzo de 2023, USDC perdió temporalmente su paridad. Tu saldo en el protocolo está denominado en USDC, por lo que cualquier depegging te afecta directamente.',
  },
  {
    icon:     <Globe size={20} />,
    title:    'El marco regulatorio puede cambiar',
    severity: 'medium',
    summary:  'Las reglas para criptoactivos en LATAM y el mundo están en constante evolución.',
    detail:   'Los reguladores de Argentina, México, Brasil y otros países están desarrollando marcos legales para activos digitales. Cambios en la regulación podrían afectar tu capacidad de usar el protocolo, la clasificación fiscal de tus rendimientos, o el funcionamiento del protocolo en tu país. El protocolo puede necesitar modificar o restringir su operación ante nuevos requisitos legales.',
  },
  {
    icon:     <Shield size={20} />,
    title:    'El admin del protocolo tiene poderes limitados sobre tu fondo',
    severity: 'medium',
    summary:  'La Fundación Ethernal puede intervenir en situaciones de emergencia.',
    detail:   'Aunque Ethernal Fund es un protocolo no custodial, la Fundación mantiene un rol de administrador con capacidades específicas: puede aprobar o rechazar solicitudes de retiro anticipado, anunciar emergencias con un período de espera de 48 horas, y gestionar qué protocolos DeFi están disponibles. Estas funciones existen por razones de seguridad y cumplimiento regulatorio. Sin embargo, los fondos siempre se devuelven al propietario — el admin no puede transferirlos a terceros.',
  },
];

// Component 

const RiskPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">

      {/* ── Top bar ── */}
      <div className="bg-gray-800 text-white py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 transition text-sm"
          >
            <ArrowLeft size={16} />
            {t('common.back')}
          </Link>
          <span className="text-xs text-gray-400">
            v1.0 · Abril 2026
          </span>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="bg-linear-to-br from-gray-800 to-red-900 text-white py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-1">
              <AlertTriangle size={11} />
              Lectura obligatoria
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Aviso de Riesgos
          </h1>
          <p className="text-gray-300 text-sm max-w-xl">
            Antes de usar Ethernal Fund, leé y entendé estos riesgos. Están escritos
            en lenguaje simple para que puedas tomar una decisión informada.
          </p>
        </div>
      </div>

      {/* ── Critical warning banner ── */}
      <div className="bg-red-600 text-white py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-start gap-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p className="text-sm font-medium leading-relaxed">
            Este protocolo no está regulado ni supervisado por ningún organismo financiero.
            No existe garantía de recuperación de fondos. No es un banco, no es un fondo
            de inversión regulado y no está cubierto por ningún seguro de depósito.
            <strong className="block mt-1">
              Solo usá fondos cuya pérdida total puedas asumir.
            </strong>
          </p>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">

        {/* ── Severity legend ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Escala de severidad
          </p>
          <div className="flex flex-wrap gap-3">
            {(['critical', 'high', 'medium'] as const).map(s => (
              <span key={s} className={`text-xs px-3 py-1 rounded-full font-medium ${SEVERITY_CONFIG[s].badge}`}>
                {SEVERITY_CONFIG[s].label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Risk cards ── */}
        {RISKS.map((risk, i) => {
          const cfg = SEVERITY_CONFIG[risk.severity];
          return (
            <div
              key={i}
              className={`bg-white rounded-xl border border-gray-100 shadow-sm border-l-4 ${cfg.border} overflow-hidden`}
            >
              {/* Card header */}
              <div className="px-6 pt-5 pb-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${cfg.badge}`}>
                      {risk.icon}
                    </div>
                    <h2 className="text-base font-bold text-gray-900 leading-snug">
                      {risk.title}
                    </h2>
                  </div>
                  <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Summary — always visible */}
                <p className="text-sm font-medium text-gray-700 leading-relaxed">
                  {risk.summary}
                </p>
              </div>

              {/* Detail — collapsible */}
              <details className="group">
                <summary className="px-6 pb-4 text-xs text-green-700 hover:text-yellow-600 cursor-pointer transition list-none flex items-center gap-1 select-none">
                  <span className="group-open:hidden">+ Ver más detalles</span>
                  <span className="hidden group-open:inline">− Ocultar detalles</span>
                </summary>
                <div className="px-6 pb-5 border-t border-gray-50 pt-4">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {risk.detail}
                  </p>
                </div>
              </details>
            </div>
          );
        })}

        {/* ── What IS guaranteed ── */}
        <div className="bg-green-50 rounded-xl border border-green-100 shadow-sm px-6 py-6">
          <h2 className="text-base font-bold text-green-900 mb-4 flex items-center gap-2">
            <Shield size={18} className="text-green-600" />
            Lo que sí está garantizado por el diseño del protocolo
          </h2>
          <ul className="space-y-3">
            {[
              'Los fondos siempre se devuelven al propietario del fondo — nunca a terceros.',
              'El admin no puede transferir tus fondos a otra wallet que no sea la tuya.',
              'Cualquier retiro de emergencia tiene un período de espera de 48 horas, durante el cual podés cancelarlo.',
              'El fee máximo está fijado en el contrato y no puede superar el 10%, sin importar lo que decida la Fundación.',
              'El código es público y verificable en blockchain por cualquier persona.',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-green-800">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Before you continue ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Antes de continuar, preguntate:
          </h2>
          <ul className="space-y-3">
            {[
              '¿Entendés que podés perder el 100% de los fondos depositados?',
              '¿Estás depositando dinero que no vas a necesitar por 15 años o más?',
              '¿Entendés que las transacciones en blockchain son irreversibles?',
              '¿Sabés qué es un smart contract y cuáles son sus riesgos?',
              '¿Consultaste con un asesor financiero o legal si tenés dudas?',
            ].map((q, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center text-xs text-gray-400 font-mono">
                  {i + 1}
                </span>
                {q}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
            Si respondiste "no" a alguna de estas preguntas, te recomendamos tomarte más tiempo
            antes de depositar fondos. Podés leer el{' '}
            <Link to="/whitepaper" className="text-green-700 hover:text-yellow-600 underline underline-offset-2 transition">
              Whitepaper técnico
            </Link>{' '}
            o contactarnos en{' '}
            <a href="mailto:contact@ethernal.fund" className="text-green-700 hover:text-yellow-600 underline underline-offset-2 transition">
              contact@ethernal.fund
            </a>.
          </p>
        </div>

        {/* ── Footer links ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-gray-400">
            Aviso de Riesgos v1.0 · Ethernal Fund · Abril 2026
          </p>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/terms" className="text-gray-500 hover:text-yellow-600 transition">
              Términos y Condiciones
            </Link>
            <Link to="/privacy" className="text-gray-500 hover:text-yellow-600 transition">
              Privacidad
            </Link>
            <Link to="/disclaimer" className="text-gray-500 hover:text-yellow-600 transition">
              Disclaimer
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RiskPage;