'use client';

interface Props {
  columnKey: string;
  label: string;
  width: number;
  minimum: number;
  onResize: (key: string, width: number, table?: HTMLTableElement | null) => void;
  onResizeStart: (key: string, x: number, width: number, table?: HTMLTableElement | null, pointerId?: number) => void;
}

export default function ColumnResizeHandle({ columnKey, label, width, minimum, onResize, onResizeStart }: Props) {
  return <div className="col-resizer" role="separator" aria-orientation="vertical"
    aria-label={`Resize ${label} column`} aria-valuemin={minimum} aria-valuemax={1200}
    aria-valuenow={Math.round(width)} tabIndex={0}
    title={`Drag to resize ${label}. Arrow keys also resize the column.`}
    onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0) return;
      event.preventDefault(); event.stopPropagation();
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
      const header = event.currentTarget.closest('th');
      onResizeStart(columnKey, event.clientX, header?.getBoundingClientRect().width || width, event.currentTarget.closest('table'), event.pointerId);
    }}
    onKeyDown={event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home') return;
      event.preventDefault(); event.stopPropagation();
      const actualWidth = event.currentTarget.closest('th')?.getBoundingClientRect().width || width;
      onResize(columnKey, event.key === 'Home' ? minimum : actualWidth + (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 40 : 16), event.currentTarget.closest('table'));
    }} />;
}
