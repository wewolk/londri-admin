'use client';
import { PencilSimple, Trash } from '@phosphor-icons/react';

export default function CardActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-0.5">
      <button type="button" onClick={onEdit} aria-label="Ubah"
        className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant active:bg-surface-container-low dark:active:bg-white/5">
        <PencilSimple size={19} />
      </button>
      <button type="button" onClick={onDelete} aria-label="Hapus"
        className="flex h-11 w-11 items-center justify-center rounded-full text-error active:bg-error-container/50 dark:active:bg-white/5">
        <Trash size={19} />
      </button>
    </div>
  );
}
