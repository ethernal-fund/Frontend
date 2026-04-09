import type { Meta } from '@storybook/react-vite';

const meta: Meta = {
  title:      'Wallet/ConnectWallet',
  parameters: { layout: 'centered' },
};
export default meta;
export const Disconnected = () => (
  <div className="p-8 bg-white flex justify-center">
    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium">
      Connect Wallet
    </button>
  </div>
);

export const Connected = () => (
  <div className="p-8 bg-white flex justify-center">
    <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
      <span className="font-mono text-sm">0x1234...5678</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
    </button>
  </div>
);

export const ConnectedDropdownOpen = () => (
  <div className="p-8 bg-white flex justify-center" style={{ minHeight: 300 }}>
    <div className="relative">
      <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg flex items-center gap-2">
        <span className="font-mono text-sm">0x1234...5678</span>
      </button>
      <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
        {[
          { icon: '👛', label: 'View Account'    },
          { icon: '📋', label: 'Copy Address'     },
          { icon: '🔗', label: 'View on Explorer' },
        ].map(({ icon, label }) => (
          <button key={label} className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm">
            <span>{icon}</span><span>{label}</span>
          </button>
        ))}
        <button className="w-full px-4 py-3 text-left hover:bg-red-50 flex items-center gap-3 text-sm text-red-600 border-t border-gray-200">
          <span>🚪</span><span>Disconnect</span>
        </button>
      </div>
    </div>
  </div>
);

export const CopiedState = () => (
  <div className="p-8 bg-white flex justify-center" style={{ minHeight: 200 }}>
    <div className="relative">
      <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg flex items-center gap-2">
        <span className="font-mono text-sm">0x1234...5678</span>
      </button>
      <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
        <button className="w-full px-4 py-3 text-left bg-green-50 flex items-center gap-3 text-sm text-green-700">
          <span>✓</span><span>Copied!</span>
        </button>
      </div>
    </div>
  </div>
);

export const SimpleButton = () => (
  <div className="p-8 bg-white flex justify-center">
    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
      Connect Wallet
    </button>
  </div>
);