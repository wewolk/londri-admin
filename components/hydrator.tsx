'use client';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';

// Hydrate auth + theme from localStorage on mount
export default function Hydrator() {
  const hydrateAuth = useAuth((s) => s.hydrate);
  const hydrateTheme = useTheme((s) => s.hydrate);
  useEffect(() => { hydrateAuth(); hydrateTheme(); }, [hydrateAuth, hydrateTheme]);
  return null;
}
