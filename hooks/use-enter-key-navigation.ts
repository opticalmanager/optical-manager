"use client";

import { useRef, useCallback } from "react";
import { handleEnterKeyNavigation, FormNavigationOptions } from "@/utils/form-navigation";

/**
 * React hook that equips any form or container with industrial Enter-as-Tab keyboard navigation.
 * 
 * Usage:
 * ```tsx
 * const { formRef, handleKeyDown } = useEnterKeyNavigation();
 * return (
 *   <form ref={formRef} onKeyDown={handleKeyDown}>
 *     ...inputs...
 *   </form>
 * );
 * ```
 */
export function useEnterKeyNavigation<T extends HTMLElement = HTMLFormElement>(
  options: FormNavigationOptions = {}
) {
  const formRef = useRef<T | null>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      handleEnterKeyNavigation(e, {
        container: formRef.current,
        ...options,
      });
    },
    [options]
  );

  const focusFirst = useCallback(() => {
    if (!formRef.current) return;
    const firstInput = formRef.current.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled])'
    );
    if (firstInput) {
      firstInput.focus();
      if (firstInput instanceof HTMLInputElement) {
        firstInput.select?.();
      }
    }
  }, []);

  return {
    formRef,
    handleKeyDown,
    focusFirst,
  };
}
