"use client";

import { useCallback, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, PointerEventHandler, RefObject } from "react";

type MouseSpotlightBindings<T extends HTMLElement> = {
  spotlightRef: RefObject<T | null>;
  onPointerMove: PointerEventHandler<T>;
  onPointerLeave: PointerEventHandler<T>;
};

export function useMouseSpotlight<T extends HTMLElement>(): MouseSpotlightBindings<T> {
  const spotlightRef = useRef<T | null>(null);

  const setSpotlightPosition = useCallback(
    (event: ReactPointerEvent<T>, target: T): void => {
      const rect = target.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      target.style.setProperty("--mouse-x", `${x}px`);
      target.style.setProperty("--mouse-y", `${y}px`);
    },
    [],
  );

  const onPointerMove = useCallback<PointerEventHandler<T>>(
    (event): void => {
      const target = spotlightRef.current;
      if (!target) {
        return;
      }

      setSpotlightPosition(event, target);
    },
    [setSpotlightPosition],
  );

  const onPointerLeave = useCallback<PointerEventHandler<T>>((event): void => {
    const target = spotlightRef.current;
    if (!target) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    target.style.setProperty("--mouse-x", `${rect.width / 2}px`);
    target.style.setProperty("--mouse-y", `${rect.height / 2}px`);
  }, []);

  return {
    spotlightRef,
    onPointerMove,
    onPointerLeave,
  };
}
