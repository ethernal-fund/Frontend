import { BarChart3, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TokenomicsCardProps {
  onClick: () => void;
}

export function TokenomicsCard({ onClick }: TokenomicsCardProps) {
  const { t } = useTranslation('sale');

  return (
    <div
      onClick={onClick}
      className="rounded-xl p-6 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '0.5px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(137, 113, 72, 0.15)' }}
          >
            <BarChart3 size={20} style={{ color: '#897148' }} />
          </div>
          <div>
            <h3 className="text-lg font-medium" style={{ color: '#f7f8f6' }}>
              {t('tokenomics.title')}
            </h3>
            <p className="text-xs" style={{ color: '#666' }}>
              {t('tokenomics.distributionSubtitle')}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-white/60">{t('tokenomics.supplyTotal')}</div>
          <div className="text-lg font-mono tracking-tight" style={{ color: '#f7f8f6' }}>
            1B
          </div>
        </div>
      </div>

      {/* Mini distribución */}
      <div className="h-2.5 rounded-full overflow-hidden bg-white/5 mb-4 flex">
        <div className="h-full bg-[#D4A017]" style={{ width: '30%' }} />
        <div className="h-full bg-[#F4A261]" style={{ width: '20%' }} />
        <div className="h-full bg-[#2A9D8F]" style={{ width: '20%' }} />
        <div className="h-full bg-[#457B9D]" style={{ width: '15%' }} />
        <div className="h-full bg-[#6D597A]" style={{ width: '10%' }} />
        <div className="h-full bg-[#8D99AE]" style={{ width: '5%' }} />
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {(['publicSale', 'team', 'ecosystem', 'treasury'] as const).map((key) => (
          <div key={key} className="flex justify-between">
            <span style={{ color: '#aaa' }}>{t(`tokenomics.slices.${key}`)}</span>
            <span className="font-medium" style={{ color: '#f7f8f6' }}>
              {key === 'publicSale' ? '30%' : key === 'team' ? '20%' : key === 'ecosystem' ? '20%' : '15%'}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs tracking-widest uppercase border-t border-white/10 pt-4" style={{ color: '#897148' }}>
        {t('tokenomics.viewFull')}
        <ArrowRight size={14} />
      </div>
    </div>
  );
}