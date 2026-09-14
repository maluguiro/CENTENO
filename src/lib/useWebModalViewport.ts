import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

type WebModalViewport = {
  isCompactWeb: boolean;
  isKeyboardVisible: boolean;
  keyboardInset: number;
  viewportHeight: number;
};

type ViewportMeasurement = {
  keyboardInset: number;
  viewportHeight: number;
  width: number;
};

function readViewport(): ViewportMeasurement {
  if (typeof window === "undefined") {
    return { keyboardInset: 0, viewportHeight: 0, width: 0 };
  }

  const visualViewport = window.visualViewport;
  const viewportHeight = Math.round(visualViewport?.height ?? window.innerHeight);
  const keyboardInset = Math.max(
    0,
    Math.round(window.innerHeight - viewportHeight - (visualViewport?.offsetTop ?? 0))
  );

  return {
    keyboardInset,
    viewportHeight,
    width: Math.round(visualViewport?.width ?? window.innerWidth)
  };
}

/** Tracks the browser's visible viewport while a virtual keyboard is open. */
export function useWebModalViewport(): WebModalViewport {
  const [viewport, setViewport] = useState(() => ({
    ...readViewport(),
    isKeyboardVisible: false
  }));
  const maxViewportHeight = useRef(viewport.viewportHeight);
  const viewportWidth = useRef(viewport.width);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    const updateViewport = () => {
      const next = readViewport();
      const widthChanged = Math.abs(next.width - viewportWidth.current) > 100;

      if (widthChanged) {
        maxViewportHeight.current = next.viewportHeight;
      } else {
        maxViewportHeight.current = Math.max(maxViewportHeight.current, next.viewportHeight);
      }

      viewportWidth.current = next.width;
      setViewport({
        ...next,
        isKeyboardVisible:
          next.keyboardInset > 0 || maxViewportHeight.current - next.viewportHeight > 120
      });
    };
    const visualViewport = window.visualViewport;

    updateViewport();
    window.addEventListener("resize", updateViewport);
    visualViewport?.addEventListener("resize", updateViewport);
    visualViewport?.addEventListener("scroll", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
      visualViewport?.removeEventListener("resize", updateViewport);
      visualViewport?.removeEventListener("scroll", updateViewport);
    };
  }, []);

  return {
    isCompactWeb: Platform.OS === "web" && viewport.width < 600,
    isKeyboardVisible: viewport.isKeyboardVisible,
    keyboardInset: viewport.keyboardInset,
    viewportHeight: viewport.viewportHeight
  };
}
