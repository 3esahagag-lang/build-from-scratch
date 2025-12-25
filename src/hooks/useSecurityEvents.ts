// Security event handlers for financial application hardening
import { useEffect, useCallback } from "react";

/**
 * Hook to prevent copy/paste/cut operations globally
 * Allows only on elements with data-copyable="true"
 */
export function usePreventCopy() {
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (!target?.closest("[data-copyable]")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      // Allow cut only in input/textarea
      if (
        !(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      // Allow paste only in input/textarea
      if (
        !(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("cut", handleCut, true);
    document.addEventListener("paste", handlePaste, true);

    return () => {
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("cut", handleCut, true);
      document.removeEventListener("paste", handlePaste, true);
    };
  }, []);
}

/**
 * Hook to prevent context menu (right-click / long-press)
 * Allows only on elements with data-allow-context="true"
 */
export function usePreventContextMenu() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target?.closest("[data-allow-context]")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener("contextmenu", handleContextMenu, true);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, true);
    };
  }, []);
}

/**
 * Hook to prevent text selection via keyboard shortcuts
 * Ctrl+A, Cmd+A, etc.
 */
export function usePreventSelectAll() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Allow in inputs/textareas
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Prevent Ctrl/Cmd + A (select all)
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        e.stopPropagation();
      }

      // Prevent Ctrl/Cmd + C (copy) outside copyable elements
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (!target?.closest("[data-copyable]")) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);
}

/**
 * Hook to prevent drag and drop of content
 */
export function usePreventDragDrop() {
  useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (!target?.closest("[data-draggable]")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleDrop = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      // Allow drop only in file inputs or designated areas
      if (!target?.closest("[data-droppable]") && !(target instanceof HTMLInputElement && target.type === "file")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("dragstart", handleDragStart, true);
    document.addEventListener("drop", handleDrop, true);

    return () => {
      document.removeEventListener("dragstart", handleDragStart, true);
      document.removeEventListener("drop", handleDrop, true);
    };
  }, []);
}

/**
 * Master hook that applies all security measures
 */
export function useFinancialSecurity() {
  usePreventCopy();
  usePreventContextMenu();
  usePreventSelectAll();
  usePreventDragDrop();
}

/**
 * Hook to create a copyable ref - allows copying specific content
 */
export function useCopyableContent() {
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand("copy");
        return true;
      } catch {
        return false;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  }, []);

  return { copyToClipboard };
}
