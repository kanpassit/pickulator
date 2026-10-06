"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// After a client-side navigation the previously focused element is usually
// gone, so focus falls back to <body> and keyboard / screen reader users have
// to start again from the top of the page. Move focus to the new screen's h1
// (or <main> if there isn't one) so they land where the new content starts.
//
// Pages load their data asynchronously, so the h1 may not exist yet: watch
// for it briefly. Skips the first render (a normal page load keeps the
// browser's default focus handling) and backs off if the person starts
// interacting before the heading shows up.
export function RouteFocus() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const main = document.getElementById("main-content");
    if (!main) return;

    let done = false;
    const cleanups: Array<() => void> = [];

    const finish = () => {
      done = true;
      cleanups.forEach((fn) => fn());
    };

    const focusHeading = () => {
      const heading = main.querySelector<HTMLElement>("h1");
      if (!heading) return false;
      if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
      heading.classList.add("focus:outline-none");
      heading.focus({ preventScroll: true });
      return true;
    };

    if (focusHeading()) return;

    const observer = new MutationObserver(() => {
      if (!done && focusHeading()) finish();
    });
    observer.observe(main, { childList: true, subtree: true });
    cleanups.push(() => observer.disconnect());

    const timeout = window.setTimeout(() => {
      if (done) return;
      main.focus({ preventScroll: true });
      finish();
    }, 4000);
    cleanups.push(() => window.clearTimeout(timeout));

    const cancel = () => finish();
    window.addEventListener("keydown", cancel, { once: true });
    window.addEventListener("pointerdown", cancel, { once: true });
    cleanups.push(() => {
      window.removeEventListener("keydown", cancel);
      window.removeEventListener("pointerdown", cancel);
    });

    return finish;
  }, [pathname]);

  return null;
}
