import {
  MAIN_STAGES,
  STAGES,
  type ChipPosition,
  type StageId,
} from './timeline';

export interface Point {
  x: number;
  y: number;
}

export interface Box extends Point {
  width: number;
  height: number;
}

export type Segment = readonly [Point, Point];

export interface FlowLayout {
  orientation: 'horizontal' | 'vertical';
  width: number;
  height: number;
  cards: Record<StageId, Box>;
  lane: Segment;
  stubs: Record<StageId, Segment>;
  recoveryDown: Segment;
  recoveryUp: Segment;
  labels: Record<
    'origination' | 'maintenance' | 'recovery',
    Point & { align: 'start' | 'end' }
  >;
  rules: readonly { x: number; y: number; width: number }[];
}

const MIN_CARD_WIDTH = 118;
const CARD_GAP = 18;
const LABEL_WIDTH = 110;
const RECOVERY_WIRE_OFFSET = 12;

const HORIZONTAL = { top: 30, cardHeight: 112, laneGap: 30, recoveryGap: 60 };
const VERTICAL = {
  top: 26,
  cardHeight: 60,
  rowGap: 14,
  phaseGap: 30,
  laneGap: 18,
  laneWidth: 12,
  recoveryWireOffset: 5,
};

export const layoutFor = (width: number): FlowLayout => {
  const cardWidth =
    (width - CARD_GAP * (MAIN_STAGES.length - 1)) / MAIN_STAGES.length;
  return cardWidth >= MIN_CARD_WIDTH
    ? horizontal(width, cardWidth)
    : vertical(width);
};

const horizontal = (width: number, cardWidth: number): FlowLayout => {
  const { top, cardHeight, laneGap, recoveryGap } = HORIZONTAL;
  const laneY = top + cardHeight + laneGap;
  const recoveryTop = laneY + recoveryGap;
  const cards = {} as Record<StageId, Box>;
  MAIN_STAGES.forEach((id, index) => {
    cards[id] = {
      x: index * (cardWidth + CARD_GAP),
      y: top,
      width: cardWidth,
      height: cardHeight,
    };
  });
  cards.recovery = { ...cards.collection, y: recoveryTop };

  const centerX = (id: StageId) => cards[id].x + cardWidth / 2;
  const stubs = {} as Record<StageId, Segment>;
  for (const id of MAIN_STAGES) {
    stubs[id] = [
      { x: centerX(id), y: top + cardHeight },
      { x: centerX(id), y: laneY },
    ];
  }
  const collectionX = centerX('collection');
  stubs.recovery = [
    { x: collectionX, y: recoveryTop },
    { x: collectionX, y: recoveryTop },
  ];

  const assignment = cards.assignment;
  return {
    orientation: 'horizontal',
    width,
    height: recoveryTop + cardHeight + 4,
    cards,
    lane: [
      { x: centerX('communication'), y: laneY },
      { x: collectionX, y: laneY },
    ],
    stubs,
    recoveryDown: [
      { x: collectionX - RECOVERY_WIRE_OFFSET, y: laneY },
      { x: collectionX - RECOVERY_WIRE_OFFSET, y: recoveryTop },
    ],
    recoveryUp: [
      { x: collectionX + RECOVERY_WIRE_OFFSET, y: recoveryTop },
      { x: collectionX + RECOVERY_WIRE_OFFSET, y: laneY },
    ],
    labels: {
      origination: { x: 0, y: 4, align: 'start' },
      maintenance: { x: cards.collection.x, y: 4, align: 'start' },
      recovery: {
        x: cards.recovery.x - CARD_GAP / 2,
        y: recoveryTop + 4,
        align: 'end',
      },
    },
    rules: [
      { x: LABEL_WIDTH, y: 12, width: assignment.x + cardWidth - LABEL_WIDTH },
      {
        x: cards.collection.x + LABEL_WIDTH,
        y: 12,
        width: Math.max(0, cardWidth - LABEL_WIDTH),
      },
    ],
  };
};

const vertical = (width: number): FlowLayout => {
  const {
    top,
    cardHeight,
    rowGap,
    phaseGap,
    laneGap,
    laneWidth,
    recoveryWireOffset,
  } = VERTICAL;
  const cardWidth = width - laneGap - laneWidth;
  const laneX = cardWidth + laneGap;
  const cards = {} as Record<StageId, Box>;
  let y = top;
  for (const id of STAGES) {
    if (id === 'collection' || id === 'recovery') {
      y += phaseGap;
    }
    cards[id] = { x: 0, y, width: cardWidth, height: cardHeight };
    y += cardHeight + rowGap;
  }
  const centerY = (id: StageId) => cards[id].y + cardHeight / 2;
  const stubs = {} as Record<StageId, Segment>;
  for (const id of STAGES) {
    const end = id === 'recovery' ? laneX - recoveryWireOffset : laneX;
    stubs[id] = [
      { x: cardWidth, y: centerY(id) },
      { x: end, y: centerY(id) },
    ];
  }

  return {
    orientation: 'vertical',
    width,
    height: y - rowGap + 2,
    cards,
    lane: [
      { x: laneX, y: centerY('communication') },
      { x: laneX, y: centerY('collection') },
    ],
    stubs,
    recoveryDown: [
      { x: laneX - recoveryWireOffset, y: centerY('collection') },
      { x: laneX - recoveryWireOffset, y: centerY('recovery') },
    ],
    recoveryUp: [
      { x: laneX + recoveryWireOffset, y: centerY('recovery') },
      { x: laneX + recoveryWireOffset, y: centerY('collection') },
    ],
    labels: {
      origination: { x: 0, y: 0, align: 'start' },
      maintenance: { x: 0, y: cards.collection.y - 26, align: 'start' },
      recovery: { x: 0, y: cards.recovery.y - 26, align: 'start' },
    },
    rules: [
      { x: LABEL_WIDTH, y: 8, width: cardWidth - LABEL_WIDTH },
      {
        x: LABEL_WIDTH,
        y: cards.collection.y - 18,
        width: cardWidth - LABEL_WIDTH,
      },
      {
        x: LABEL_WIDTH,
        y: cards.recovery.y - 18,
        width: cardWidth - LABEL_WIDTH,
      },
    ],
  };
};

export const pointAt = (layout: FlowLayout, position: ChipPosition): Point => {
  if (position.on === 'lane') {
    return lerp(
      laneStop(layout, position.from),
      laneStop(layout, position.to),
      position.progress
    );
  }
  const [downFrom, downTo] = layout.recoveryDown;
  const [upFrom, upTo] = layout.recoveryUp;
  switch (position.leg) {
    case 'down':
      return lerp(downFrom, downTo, position.progress);
    case 'across':
      return lerp(downTo, upFrom, position.progress);
    case 'up':
      return lerp(upFrom, upTo, position.progress);
    case 'back':
      return lerp(
        upTo,
        laneStop(layout, MAIN_STAGES.length - 1),
        position.progress
      );
  }
};

const laneStop = (layout: FlowLayout, stage: number): Point => {
  return layout.stubs[MAIN_STAGES[stage] ?? 'collection'][1];
};

const lerp = (from: Point, to: Point, progress: number): Point => {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
};
