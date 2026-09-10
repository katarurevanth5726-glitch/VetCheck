import { useEffect, useRef } from "react";

interface UseModalHistoryOptions {
  isOpen: boolean;
  onClose: () => void;
  modalKey: string;
  enabled?: boolean;
}

/**
 * useModalHistory
 *
 * Automatically coordinates modal open/close states with the browser / device History API.
 * - When a modal opens: pushes a history state { vetcheck: true, vetcheckModal: modalKey, ... }
 * - When user presses device/browser Back button: intercepts popstate and cleanly calls onClose()
 * - When modal is closed via in-app UI (X button, backdrop, Done): safely pops the history entry so
 *   subsequent Back button presses don't encounter stale modal entries.
 * - Fully cleans up event listeners on unmount.
 */
export function useModalHistory({
  isOpen,
  onClose,
  modalKey,
  enabled = true,
}: UseModalHistoryOptions) {
  const currentTokenRef = useRef<string | null>(null);
  const closedByPopstateRef = useRef<boolean>(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Handle modal opening -> push state and listen for popstate
  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;

    if (isOpen) {
      // Generate a unique token for this modal instance
      const token = `modal_${modalKey}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      currentTokenRef.current = token;
      closedByPopstateRef.current = false;

      // Push history state if not already pushed for this exact token
      try {
        const currentState = window.history.state || {};
        window.history.pushState(
          {
            ...currentState,
            vetcheck: true,
            vetcheckModal: modalKey,
            _modalToken: token,
          },
          ""
        );
      } catch (err) {
        console.warn("[useModalHistory] pushState failed:", err);
      }

      const handlePopState = (event: PopStateEvent) => {
        // If the current history state no longer contains our modal token,
        // it means the user pressed Back (or navigated back in history).
        if (event.state?._modalToken !== token) {
          closedByPopstateRef.current = true;
          currentTokenRef.current = null;
          onCloseRef.current();
        }
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);

        // If the modal unmounted or closed from UI (not popstate) while our token was still active:
        if (currentTokenRef.current === token && !closedByPopstateRef.current) {
          currentTokenRef.current = null;
          try {
            // Check if our token is still on top of history
            if (window.history.state?._modalToken === token) {
              window.history.back();
            }
          } catch (err) {
            console.warn("[useModalHistory] history.back() on unmount failed:", err);
          }
        }
      };
    } else {
      // When isOpen transitions to false while token was active
      if (currentTokenRef.current && !closedByPopstateRef.current) {
        const token = currentTokenRef.current;
        currentTokenRef.current = null;
        try {
          if (window.history.state?._modalToken === token) {
            window.history.back();
          }
        } catch (err) {
          console.warn("[useModalHistory] history.back() on close failed:", err);
        }
      }
      closedByPopstateRef.current = false;
    }
  }, [isOpen, modalKey, enabled]);
}
