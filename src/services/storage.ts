import { createSeedData } from '../data/seedData';
import { CRMState } from '../types/crm';
import { validateCRMBackup } from '../utils/validators';

const STORAGE_KEY = 'fibresales_crm_v1';

export interface LoadResult {
  state: CRMState;
  recoveredFromError: boolean;
}

export function loadCRMState(): LoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedData();
      saveCRMState(seed);
      return { state: seed, recoveredFromError: false };
    }

    const parsed: unknown = JSON.parse(raw);
    const validation = validateCRMBackup(parsed);
    if (!validation.valid || !validation.data) {
      const seed = createSeedData();
      saveCRMState(seed);
      return { state: seed, recoveredFromError: true };
    }

    return { state: validation.data, recoveredFromError: false };
  } catch {
    const seed = createSeedData();
    saveCRMState(seed);
    return { state: seed, recoveredFromError: true };
  }
}

export function saveCRMState(state: CRMState): boolean {
  try {
    const payload: CRMState = {
      ...state,
      lastUpdatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function resetCRMState(): CRMState {
  const seed = createSeedData();
  saveCRMState(seed);
  return seed;
}
