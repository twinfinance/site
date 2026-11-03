import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

import { flowCopy, flowDescription } from './copy';
import { layoutFor, pointAt, type FlowLayout, type Segment } from './layout';
import { DEFAULT_ORIGINATION_STATUSES, DEFAULT_STAGES } from './stages';
import {
  createTimeline,
  ORIGINATION_STAGES,
  STAGES,
  type Frame,
  type OriginationStageId,
  type StageId,
  type Tone,
} from './timeline';
import { useAnimationClock } from './use-animation-clock';

import type { LucideIcon } from 'lucide-react';

import { useElementWidth } from '@/shared/hooks/use-element-width';
import { usePrefersReducedMotion } from '@/shared/hooks/use-prefers-reduced-motion';

interface StageOverride {
  label?: string;
  icon?: LucideIcon;
  statuses?: readonly [string, string];
}

interface CreditCycleFlowProps {
  stages?: Partial<Record<StageId, StageOverride>>;
  amount?: number;
  installments?: number;
  lateInstallment?: number;
  locale?: string;
  speed?: number;
  paused?: boolean;
  label?: string;
  caption?: ReactNode;
  className?: string;
}

const NO_OVERRIDES: Partial<Record<StageId, StageOverride>> = {};

const TONE_COLOR: Record<Tone, string> = {
  accent: 'var(--accent)',
  warning: 'var(--warning)',
  success: 'var(--success)',
};

export const CreditCycleFlow = ({
  stages: overrides = NO_OVERRIDES,
  amount = 25_000,
  installments = 12,
  lateInstallment = 4,
  locale = 'pt-BR',
  speed = 1,
  paused = false,
  label,
  caption,
  className = '',
}: CreditCycleFlowProps) => {
  const looks = useMemo(
    () =>
      Object.fromEntries(
        STAGES.map((id) => [id, { ...DEFAULT_STAGES[id], ...overrides[id] }])
      ) as Record<StageId, { label: string; icon: LucideIcon }>,
    [overrides]
  );
  const copy = useMemo(() => {
    const originationStatuses = Object.fromEntries(
      ORIGINATION_STAGES.map((id) => [
        id,
        overrides[id]?.statuses ?? DEFAULT_ORIGINATION_STATUSES[id],
      ])
    ) as Record<OriginationStageId, readonly [string, string]>;
    return flowCopy({ amount, installments, locale, originationStatuses });
  }, [overrides, amount, installments, locale]);
  const timeline = useMemo(
    () => createTimeline({ copy, installments, lateInstallment }),
    [copy, installments, lateInstallment]
  );

  const measuredRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(measuredRef);
  const layout = useMemo(() => (width > 0 ? layoutFor(width) : null), [width]);
  const reducedMotion = usePrefersReducedMotion();

  const [view, setView] = useState(() => viewOf(timeline.frameAt(0)));
  const viewKeyRef = useRef('');
  const chipRef = useRef<HTMLDivElement>(null);
  const litRef = useRef<
    Record<'lane' | 'recoveryDown' | 'recoveryUp', SVGPathElement | null>
  >({
    lane: null,
    recoveryDown: null,
    recoveryUp: null,
  });
  const barsRef = useRef<Record<keyof Frame['phases'], HTMLElement | null>>({
    origination: null,
    maintenance: null,
    recovery: null,
  });

  const onTick = useCallback(
    (time: number) => {
      if (!layout) {
        return;
      }
      const frame = timeline.frameAt(time);
      const next = viewOf(frame);
      const key = JSON.stringify(next);
      if (key !== viewKeyRef.current) {
        viewKeyRef.current = key;
        setView(next);
      }
      paint(frame, layout, chipRef.current, litRef.current, barsRef.current);
    },
    [layout, timeline]
  );

  useAnimationClock(measuredRef, {
    speed,
    paused,
    stillTime: reducedMotion ? timeline.stillFrameTime : null,
    onTick,
  });

  const vertical = layout?.orientation === 'vertical';
  const settled = view.phases.settled;

  return (
    <figure className={`m-0 grid gap-6 ${className}`}>
      {vertical && (
        <p className="m-0 font-mono text-xs text-text-secondary tabular-nums">
          Operação <b className="font-medium text-foreground">{copy.amount}</b>
          {view.chip.text !== copy.amount && ` · ${view.chip.text}`}
        </p>
      )}
      <div ref={measuredRef} className="w-full">
        {layout && (
          <div
            role="img"
            aria-label={label ?? flowDescription(copy, lateInstallment)}
            className="relative"
            style={{ height: layout.height }}
          >
            <Wires layout={layout} view={view} lit={litRef} />
            <PhaseLabels layout={layout} />
            {STAGES.map((id) => (
              <StageCard
                key={id}
                layout={layout}
                id={id}
                look={looks[id]}
                state={view.stages[id].state}
                status={view.stages[id].status}
              />
            ))}
            <div
              ref={chipRef}
              aria-hidden
              data-tone={view.chip.tone}
              className={`absolute top-0 left-0 z-10 flex items-center gap-1.5 rounded-full bg-accent font-mono text-[11.5px] font-medium whitespace-nowrap text-on-accent tabular-nums shadow-[0_2px_10px_var(--chip-shadow)] transition-colors duration-200 will-change-transform before:size-1.5 before:rounded-full before:bg-current before:opacity-85 before:content-[''] data-[tone=success]:bg-success data-[tone=warning]:bg-warning ${
                vertical ? 'size-3.5 justify-center' : 'py-1 pr-2.5 pl-2'
              }`}
            >
              {!vertical && view.chip.text}
            </div>
          </div>
        )}
      </div>
      <PhaseBars
        view={view}
        bars={barsRef}
        installments={installments}
        settled={settled}
      />
      {caption && (
        <figcaption className="text-sm text-text-secondary">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};

type View = ReturnType<typeof viewOf>;

const viewOf = (frame: Frame) => {
  return {
    stages: frame.stages,
    chip: { text: frame.chip.text, tone: frame.chip.tone },
    tones: {
      lane: frame.wires.lane.tone,
      recoveryDown: frame.wires.recoveryDown.tone,
      recoveryUp: frame.wires.recoveryUp.tone,
    },
    phases: {
      done: frame.phases.origination.done,
      paid: frame.phases.maintenance.paid,
      recovery: frame.phases.recovery.status,
      settled: frame.wires.lane.tone === 'success',
    },
  };
};

const paint = (
  frame: Frame,
  layout: FlowLayout,
  chip: HTMLElement | null,
  lit: Record<'lane' | 'recoveryDown' | 'recoveryUp', SVGPathElement | null>,
  bars: Record<keyof Frame['phases'], HTMLElement | null>
) => {
  if (chip) {
    const { x, y } = pointAt(layout, frame.chip.position);
    chip.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    chip.style.opacity = `${frame.chip.opacity}`;
  }
  for (const wire of ['lane', 'recoveryDown', 'recoveryUp'] as const) {
    const path = lit[wire];
    if (!path) {
      continue;
    }
    path.style.strokeDashoffset = `${1 - frame.wires[wire].lit}`;
    path.style.opacity = `${frame.wires.opacity}`;
  }
  for (const phase of ['origination', 'maintenance', 'recovery'] as const) {
    const bar = bars[phase];
    if (bar) {
      bar.style.transform = `scaleX(${frame.phases[phase].progress})`;
    }
  }
};

const d = ([from, to]: Segment) => {
  return `M${from.x} ${from.y} L${to.x} ${to.y}`;
};

const STUB_COLOR: Record<
  Frame['stages'][StageId]['state'],
  string | undefined
> = {
  idle: undefined,
  active: 'var(--accent)',
  done: 'var(--accent)',
  warning: 'var(--warning)',
  settled: 'var(--success)',
};

const Wires = ({
  layout,
  view,
  lit,
}: {
  layout: FlowLayout;
  view: View;
  lit: React.RefObject<
    Record<'lane' | 'recoveryDown' | 'recoveryUp', SVGPathElement | null>
  >;
}) => {
  const wires = ['lane', 'recoveryDown', 'recoveryUp'] as const;
  return (
    <svg
      aria-hidden
      className="absolute inset-0 overflow-visible"
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
    >
      <g
        fill="none"
        strokeLinecap="round"
        strokeWidth={1.5}
        className="stroke-border"
      >
        {wires.map((wire) => (
          <path key={wire} d={d(layout[wire])} />
        ))}
        {STAGES.map((id) => (
          <path
            key={id}
            d={d(layout.stubs[id])}
            style={{ stroke: STUB_COLOR[view.stages[id].state] }}
            className="transition-[stroke] duration-300"
          />
        ))}
      </g>
      <g fill="none" strokeLinecap="round" strokeWidth={2}>
        {wires.map((wire) => (
          <path
            key={wire}
            ref={(path) => {
              lit.current[wire] = path;
            }}
            d={d(layout[wire])}
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset="1"
            style={{ stroke: TONE_COLOR[view.tones[wire]] }}
          />
        ))}
      </g>
    </svg>
  );
};

const PHASE_NAMES = {
  origination: 'Originação',
  maintenance: 'Manutenção',
  recovery: 'Recuperação',
} as const;

const PhaseLabels = ({ layout }: { layout: FlowLayout }) => {
  return (
    <>
      {(Object.keys(PHASE_NAMES) as (keyof typeof PHASE_NAMES)[]).map(
        (phase) => {
          const { x, y, align } = layout.labels[phase];
          return (
            <span
              key={phase}
              className="absolute font-mono text-[11px] tracking-[0.06em] whitespace-nowrap text-text-secondary uppercase"
              style={{
                left: x,
                top: y,
                transform: align === 'end' ? 'translateX(-100%)' : undefined,
              }}
            >
              {PHASE_NAMES[phase]}
            </span>
          );
        }
      )}
      {layout.rules.map((rule) => (
        <span
          key={`${rule.x}-${rule.y}`}
          className="absolute h-px bg-border"
          style={{ left: rule.x, top: rule.y, width: Math.max(0, rule.width) }}
        />
      ))}
    </>
  );
};

const StageCard = ({
  layout,
  id,
  look: { label, icon: Icon },
  state,
  status,
}: {
  layout: FlowLayout;
  id: StageId;
  look: { label: string; icon: LucideIcon };
  state: Frame['stages'][StageId]['state'];
  status: string;
}) => {
  const box = layout.cards[id];
  const compact = layout.orientation === 'vertical';
  return (
    <div
      data-state={state}
      className={`group absolute box-border grid rounded-xl border border-border bg-surface transition-[border-color,background-color,box-shadow] duration-300 data-[state=active]:border-accent data-[state=active]:bg-accent-soft data-[state=active]:shadow-[0_0_0_4px_var(--accent-ring)] data-[state=settled]:border-success-line data-[state=warning]:border-warning data-[state=warning]:bg-warning-soft data-[state=warning]:shadow-[0_0_0_4px_var(--warning-ring)] ${
        compact
          ? 'grid-cols-[30px_1fr] items-center gap-x-2.5 gap-y-0.5 px-3 py-2.5'
          : 'content-start gap-2 p-3'
      }`}
      style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
    >
      <span
        className={`grid size-[30px] place-items-center rounded-lg bg-background text-text-secondary transition-colors duration-300 group-data-[state=active]:bg-accent group-data-[state=active]:text-on-accent group-data-[state=done]:bg-success-soft group-data-[state=done]:text-success group-data-[state=settled]:bg-success group-data-[state=settled]:text-on-accent group-data-[state=warning]:bg-warning group-data-[state=warning]:text-on-accent ${
          compact ? 'row-span-2' : ''
        }`}
      >
        <Icon aria-hidden className="size-[17px]" strokeWidth={1.75} />
      </span>
      <span className="text-[13.5px] leading-tight font-semibold text-foreground">
        {label}
      </span>
      <span
        key={status}
        className={`animate-status-swap text-[12.5px] leading-snug ${
          compact ? '' : 'min-h-[2.6em]'
        } ${state === 'idle' ? 'text-text-secondary' : 'text-foreground'}`}
      >
        {status}
      </span>
    </div>
  );
};

const PhaseBars = ({
  view,
  bars,
  installments,
  settled,
}: {
  view: View;
  bars: React.RefObject<Record<keyof Frame['phases'], HTMLElement | null>>;
  installments: number;
  settled: boolean;
}) => {
  const recovery = {
    none: 'sem atraso',
    renegotiating: 'renegociando',
    agreed: 'acordo fechado',
  }[view.phases.recovery];
  const rows = [
    {
      phase: 'origination',
      detail: `${view.phases.done}/${ORIGINATION_STAGES.length} etapas`,
      color: 'bg-accent',
      span: 'sm:col-span-3',
    },
    {
      phase: 'maintenance',
      detail: `${view.phases.paid}/${installments} parcelas`,
      color: 'bg-success',
      span: '',
    },
    { phase: 'recovery', detail: recovery, color: 'bg-warning', span: '' },
  ] as const;
  return (
    <div aria-hidden className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:gap-4">
      {rows.map(({ phase, detail, color, span }) => (
        <div key={phase} className={`grid min-w-0 gap-2 ${span}`}>
          <div className="flex justify-between gap-2 text-[13px] text-foreground">
            <span>{PHASE_NAMES[phase]}</span>
            <span className="font-mono text-xs text-text-secondary tabular-nums">
              {detail}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded bg-background">
            <i
              ref={(bar) => {
                bars.current[phase] = bar;
              }}
              className={`block h-full origin-left rounded ${settled ? 'bg-success' : color}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
