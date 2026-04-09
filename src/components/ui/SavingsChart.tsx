import { useRef, useEffect } from 'react';

// ── Types 
export interface DepositPoint {
  timestamp:    number;   // Unix ms
  totalBalance: number;   // USDC (already divided by 1e6)
  netAmount:    number;   // USDC net deposited
  type:         'monthly' | 'extra';
}

export interface FundSnapshot {
  balance?:         bigint;
  monthlyDeposit?:  bigint;
  retirementAge?:   bigint;
  projectedCorpus?: bigint;
  yearsRemaining?:  bigint;
  depositCount?:    bigint;
  timelockEnd?:     bigint;
}

export interface SavingsChartProps {
  fund:          FundSnapshot | null;
  depositPoints: DepositPoint[];
  height?:       number;
  className?:    string;
}

// Component 
export function SavingsChart({ fund, depositPoints, height = 200, className }: SavingsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx)  return;

    canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    ctx.clearRect(0, 0, w, h);

    // Scalar params 
    const monthly  = fund?.monthlyDeposit  ? Number(fund.monthlyDeposit)  / 1e6 : 200;
    const corpus   = fund?.projectedCorpus ? Number(fund.projectedCorpus) / 1e6 : 0;
    const retAge   = fund?.retirementAge   ? Number(fund.retirementAge)        : 65;
    const yearsRem = fund?.yearsRemaining  ? Number(fund.yearsRemaining)       : 35;
    const curAge   = retAge - yearsRem;

    // Build data series 
    const hasHistory = depositPoints.length > 0;

    const historyPts: { ms: number; bal: number; type?: 'monthly' | 'extra' }[] =
      hasHistory
        ? depositPoints.map(p => ({ ms: p.timestamp, bal: p.totalBalance, type: p.type }))
        : [];

    const lastReal    = historyPts[historyPts.length - 1];
    const startBal    = lastReal?.bal ?? 0;
    const startMs     = lastReal?.ms  ?? Date.now();
    const retMs       = new Date().setFullYear(new Date().getFullYear() + yearsRem);
    const totalFutMs  = Math.max(retMs - startMs, 1);
    const PROJ_STEPS  = 120;
    const monthlyRate = 0.05 / 12;
    const projPts: { ms: number; bal: number }[] = [];
    let   cur = startBal;
    for (let i = 0; i <= PROJ_STEPS; i++) {
      projPts.push({ ms: startMs + (totalFutMs * i) / PROJ_STEPS, bal: cur });
      cur = cur * (1 + monthlyRate) + monthly * 0.95;
    }

    // Axis bounds
    const minMs       = hasHistory ? (historyPts[0]?.ms ?? Date.now() - 1) : Date.now() - 1;
    const maxMs       = projPts[projPts.length - 1]?.ms ?? Date.now();
    const spanMs      = maxMs - minMs || 1;
    const lastProjBal = projPts[projPts.length - 1]?.bal ?? 0;
    const maxY        = corpus > 0
      ? Math.max(corpus * 1.12, lastProjBal * 1.05)
      : lastProjBal * 1.1 || 1000;

    // Canvas helpers
    const pad    = { top: 20, right: 16, bottom: 32, left: 56 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top  - pad.bottom;

    const toX = (ms:  number) => pad.left + ((ms  - minMs) / spanMs) * chartW;
    const toY = (val: number) => pad.top  + chartH - (val / maxY)    * chartH;

    // Grid 
    for (let i = 0; i <= 4; i++) {
      const y   = pad.top + (i / 4) * chartH;
      const val = maxY * (1 - i / 4);
      ctx.lineWidth   = 1;
      ctx.strokeStyle = 'rgba(99,102,241,0.09)';
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
      ctx.fillStyle = 'rgba(107,114,128,0.7)';
      ctx.font      = '10px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(
        val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val.toFixed(0)}`,
        pad.left - 6, y + 3,
      );
    }

    // X-axis age labels (5 ticks)
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const ms  = minMs + (spanMs * i) / 4;
      const age = Math.round(curAge + ((ms - (Date.now() - (retAge - curAge) * 365.25 * 24 * 3600 * 1000)) / (365.25 * 24 * 3600 * 1000)));
      ctx.fillStyle = 'rgba(107,114,128,0.7)';
      ctx.fillText(`${age}`, toX(ms), h - pad.bottom + 14);
    }

    // Projection fill 
    const projGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    projGrad.addColorStop(0,   'rgba(99,102,241,0.13)');
    projGrad.addColorStop(0.7, 'rgba(99,102,241,0.03)');
    projGrad.addColorStop(1,   'rgba(99,102,241,0)');

    ctx.beginPath();
    const firstProj = projPts[0];
    if (firstProj) ctx.moveTo(toX(firstProj.ms), toY(0));
    projPts.forEach(p => ctx.lineTo(toX(p.ms), toY(p.bal)));
    const lastProj = projPts[projPts.length - 1];
    if (lastProj) ctx.lineTo(toX(lastProj.ms), toY(0));
    ctx.closePath();
    ctx.fillStyle = projGrad;
    ctx.fill();

    // Projection line (dashed) 
    ctx.lineWidth   = 1.5;
    ctx.strokeStyle = 'rgba(99,102,241,0.5)';
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    projPts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(toX(p.ms), toY(p.bal));
      else         ctx.lineTo(toX(p.ms), toY(p.bal));
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Real history line + fill
    if (hasHistory) {
      const histGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
      histGrad.addColorStop(0,   'rgba(99,102,241,0.30)');
      histGrad.addColorStop(0.7, 'rgba(99,102,241,0.07)');
      histGrad.addColorStop(1,   'rgba(99,102,241,0)');

      ctx.beginPath();
      const firstHist = historyPts[0];
      if (firstHist) ctx.moveTo(toX(firstHist.ms), toY(0));
      historyPts.forEach(p => ctx.lineTo(toX(p.ms), toY(p.bal)));
      const lastHist = historyPts[historyPts.length - 1];
      if (lastHist) ctx.lineTo(toX(lastHist.ms), toY(0));
      ctx.closePath();
      ctx.fillStyle = histGrad;
      ctx.fill();

      ctx.lineWidth   = 2.5;
      ctx.strokeStyle = '#6366f1';
      ctx.shadowColor = 'rgba(99,102,241,0.35)';
      ctx.shadowBlur  = 7;
      ctx.beginPath();
      historyPts.forEach((p, i) => {
        if (i === 0) ctx.moveTo(toX(p.ms), toY(p.bal));
        else         ctx.lineTo(toX(p.ms), toY(p.bal));
      });
      ctx.stroke();
      ctx.shadowBlur = 0;

      historyPts.forEach(p => {
        const x   = toX(p.ms);
        const y   = toY(p.bal);
        const col = p.type === 'extra' ? '#7c3aed' : '#6366f1';

        const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
        g.addColorStop(0, col.replace(')', ',0.5)').replace('rgb', 'rgba'));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
      });

      // "Now" vertical marker
      const nowX = toX(Date.now());
      if (nowX >= pad.left && nowX <= pad.left + chartW) {
        ctx.lineWidth   = 1;
        ctx.strokeStyle = 'rgba(139,92,246,0.4)';
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(nowX, pad.top); ctx.lineTo(nowX, pad.top + chartH); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(139,92,246,0.7)';
        ctx.font      = '9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Hoy', nowX, pad.top + 10);
      }
    }

    // Goal line 
    if (corpus > 0 && corpus <= maxY) {
      const goalY = toY(corpus);
      ctx.lineWidth   = 1.5;
      ctx.strokeStyle = 'rgba(16,185,129,0.8)';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.left, goalY);
      ctx.lineTo(pad.left + chartW, goalY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgb(16,185,129)';
      ctx.textAlign = 'left';
      ctx.font      = '10px system-ui, sans-serif';
      ctx.fillText(`Meta $${(corpus / 1000).toFixed(0)}k`, pad.left + 4, goalY - 5);
    }

    // ── Bottom progress bar ───────────────────────────────────────────────────
    const currentBal = hasHistory ? (lastReal?.bal ?? 0) : 0;
    const prog       = corpus > 0 ? Math.min(currentBal / corpus, 1) : 0;
    const barY       = h - 4;
    ctx.fillStyle    = 'rgba(99,102,241,0.1)';
    ctx.beginPath(); ctx.roundRect(pad.left, barY - 3, chartW, 3, 2); ctx.fill();
    if (prog > 0) {
      const barG = ctx.createLinearGradient(pad.left, 0, pad.left + chartW * prog, 0);
      barG.addColorStop(0, '#6366f1');
      barG.addColorStop(1, '#10b981');
      ctx.fillStyle = barG;
      ctx.beginPath(); ctx.roundRect(pad.left, barY - 3, chartW * prog, 3, 2); ctx.fill();
    }

  }, [fund, depositPoints]);

  return (
    <div
      className={className}
      style={{ height }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}