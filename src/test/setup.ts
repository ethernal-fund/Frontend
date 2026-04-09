import '@testing-library/jest-dom';
import { vi } from 'vitest';

(globalThis as Record<string, unknown>)['IS_REACT_ACT_ENVIRONMENT'] = true;

vi.stubEnv('DEV', false);