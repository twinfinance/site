import { useEffect, useRef, type RefObject } from 'react';

interface ClockOptions {
  speed: number;
  paused: boolean;
  stillTime: number | null;
  onTick: (time: number) => void;
}

const HOVER_SPEED = 0.6;
const SPEED_EASING_MS = 140;
const LONGEST_FRAME_MS = 64;

export const useAnimationClock = (
  target: RefObject<HTMLElement | null>,
  { speed, paused, stillTime, onTick }: ClockOptions
) => {
  const timeRef = useRef(0);
  const settingsRef = useRef({ speed, paused, onTick });
  const wakeRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    settingsRef.current = { speed, paused, onTick };
    wakeRef.current();
  }, [speed, paused, onTick]);

  useEffect(() => {
    const element = target.current;
    if (!element) {
      return;
    }
    if (stillTime !== null) {
      settingsRef.current.onTick(stillTime);
      return;
    }

    let frame = 0;
    let last: number | null = null;
    let current = settingsRef.current.paused ? 0 : settingsRef.current.speed;
    let visible = true;
    let hovering = false;

    const goal = () =>
      settingsRef.current.paused
        ? 0
        : settingsRef.current.speed * (hovering ? HOVER_SPEED : 1);

    const tick = (now: number) => {
      frame = 0;
      const elapsed = Math.min(LONGEST_FRAME_MS, now - (last ?? now));
      last = now;
      const wanted = goal();
      current += (wanted - current) * Math.min(1, elapsed / SPEED_EASING_MS);
      if (Math.abs(current - wanted) < 0.002) {
        current = wanted;
      }
      timeRef.current += elapsed * current;
      settingsRef.current.onTick(timeRef.current);
      if (current !== 0 || wanted !== 0) {
        schedule();
      }
    };
    const schedule = () => {
      if (frame || !visible || document.hidden) {
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    const restart = () => {
      last = null;
      schedule();
    };
    wakeRef.current = restart;

    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? true;
        restart();
      },
      { threshold: 0.1 }
    );
    intersection.observe(element);
    const enter = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        return;
      }
      hovering = true;
      restart();
    };
    const leave = () => {
      hovering = false;
      restart();
    };
    element.addEventListener('pointerenter', enter);
    element.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', restart);

    settingsRef.current.onTick(timeRef.current);
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      intersection.disconnect();
      element.removeEventListener('pointerenter', enter);
      element.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', restart);
      wakeRef.current = () => undefined;
    };
  }, [target, stillTime]);
};
