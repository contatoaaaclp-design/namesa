'use client';
import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
export default function Modal({ title, close, children, wide = false }: { title: string; close: () => void; children: React.ReactNode; wide?: boolean }) {
 const id = useId(); const ref = useRef<HTMLDivElement>(null); const closeRef = useRef(close); closeRef.current = close;
 useEffect(() => {
  const previous = document.activeElement as HTMLElement; const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; ref.current?.focus();
  const key = (e: KeyboardEvent) => {
   if (e.key === 'Escape') closeRef.current();
   if (e.key === 'Tab') { const elements = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,textarea,a[href]'); if (!elements?.length) return; const first = elements[0], last = elements[elements.length - 1]; if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  }; document.addEventListener('keydown', key);
  return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', key); previous?.focus(); };
 }, []);
 return <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) close(); }}><div ref={ref} tabIndex={-1} className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id}><div className="modal-header"><h2 id={id}>{title}</h2><button aria-label="Fechar" onClick={close}><X size={21}/></button></div><div className="modal-content">{children}</div></div></div>;
}
