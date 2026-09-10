import { useEffect, useState } from "react";
import { Platform } from "react-native";

type WebModalViewport = {
  isCompactWeb: boolean;
  keyboardInset: number;
  viewportHeight: number;
};

function readViewport(): Omit<WebModalViewport, "isCompactWeb"> & { width: number } {
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
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    const updateViewport = () => setViewport(readViewport());
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
    keyboardInset: viewport.keyboardInset,
    viewportHeight: viewport.viewportHeight
  };
}
