import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";

// Enterprise-level UI hardening - Block context menu and long-press globally
document.addEventListener('contextmenu', (e) => {
  const target = e.target as HTMLElement;
  // Allow context menu only on inputs, textareas, and elements marked as copyable
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.closest('[data-copyable="true"]')
  ) {
    return;
  }
  e.preventDefault();
});

// Prevent text selection via keyboard shortcuts (Ctrl+A, Ctrl+C outside allowed elements)
document.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement;
  const isAllowedElement = 
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.closest('[data-copyable="true"]');
  
  // Block Ctrl+A (select all) outside inputs
  if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !isAllowedElement) {
    e.preventDefault();
  }
});

// Prevent drag start on non-input elements
document.addEventListener('dragstart', (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
    e.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <App />
  </ThemeProvider>
);
