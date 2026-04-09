import type { Meta } from '@storybook/react-vite';

const meta: Meta = {
  title:      'Auth/AccessStates',
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const WalletRequired = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md w-full">
      <div className="mb-6">
        <svg className="w-20 h-20 mx-auto text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Wallet Required</h2>
      <p className="text-gray-600 mb-8">Connect your wallet to access your retirement dashboard</p>
      <button className="px-8 py-4 bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold text-lg hover:opacity-90 transition shadow-lg w-full">
        Go Home &amp; Connect Wallet
      </button>
    </div>
  </div>
);

export const UnauthorizedAdmin = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md border border-red-100">
      <div className="text-6xl mb-6">🚫</div>
      <h1 className="text-3xl font-bold text-gray-800 mb-3">Acceso Denegado</h1>
      <p className="text-gray-500 mb-2">No tenés permiso para acceder a esta página.</p>
      <p className="text-sm text-red-500 mb-8">Se requieren privilegios de administrador.</p>
      <div className="flex gap-3">
        <button className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition text-sm">
          Ir al Inicio
        </button>
        <button className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition text-sm">
          Ir al Dashboard
        </button>
      </div>
    </div>
  </div>
);

export const WrongNetwork = () => (
  <div className="min-h-screen bg-linear-to-br from-yellow-50 to-orange-50 flex items-center justify-center px-4">
    <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-lg border border-yellow-200">
      <div className="text-6xl mb-6 animate-pulse">⚠️</div>
      <h1 className="text-4xl font-black text-yellow-700 mb-4">Red Incorrecta</h1>
      <p className="text-xl text-gray-700 mb-4">
        Por favor cambiá a <strong>Arbitrum Sepolia</strong> para continuar.
      </p>
      <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-left">
        <p className="text-gray-500 mb-1">Red actual:</p>
        <p className="font-mono font-bold text-gray-800">Ethereum Mainnet (Chain ID: 1)</p>
        <p className="text-gray-500 mt-3 mb-1">Red requerida:</p>
        <p className="font-mono font-bold text-emerald-600">Arbitrum Sepolia (421614)</p>
      </div>
      <button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-4 px-8 rounded-2xl text-lg transition">
        Cambiar de Red
      </button>
    </div>
  </div>
);

export const CheckingPermissions = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-600 text-lg font-medium">Verificando permisos de acceso...</p>
    </div>
  </div>
);

export const NoFundCreated = () => (
  <div className="min-h-screen bg-linear-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">
    <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-lg border border-indigo-100">
      <div className="text-6xl mb-6">📭</div>
      <h1 className="text-4xl font-black text-indigo-700 mb-4">Fondo No Encontrado</h1>
      <p className="text-xl text-gray-700 mb-3">
        Necesitás crear tu Fondo de Retiro antes de acceder al Dashboard.
      </p>
      <p className="text-gray-500 text-sm mb-8">
        El Dashboard te permitirá gestionar tus depósitos, seguir tu progreso y administrar tus inversiones DeFi.
      </p>
      <button className="w-full bg-linear-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-bold py-5 px-10 rounded-3xl text-xl transition">
        Crear Mi Fondo de Retiro
      </button>
    </div>
  </div>
);