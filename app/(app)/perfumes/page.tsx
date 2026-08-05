'use client';

import { Drop } from '@phosphor-icons/react';
import CardActions from '@/components/card-actions';
import CrudPage from '@/components/crud-page';
import type { Perfume } from '@/lib/types';

export default function PerfumesPage() {
  return (
    <CrudPage<Perfume>
      title="Parfum"
      endpoint="/perfume"
      queryKey="perfumes"
      searchPlaceholder="Cari parfum…"
      initialForm={{ name: '', isActive: true }}
      fields={[
        {
          name: 'name',
          label: 'Nama Parfum',
          placeholder: 'Contoh: Jambu',
          required: true,
        },
        { name: 'isActive', label: 'Aktif', type: 'switch' },
      ]}
      validate={(form): Record<string, string> => {
        const errors: Record<string, string> = {};
        const name = String(form.name || '').trim();
        if (!name) errors.name = 'Nama parfum wajib diisi';
        else if (name.length > 150) errors.name = 'Nama parfum maksimal 150 karakter';
        return errors;
      }}
      toPayload={(form) => ({
        name: String(form.name).trim(),
        isActive: Boolean(form.isActive),
      })}
      fromItem={(perfume) => ({
        name: perfume.name,
        isActive: perfume.isActive,
      })}
      renderCard={(perfume, { edit, remove }) => (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border border-border-subtle p-md shadow-card dark:border-outline-variant/20 glass ${
            perfume.isActive ? '' : 'opacity-60'
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-container text-on-primary-container">
              <Drop size={21} weight="duotone" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-on-surface dark:text-inverse-on-surface">
                {perfume.name}
              </p>
              <span className={perfume.isActive ? 'chip chip-success' : 'chip chip-neutral'}>
                {perfume.isActive ? 'AKTIF' : 'NONAKTIF'}
              </span>
            </div>
          </div>
          <CardActions onEdit={edit} onDelete={remove} />
        </div>
      )}
    />
  );
}