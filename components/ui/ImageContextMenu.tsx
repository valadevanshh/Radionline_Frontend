'use client';

/**
 * t83: right-click menu for images (Download / Open in new tab).
 * const { onImageContextMenu, imageMenu } = useImageContextMenu();
 * <div onContextMenu={onImageContextMenu(url, name)}>...</div> {imageMenu}
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ExternalLink } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

type MenuState = { x: number; y: number; url: string; name: string } | null;

function fileNameFor(url: string, name: string): string {
  const fromUrl = (() => {
    if (url.startsWith('data:')) return '';
    try {
      return decodeURIComponent(new URL(url, window.location.href).pathname.split('/').pop() || '');
    } catch {
      return '';
    }
  })();
  if (fromUrl && /\.[a-z0-9]{2,5}$/i.test(fromUrl)) return fromUrl;
  const mime = url.startsWith('data:') ? url.slice(5, url.indexOf(';')) : '';
  const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const base = (name || fromUrl || 'image').replace(/[^\w.-]+/g, '_').slice(0, 80);
  return /\.[a-z0-9]{2,5}$/i.test(base) ? base : `${base}.${ext}`;
}

export async function downloadImage(url: string, name = 'image') {
  const filename = fileNameFor(url, name);
  try {
    let href = url;
    let revoke = false;
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(String(res.status));
      href = URL.createObjectURL(await res.blob());
      revoke = true;
    }
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (revoke) setTimeout(() => URL.revokeObjectURL(href), 2000);
    toast.success('Image downloaded');
  } catch {
    // Cross-origin file the browser will not hand over: open it so it can be saved from there
    window.open(url, '_blank', 'noopener');
    toast.info('Opened the image in a new tab - save it from there');
  }
}

export function useImageContextMenu() {
  const [menu, setMenu] = useState<MenuState>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    // capture phase: modals that stop mousedown propagation still close the menu
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const onImageContextMenu = useCallback(
    (url: string | null | undefined, name = 'image') =>
      (e: React.MouseEvent) => {
        if (!url) return;
        e.preventDefault();
        e.stopPropagation();
        const x = Math.min(e.clientX, window.innerWidth - 190);
        const y = Math.min(e.clientY, window.innerHeight - 90);
        setMenu({ x, y, url, name });
      },
    []
  );

  const item =
    'w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 text-left';
  const imageMenu =
    menu && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="menu"
            data-testid="image-context-menu"
            ref={menuRef}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            style={{ position: 'fixed', left: menu.x, top: menu.y, zIndex: 10000 }}
            className="w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={() => {
                const m = menu;
                setMenu(null);
                downloadImage(m.url, m.name);
              }}
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={() => {
                window.open(menu.url, '_blank', 'noopener');
                setMenu(null);
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
            </button>
          </div>,
          document.body
        )
      : null;

  return { onImageContextMenu, imageMenu };
}
