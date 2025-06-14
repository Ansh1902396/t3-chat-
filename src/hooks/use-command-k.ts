import { useEffect, useCallback } from "react";

interface UseCommandKProps {
  onOpen: () => void;
  disabled?: boolean;
}

export function useCommandK({ onOpen, disabled = false }: UseCommandKProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;
      
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        event.stopPropagation();
        onOpen();
      }
    },
    [onOpen, disabled]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}

// Hook to detect if user is on Mac
export function useIsMac() {
  return typeof window !== "undefined" && window.navigator.platform.toUpperCase().indexOf("MAC") >= 0;
} 