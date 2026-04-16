import { useEffect, useRef } from 'react';
import { X }                 from 'lucide-react';
import { useWizardStore }    from '@/stores/wizardStore';
import { StepIndicator }     from '@/components/wizard/StepIndicator';
import { Step1Calculator }   from '@/components/wizard/Step1Calculator';
import { Step2SelectProtocol } from '@/components/wizard/Step2SelectProtocol';
import { Step3Deploy }       from '@/components/wizard/Step3Deploy';

interface WizardModalProps {
  open:    boolean;
  onClose: () => void;
}

export function WizardModal({ open, onClose }: WizardModalProps) {
  const { step, reset } = useWizardStore();
  const overlayRef      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function handleClose() {
    onClose();
    setTimeout(() => reset(), 300);
  }

  function handleSuccess() {
    onClose();   // cierra el modal de inmediato
    reset();    
  }

  if (!open) return null;

  return (
    // Overlay
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) handleClose(); }}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
          style={{
            background:   '#f3f4f6',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <span className="font-bold text-base" style={{ color: '#111827' }}>
            Create Retirement Fund
          </span>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg transition-colors hover:opacity-70"
            style={{ color: '#6b7280' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <StepIndicator current={step} />

          {step === 1 && (
            <Step1Calculator onNext={() => {}} />
          )}
          {step === 2 && (
            <Step2SelectProtocol onNext={() => {}} onBack={() => {}} />
          )}
          {step === 3 && (
            <Step3Deploy onBack={() => {}} onSuccess={handleSuccess} />
          )}
        </div>
      </div>
    </div>
  );
}