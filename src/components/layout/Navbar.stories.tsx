import type { Meta } from '@storybook/react-vite';

const meta: Meta = {
  title:      'Layout/Navbar',
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const Disconnected = () => (
  <header className="bg-white shadow-sm border-b border-gray-200">
    <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        <span className="text-xl font-bold text-gray-900">Ethernal</span>
      </div>
      <nav className="hidden md:flex items-center gap-8">
        {['Home', 'Calculator', 'Contact'].map(l => (
          <span key={l} className="text-gray-700 hover:text-green-600 cursor-pointer">{l}</span>
        ))}
      </nav>
      <button className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-green-600 to-blue-800 text-white rounded-lg text-sm font-medium">
        🔗 Connect Wallet
      </button>
    </div>
  </header>
);

export const ConnectedCorrectNetwork = () => (
  <header className="bg-white shadow-sm border-b border-gray-200">
    <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        <span className="text-xl font-bold text-gray-900">Ethernal</span>
      </div>
      <nav className="hidden md:flex items-center gap-8">
        {['Home', 'Calculator', 'Contact', 'Dashboard'].map(l => (
          <span key={l} className={`cursor-pointer ${l === 'Home' ? 'text-green-600 font-bold' : 'text-gray-700 hover:text-green-600'}`}>{l}</span>
        ))}
      </nav>
      <button className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-green-600 to-blue-800 text-white rounded-lg text-sm font-medium">
        🔗 0x1234...5678 ▾
      </button>
    </div>
  </header>
);

export const ConnectedWrongNetwork = () => (
  <div>
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-lg" />
          <span className="text-xl font-bold text-gray-900">Ethernal</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {['Home', 'Calculator', 'Contact'].map(l => (
            <span key={l} className="text-gray-700 cursor-pointer">{l}</span>
          ))}
        </nav>
        <button className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-green-600 to-blue-800 text-white rounded-lg text-sm font-medium">
          🔗 0x1234...5678 ▾
        </button>
      </div>
    </header>
    {/* Dropdown con warning de red */}
    <div className="max-w-7xl mx-auto px-4 pt-2 flex justify-end">
      <div className="w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 bg-linear-to-r from-green-600/10 to-blue-800/10 border-b border-gray-200">
          <p className="font-semibold text-gray-900 text-sm">Connected Wallet</p>
          <p className="text-xs text-gray-600 font-mono mt-1">0x1234567890abcdef1234567890abcdef12345678</p>
        </div>
        <div className="p-4 space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
            <span className="text-yellow-600 text-sm">⚠️</span>
            <p className="text-xs text-yellow-800">
              <strong>Wrong Network.</strong> Please switch to Arbitrum Sepolia to continue.
            </p>
          </div>
          <button className="w-full px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-300 text-sm font-medium">
            Switch to Arbitrum Sepolia
          </button>
        </div>
      </div>
    </div>
  </div>
);

export const MobileMenuOpen = () => (
  <div style={{ width: 390 }}>
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-lg" />
          <span className="text-xl font-bold text-gray-900">Ethernal</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 bg-linear-to-r from-green-600 to-blue-800 text-white rounded-lg">🔗</button>
          <button className="p-2 text-gray-700">✕</button>
        </div>
      </div>
    </header>
    <div className="bg-white border-t border-gray-200">
      <nav className="flex flex-col p-6 space-y-4">
        {['Home', 'Calculator', 'Contact'].map((l, i) => (
          <span key={l} className={`text-lg py-3 px-4 rounded-lg ${i === 0 ? 'bg-green-600 text-white font-bold' : 'text-gray-700 hover:bg-gray-100'}`}>
            {l}
          </span>
        ))}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Language</p>
          <div className="flex gap-2">
            {['EN', 'ES', 'PT', 'IT', 'DE'].map(lang => (
              <button key={lang} className={`px-3 py-1 rounded text-xs font-medium border ${lang === 'EN' ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600'}`}>
                {lang}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  </div>
);