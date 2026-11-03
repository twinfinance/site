import { describe, expect, it } from 'vitest';

import {
  flowCopy,
  flowDescription,
} from '@/features/solution/credit-cycle-flow/copy';
import { DEFAULT_ORIGINATION_STATUSES } from '@/features/solution/credit-cycle-flow/stages';

const copy = flowCopy({
  amount: 25_000,
  installments: 12,
  locale: 'pt-BR',
  originationStatuses: DEFAULT_ORIGINATION_STATUSES,
});

describe('flowCopy', () => {
  it('writes the operation as its amount in reais and its installments', () => {
    expect(copy.amount).toBe('R$\u00a025.000 · 12x');
  });

  it('writes the installments paid, late and settled', () => {
    expect(copy.paid(3, 12)).toBe('Parcela 3/12 paga');
    expect(copy.late(4)).toBe('Parcela 4 em atraso');
    expect(copy.settled(12)).toBe('12/12 quitada');
  });
});

describe('flowDescription', () => {
  it('tells the whole story for a screen reader', () => {
    const description = flowDescription(copy, 4);

    expect(description).toContain('R$\u00a025.000 · 12x');
    expect(description).toContain('Cedida ao FIDC');
    expect(description).toContain('a parcela 4 atrasa');
    expect(description).toContain('o acordo é fechado');
  });
});
