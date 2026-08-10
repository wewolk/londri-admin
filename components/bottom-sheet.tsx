'use client';
import { useEffect, useId, useRef, useState } from 'react';

export default function BottomSheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
        setVisible(true);
        sheetRef.current?.focus();
      }));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timer = window.setTimeout(() => {
      setMounted(false);
      openerRef.current?.focus();
    }, 260);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mounted]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !sheetRef.current) return;
      const focusables = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!mounted) return null;
  return (
    <div className="fixed inset-0 z-[90] mx-auto max-w-md">
      <button aria-label="Tutup panel" className={`absolute inset-0 w-full bg-black/40 transition-opacity duration-250 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDuration: '250ms' }} onClick={onClose} />
      <div ref={sheetRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}
        className={`glass-strong absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl outline-none transition-transform duration-250 ease-out safe-bottom ${visible ? 'translate-y-0' : 'translate-y-full'}`} style={{ transitionDuration: '250ms' }}>
        <div className="glass-strong sticky top-0 px-5 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-outline-variant dark:bg-outline" />
          {title && <h2 id={titleId} className="text-base font-semibold">{title}</h2>}
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}
