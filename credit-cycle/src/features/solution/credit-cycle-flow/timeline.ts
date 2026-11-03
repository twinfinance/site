export const ORIGINATION_STAGES = [
  'communication',
  'prequalification',
  'underwriting',
  'kyc',
  'formalization',
  'assignment',
] as const;

export type OriginationStageId = (typeof ORIGINATION_STAGES)[number];
export type StageId = OriginationStageId | 'collection' | 'recovery';

export const MAIN_STAGES: readonly StageId[] = [
  ...ORIGINATION_STAGES,
  'collection',
];
export const STAGES: readonly StageId[] = [...MAIN_STAGES, 'recovery'];

export type StageState = 'idle' | 'active' | 'warning' | 'done' | 'settled';
export type Tone = 'accent' | 'warning' | 'success';

export interface FlowCopy {
  waiting: string;
  amount: string;
  originationStatuses: Record<OriginationStageId, readonly [string, string]>;
  paid: (paid: number, installments: number) => string;
  paidChip: (paid: number, installments: number) => string;
  late: (installment: number) => string;
  lateChip: (installment: number, installments: number) => string;
  renegotiating: string;
  agreement: string;
  settled: (installments: number) => string;
  settledChip: string;
}

export interface TimelineOptions {
  copy: FlowCopy;
  installments: number;
  lateInstallment: number;
}

export type ChipPosition =
  | { on: 'lane'; from: number; to: number; progress: number }
  | {
      on: 'recovery';
      leg: 'down' | 'across' | 'up' | 'back';
      progress: number;
    };

export interface Frame {
  stages: Record<StageId, { state: StageState; status: string }>;
  chip: { position: ChipPosition; text: string; tone: Tone; opacity: number };
  wires: {
    lane: { lit: number; tone: Tone };
    recoveryDown: { lit: number; tone: Tone };
    recoveryUp: { lit: number; tone: Tone };
    opacity: number;
  };
  phases: {
    origination: { progress: number; done: number };
    maintenance: { progress: number; paid: number };
    recovery: { progress: number; status: 'none' | 'renegotiating' | 'agreed' };
  };
}

type Segment =
  | { kind: 'dwell'; stage: number; duration: number }
  | { kind: 'move'; from: number; duration: number }
  | { kind: 'pay'; first: number; last: number; duration: number }
  | {
      kind: 'late' | 'down' | 'recover' | 'up' | 'finale' | 'reset';
      duration: number;
    };

const DWELL_MS = 1300;
const MOVE_MS = 700;
const PAYMENT_MS = 700;
const FAST_PAYMENT_MS = 250;
const LATE_MS = 900;
const RECOVERY_LEG_MS = 700;
const RECOVERY_MS = 2000;
const FINALE_MS = 1600;
const RESET_MS = 600;

const FIRST_STATUS_SHARE = 0.4;
const SETTLE_ON_LANE_SHARE = 0.2;

export interface Timeline {
  duration: number;
  stillFrameTime: number;
  frameAt: (time: number) => Frame;
}

export const createTimeline = (options: TimelineOptions): Timeline => {
  const { copy, installments, lateInstallment } = options;
  const segments = buildSegments(installments, lateInstallment);
  const starts = segments.map((_, index) =>
    segments.slice(0, index).reduce((sum, segment) => sum + segment.duration, 0)
  );
  const segmentAt = (index: number) => segments[index] ?? segments[0]!;
  const startOf = (index: number) => starts[index] ?? 0;
  const duration = starts.at(-1)! + segments.at(-1)!.duration;
  const indexOf = (kind: Segment['kind'], after = -1) =>
    segments.findIndex(
      (segment, index) => segment.kind === kind && index > after
    );
  const firstPay = indexOf('pay');
  const late = indexOf('late');
  const down = indexOf('down');
  const recover = indexOf('recover');
  const up = indexOf('up');
  const secondPay = indexOf('pay', firstPay);
  const finale = indexOf('finale');
  const reset = indexOf('reset');
  const originationEnd = startOf(firstPay);
  const recoverySpan = startOf(up) + segmentAt(up).duration - startOf(down);

  const frameAt = (time: number): Frame => {
    const t = ((time % duration) + duration) % duration;
    const index = Math.max(
      0,
      starts.findLastIndex((start) => start <= t)
    );
    const segment = segmentAt(index);
    const progress = clamp((t - startOf(index)) / segment.duration);
    const eased = easeInOut(progress);
    const agreed = index > recover || (index === recover && progress >= 0.5);

    const stages = Object.fromEntries(
      STAGES.map((id) => [id, { state: 'idle', status: copy.waiting }])
    ) as Frame['stages'];

    ORIGINATION_STAGES.forEach((id, stage) => {
      const dwell = stage * 2;
      const [working, finished] = copy.originationStatuses[id];
      if (index === dwell) {
        stages[id] = {
          state: 'active',
          status: progress < FIRST_STATUS_SHARE ? working : finished,
        };
      } else if (index > dwell) {
        stages[id] = { state: 'done', status: finished };
      }
    });

    const paid = paidAt(index, progress);
    if (index === firstPay || index === secondPay) {
      stages.collection = {
        state: 'active',
        status: copy.paid(paid, installments),
      };
    } else if (index > firstPay && index < secondPay) {
      stages.collection = {
        state: 'warning',
        status: copy.late(lateInstallment),
      };
    } else if (index > secondPay) {
      stages.collection = { state: 'done', status: copy.settled(installments) };
    }

    if (index === down || (index === recover && !agreed)) {
      stages.recovery = { state: 'warning', status: copy.renegotiating };
    } else if (index === recover) {
      stages.recovery = { state: 'active', status: copy.agreement };
    } else if (index > recover) {
      stages.recovery = { state: 'done', status: copy.agreement };
    }

    const settled = index >= finale;
    if (settled) {
      for (const id of STAGES) {
        stages[id].state = 'settled';
      }
    }
    const fading = index === reset;
    const fade = fading ? 1 - eased : 1;
    if (fading && progress > 0.6) {
      for (const id of STAGES) {
        stages[id] = { state: 'idle', status: copy.waiting };
      }
    }

    return {
      stages,
      chip: { ...chipAt(index, eased, paid, agreed), opacity: fade },
      wires: {
        lane: {
          lit: laneLitAt(segment, eased),
          tone: settled ? 'success' : 'accent',
        },
        recoveryDown: {
          lit: index < down ? 0 : index === down ? eased : 1,
          tone: settled ? 'success' : 'warning',
        },
        recoveryUp: {
          lit: index < up ? 0 : index === up ? eased : 1,
          tone: 'success',
        },
        opacity: fade,
      },
      phases: {
        origination: {
          progress: clamp(t / originationEnd) * fade,
          done: ORIGINATION_STAGES.filter(
            (id) => stages[id].state !== 'idle' && stages[id].state !== 'active'
          ).length,
        },
        maintenance: { progress: (paid / installments) * fade, paid },
        recovery: {
          progress:
            (index < down ? 0 : clamp((t - startOf(down)) / recoverySpan)) *
            fade,
          status: index < late ? 'none' : agreed ? 'agreed' : 'renegotiating',
        },
      },
    };
  };

  const paidAt = (index: number, progress: number) => {
    const segment = segmentAt(index);
    if (segment.kind === 'pay') {
      const count = segment.last - segment.first + 1;
      return Math.min(
        segment.last,
        segment.first + Math.floor(progress * count)
      );
    }
    if (index < firstPay) {
      return 0;
    }
    if (index < secondPay) {
      return lateInstallment - 1;
    }
    return installments;
  };

  const chipAt = (
    index: number,
    eased: number,
    paid: number,
    agreed: boolean
  ): Omit<Frame['chip'], 'opacity'> => {
    const segment = segmentAt(index);
    const collection = ORIGINATION_STAGES.length;
    const position: ChipPosition =
      segment.kind === 'dwell'
        ? { on: 'lane', from: segment.stage, to: segment.stage, progress: 0 }
        : segment.kind === 'move'
          ? {
              on: 'lane',
              from: segment.from,
              to: segment.from + 1,
              progress: eased,
            }
          : index === down
            ? { on: 'recovery', leg: 'down', progress: eased }
            : index === recover
              ? { on: 'recovery', leg: 'across', progress: eased }
              : index === up
                ? { on: 'recovery', leg: 'up', progress: eased }
                : index === secondPay
                  ? {
                      on: 'recovery',
                      leg: 'back',
                      progress: clamp(eased / SETTLE_ON_LANE_SHARE),
                    }
                  : {
                      on: 'lane',
                      from: collection,
                      to: collection,
                      progress: 0,
                    };

    if (index < firstPay) {
      return { position, text: copy.amount, tone: 'accent' };
    }
    if (index === firstPay || index === secondPay) {
      return {
        position,
        text: copy.paidChip(paid, installments),
        tone: 'success',
      };
    }
    if (index < recover || (index === recover && !agreed)) {
      return {
        position,
        text: copy.lateChip(lateInstallment, installments),
        tone: 'warning',
      };
    }
    if (index <= up) {
      return { position, text: copy.agreement, tone: 'success' };
    }
    return { position, text: copy.settledChip, tone: 'success' };
  };

  return {
    duration,
    stillFrameTime: startOf(finale) + segmentAt(finale).duration / 2,
    frameAt,
  };
};

const buildSegments = (installments: number, lateInstallment: number) => {
  const origination = ORIGINATION_STAGES.flatMap<Segment>((_, stage) => [
    { kind: 'dwell', stage, duration: DWELL_MS },
    { kind: 'move', from: stage, duration: MOVE_MS },
  ]);
  const paidBeforeLate = lateInstallment - 1;
  const paidAfterLate = installments - lateInstallment + 1;
  return [
    ...origination,
    {
      kind: 'pay',
      first: 1,
      last: paidBeforeLate,
      duration: PAYMENT_MS * paidBeforeLate,
    },
    { kind: 'late', duration: LATE_MS },
    { kind: 'down', duration: RECOVERY_LEG_MS },
    { kind: 'recover', duration: RECOVERY_MS },
    { kind: 'up', duration: RECOVERY_LEG_MS },
    {
      kind: 'pay',
      first: lateInstallment,
      last: installments,
      duration: FAST_PAYMENT_MS * paidAfterLate,
    },
    { kind: 'finale', duration: FINALE_MS },
    { kind: 'reset', duration: RESET_MS },
  ] satisfies Segment[];
};

const laneLitAt = (segment: Segment, eased: number) => {
  const stops = ORIGINATION_STAGES.length;
  if (segment.kind === 'dwell') {
    return segment.stage / stops;
  }
  if (segment.kind === 'move') {
    return (segment.from + eased) / stops;
  }
  return 1;
};

const clamp = (value: number) => {
  return Math.min(1, Math.max(0, value));
};

const easeInOut = (progress: number) => {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
};
