import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { resetGuidedMemoryStoreForTests } from '../services/guidedStorage';

// Tests use explicit client stubs, never a developer's configured cloud project.
vi.stubEnv('VITE_SUPABASE_URL', '');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

afterEach(() => { resetGuidedMemoryStoreForTests(); if (typeof localStorage !== 'undefined') localStorage.clear(); });
