'use client';
import { useEffect, useState } from 'react';

export default function BottomSheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode;
}) {
  // mounted: tetap render saat animasi tutup; visible: state ter-animasi
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 260);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = mounted ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mounted]);

  if (!mounted) return null;
  return (
    <div className="fixed inset-0 z-[90] mx-auto max-w-md">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-250 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDuration: '250ms' }}
        onClick={onClose}
      />
      <div
        className={`glass-strong absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl transition-transform duration-250 ease-out safe-bottom ${visible ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ transitionDuration: '250ms' }}
      >
        <div className="glass-strong sticky top-0 px-5 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-outline-variant dark:bg-outline" />
          {title && <h2 className="text-base font-semibold">{title}</h2>}
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}
