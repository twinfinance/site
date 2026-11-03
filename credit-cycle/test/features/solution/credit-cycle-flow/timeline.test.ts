import { describe, expect, it } from 'vitest';

import { flowCopy } from '@/features/solution/credit-cycle-flow/copy';
import { DEFAULT_ORIGINATION_STATUSES } from '@/features/solution/credit-cycle-flow/stages';
import {
  createTimeline,
  type Frame,
} from '@/features/solution/credit-cycle-flow/timeline';

const copy = flowCopy({
  amount: 25_000,
  installments: 12,
  locale: 'pt-BR',
  originationStatuses: DEFAULT_ORIGINATION_STATUSES,
});
const timeline = createTimeline({ copy, installments: 12, lateInstallment: 4 });

const DWELL = 1300;
const MOVE = 700;
const ORIGINATION = 6 * (DWELL + MOVE);
const FIRST_PAYMENTS = 3 * 700;
const LATE = ORIGINATION + FIRST_PAYMENTS;
const DOWN = LATE + 900;
const RECOVER = DOWN + 700;
const UP = RECOVER + 2000;
const SECOND_PAYMENTS = UP + 700;
const FINALE = SECOND_PAYMENTS + 9 * 250;

const stateOf = (frame: Frame) => {
  return Object.fromEntries(
    Object.entries(frame.stages).map(([id, stage]) => [id, stage.state])
  );
};

describe('createTimeline', () => {
  it('starts with the offer being sent and every other stage waiting', () => {
    const frame = timeline.frameAt(0);

    expect(frame.stages.communication).toEqual({
      state: 'active',
      status: 'Disparando oferta',
    });
    expect(frame.stages.kyc).toEqual({ state: 'idle', status: 'Aguardando' });
    expect(frame.chip).toMatchObject({
      text: 'R$\u00a025.000 · 12x',
      tone: 'accent',
    });
  });

  it('switches a stage to its finished status while the operation dwells on it', () => {
    const underwriting = 2 * (DWELL + MOVE);

    expect(
      timeline.frameAt(underwriting + 100).stages.underwriting.status
    ).toBe('Calculando risco');
    expect(
      timeline.frameAt(underwriting + 1000).stages.underwriting.status
    ).toBe('Score 742');
  });

  it('marks the stages behind the operation as done', () => {
    const frame = timeline.frameAt(4 * (DWELL + MOVE) + 10);

    expect(stateOf(frame)).toMatchObject({
      communication: 'done',
      kyc: 'done',
      formalization: 'active',
      assignment: 'idle',
    });
    expect(frame.stages.kyc.status).toBe('Biometria ok');
    expect(frame.phases.origination.done).toBe(4);
  });

  it('moves the chip along the lane between two stages', () => {
    const frame = timeline.frameAt(DWELL + MOVE / 2);

    expect(frame.chip.position).toEqual({
      on: 'lane',
      from: 0,
      to: 1,
      progress: 0.5,
    });
    expect(frame.wires.lane.lit).toBeCloseTo(0.5 / 6);
  });

  it('counts the installments paid before the late one', () => {
    expect(timeline.frameAt(ORIGINATION + 10).stages.collection.status).toBe(
      'Parcela 1/12 paga'
    );
    const third = timeline.frameAt(LATE - 10);
    expect(third.stages.collection.status).toBe('Parcela 3/12 paga');
    expect(third.chip).toMatchObject({ text: '3/12 pagas', tone: 'success' });
    expect(third.phases.maintenance.paid).toBe(3);
  });

  it('sends the late installment to recovery and brings it back with an agreement', () => {
    const late = timeline.frameAt(LATE + 10);
    expect(late.stages.collection).toEqual({
      state: 'warning',
      status: 'Parcela 4 em atraso',
    });
    expect(late.chip).toMatchObject({
      text: '4/12 em atraso',
      tone: 'warning',
    });

    const renegotiating = timeline.frameAt(RECOVER + 100);
    expect(renegotiating.stages.recovery).toEqual({
      state: 'warning',
      status: 'Renegociando',
    });
    expect(renegotiating.chip.position).toMatchObject({
      on: 'recovery',
      leg: 'across',
    });

    const agreed = timeline.frameAt(RECOVER + 1500);
    expect(agreed.stages.recovery).toEqual({
      state: 'active',
      status: 'Acordo fechado',
    });
    expect(agreed.phases.recovery.status).toBe('agreed');

    const back = timeline.frameAt(UP + 350);
    expect(back.chip.position).toMatchObject({ on: 'recovery', leg: 'up' });
    expect(back.wires.recoveryDown.lit).toBe(1);
    expect(back.wires.recoveryUp.lit).toBeCloseTo(0.5);
  });

  it('pays the rest of the installments after the agreement', () => {
    const frame = timeline.frameAt(FINALE - 10);

    expect(frame.stages.collection.status).toBe('Parcela 12/12 paga');
    expect(frame.stages.recovery.state).toBe('done');
  });

  it('settles every stage at the end of the cycle', () => {
    const frame = timeline.frameAt(FINALE + 100);

    expect(new Set(Object.values(stateOf(frame)))).toEqual(
      new Set(['settled'])
    );
    expect(frame.stages.collection.status).toBe('12/12 quitada');
    expect(frame.wires.lane.tone).toBe('success');
    expect(frame.chip.text).toBe('Quitada');
  });

  it('repeats seamlessly', () => {
    expect(timeline.frameAt(5000 + timeline.duration)).toEqual(
      timeline.frameAt(5000)
    );
    expect(timeline.frameAt(timeline.duration)).toEqual(timeline.frameAt(0));
  });

  it('fades back to waiting before the next cycle', () => {
    const frame = timeline.frameAt(timeline.duration - 50);

    expect(frame.stages.communication.state).toBe('idle');
    expect(frame.chip.opacity).toBeLessThan(0.1);
  });

  it('holds a still frame with the whole story told', () => {
    const frame = timeline.frameAt(timeline.stillFrameTime);

    expect(frame.stages.recovery.status).toBe('Acordo fechado');
    expect(frame.stages.collection.status).toBe('12/12 quitada');
    expect(frame.chip.opacity).toBe(1);
  });

  it('sends whichever installment is late to recovery', () => {
    const custom = createTimeline({
      copy,
      installments: 6,
      lateInstallment: 2,
    });
    const late = custom.frameAt(ORIGINATION + 700 + 10);

    expect(late.stages.collection.status).toBe('Parcela 2 em atraso');
  });
});
