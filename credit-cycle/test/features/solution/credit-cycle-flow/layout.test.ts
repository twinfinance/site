import { describe, expect, it } from 'vitest';

import {
  layoutFor,
  pointAt,
  type Box,
} from '@/features/solution/credit-cycle-flow/layout';

const overlap = (a: Box, b: Box) => {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
};

const noOverlaps = (boxes: Box[]) => {
  return boxes.every((a, i) =>
    boxes.every((b, j) => i === j || !overlap(a, b))
  );
};

describe('layoutFor', () => {
  it('lays the stages in a row when each card is wide enough', () => {
    const layout = layoutFor(1100);

    expect(layout.orientation).toBe('horizontal');
    expect(layout.cards.communication.y).toBe(layout.cards.collection.y);
    expect(
      layout.cards.collection.x + layout.cards.collection.width
    ).toBeCloseTo(1100);
    expect(layout.cards.recovery.x).toBe(layout.cards.collection.x);
    expect(layout.cards.recovery.y).toBeGreaterThan(layout.cards.collection.y);
  });

  it('stacks the stages when the row would squeeze the cards', () => {
    const layout = layoutFor(600);

    expect(layout.orientation).toBe('vertical');
    expect(layout.cards.communication.x).toBe(layout.cards.collection.x);
    expect(layout.cards.recovery.y).toBeGreaterThan(layout.cards.collection.y);
  });

  it.each([360, 600, 1100, 1400])(
    'keeps the cards apart and inside %ipx',
    (width) => {
      const layout = layoutFor(width);
      const boxes = Object.values(layout.cards);

      expect(noOverlaps(boxes)).toBe(true);
      for (const box of boxes) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1e-6);
        expect(box.y + box.height).toBeLessThanOrEqual(layout.height);
      }
    }
  );

  it('ties every main stage to the lane', () => {
    const layout = layoutFor(1100);
    const laneY = layout.lane[0].y;

    expect(layout.stubs.kyc[0].y).toBe(
      layout.cards.kyc.y + layout.cards.kyc.height
    );
    expect(layout.stubs.kyc[1].y).toBe(laneY);
  });

  it('runs the way to recovery and the way back side by side', () => {
    for (const width of [400, 1100]) {
      const { recoveryDown, recoveryUp } = layoutFor(width);

      expect(recoveryDown[0]).not.toEqual(recoveryUp[1]);
      expect(recoveryDown[1]).not.toEqual(recoveryUp[0]);
    }
  });
});

describe('pointAt', () => {
  const layout = layoutFor(1100);

  it('rests the chip on the lane under its stage', () => {
    expect(
      pointAt(layout, { on: 'lane', from: 2, to: 2, progress: 0 })
    ).toEqual(layout.stubs.underwriting[1]);
  });

  it('places the chip between two stages as it moves', () => {
    const point = pointAt(layout, {
      on: 'lane',
      from: 0,
      to: 1,
      progress: 0.5,
    });
    const from = layout.stubs.communication[1];
    const to = layout.stubs.prequalification[1];

    expect(point).toEqual({ x: (from.x + to.x) / 2, y: from.y });
  });

  it('follows the way to recovery and back to collection', () => {
    expect(
      pointAt(layout, { on: 'recovery', leg: 'down', progress: 1 })
    ).toEqual(layout.recoveryDown[1]);
    expect(pointAt(layout, { on: 'recovery', leg: 'up', progress: 0 })).toEqual(
      layout.recoveryUp[0]
    );
    expect(
      pointAt(layout, { on: 'recovery', leg: 'back', progress: 1 })
    ).toEqual(layout.stubs.collection[1]);
  });
});
