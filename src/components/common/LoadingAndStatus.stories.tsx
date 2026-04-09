import type { Meta } from '@storybook/react-vite';

const meta: Meta = {
  title:      'Common/LoadingAndStatus',
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const LoadingScreen = () => (
  <div className="min-h-screen bg-linear-to-br from-green-900 via-blue-900 to-indigo-900 flex items-center justify-center">
    <div className="text-center text-white">
      <div className="w-20 h-20 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-6" />
      <h2 className="text-2xl font-bold mb-2">Ethernal</h2>
      <p className="text-white/70">Loading...</p>
    </div>
  </div>
);

export const BackendHealthy = () => (
  <div className="p-8 bg-white flex justify-center">
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-sm text-green-700 font-medium">
      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      Backend Online
    </div>
  </div>
);

export const BackendWarmingUp = () => (
  <div className="p-8 bg-white flex justify-center">
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-full text-sm text-yellow-700 font-medium">
      <span className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
      Backend Waking Up...
    </div>
  </div>
);

export const BackendUnavailable = () => (
  <div className="p-8 bg-white flex justify-center">
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-sm text-red-600 font-medium">
      <span className="w-2 h-2 bg-red-500 rounded-full" />
      Backend Offline
    </div>
  </div>
);

export const BackendUnknown = () => (
  <div className="p-8 bg-white flex justify-center">
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-500 font-medium">
      <span className="w-2 h-2 bg-gray-400 rounded-full" />
      Checking...
    </div>
  </div>
);

export const AllBackendStates = () => (
  <div className="p-8 bg-gray-50 space-y-4">
    <h2 className="text-lg font-bold text-gray-700 mb-6">Backend Status — All States</h2>
    {[
      { color: 'green',  ping: 'animate-pulse', label: 'Online',       bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700'  },
      { color: 'yellow', ping: 'animate-ping',  label: 'Warming Up',   bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
      { color: 'red',    ping: '',              label: 'Offline',      bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-600'    },
      { color: 'gray',   ping: '',              label: 'Checking...',  bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-500'   },
    ].map(({ color, ping, label, bg, border, text }) => (
      <div key={label} className="flex items-center gap-3">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${bg} border ${border} rounded-full text-sm ${text} font-medium`}>
          <span className={`w-2 h-2 bg-${color}-500 rounded-full ${ping}`} />
          Backend {label}
        </div>
      </div>
    ))}
  </div>
);