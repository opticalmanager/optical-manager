/**
 * Industrial Enter-Key Form Navigation Utility (Enter-as-Tab)
 * 
 * Replicates high-speed retail POS & ERP software (Tally, Marg, Busy, optical POS terminals).
 * Pressing Enter on an input field advances focus to the next logical interactive field,
 * auto-selecting its text for instant overwriting, while preserving textarea multiline behavior,
 * skipping disabled/hidden elements, and submitting upon reaching the final action button.
 */

export interface FormNavigationOptions {
  /**
   * Custom CSS selector for focusable elements.
   * Defaults to standard interactive inputs, selects, textareas, and submit buttons.
   */
  selector?: string;
  /**
   * Container element or root ref to scope the search within.
   * If omitted, scopes to the closest form or event.currentTarget.
   */
  container?: HTMLElement | null;
  /**
   * Whether to auto-select input text when focused (default: true).
   */
  autoSelect?: boolean;
  /**
   * Callback invoked when Enter is pressed on the last interactive element.
   */
  onComplete?: () => void;
  /**
   * Custom filter function to exclude specific elements.
   */
  filterElement?: (el: HTMLElement) => boolean;
}

const DEFAULT_FOCUSABLE_SELECTOR = [
  'input:not([type="hidden"]):not([disabled]):not([readonly]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([readonly]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
  'button[type="submit"]:not([disabled])',
  'button[data-enter-submit="true"]:not([disabled])',
].join(', ');

/**
 * Checks if an element is visible and interactive in the DOM.
 */
function isElementVisible(el: HTMLElement): boolean {
  if (!el || el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) {
    // Might be display: none or inside a closed details/hidden panel
    return false;
  }
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  if (el.getAttribute('data-ignore-enter-nav') === 'true') {
    return false;
  }
  return true;
}

/**
 * Handles Enter key navigation across form fields.
 * Call this in onKeyDown on a form, container, or specific inputs.
 */
export function handleEnterKeyNavigation(
  e: React.KeyboardEvent<HTMLElement> | KeyboardEvent,
  options: FormNavigationOptions = {}
): boolean {
  // Only handle Enter key without modifier keys (unless Shift for reverse or Ctrl for textarea)
  if (e.key !== 'Enter') return false;

  const target = e.target as HTMLElement;
  if (!target) return false;

  const isTextarea = target.tagName === 'TEXTAREA';
  const isButton = target.tagName === 'BUTTON' || target.getAttribute('role') === 'button';
  const isSubmitButton = isButton && (target.getAttribute('type') === 'submit' || target.getAttribute('data-enter-submit') === 'true');

  // Rule 1: Standard Enter inside textarea inserts newline.
  // Ctrl+Enter or Cmd+Enter advances to next field.
  if (isTextarea) {
    if (!e.ctrlKey && !e.metaKey) {
      return false; // allow default newline behavior
    }
  }

  // Rule 2: Enter on submit button executes its default action / submission.
  if (isSubmitButton && !e.shiftKey) {
    return false; // allow native click/submit
  }

  // Rule 3: If target is an open autocomplete dropdown navigating list items, don't hijack
  if (target.getAttribute('aria-expanded') === 'true' && target.getAttribute('role') === 'combobox') {
    return false;
  }

  const container = options.container || (target.closest('form') as HTMLElement) || (e.currentTarget as HTMLElement) || document.body;
  const selector = options.selector || DEFAULT_FOCUSABLE_SELECTOR;
  const autoSelect = options.autoSelect !== false;

  const allElements = Array.from(container.querySelectorAll<HTMLElement>(selector));
  const focusable = allElements.filter((el) => {
    if (!isElementVisible(el)) return false;
    if (options.filterElement && !options.filterElement(el)) return false;
    return true;
  });

  if (focusable.length === 0) return false;

  const currentIndex = focusable.indexOf(target);
  const isReverse = e.shiftKey;

  // Prevent default form submission or unwanted sound
  e.preventDefault();
  e.stopPropagation();

  if (currentIndex === -1) {
    // Current target wasn't found in focusable list; focus first element
    const first = focusable[0];
    focusAndSelect(first, autoSelect);
    return true;
  }

  if (isReverse) {
    // Move to previous field
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      const prevEl = focusable[prevIndex];
      focusAndSelect(prevEl, autoSelect);
      return true;
    }
    return false;
  }

  // Move to next field
  const nextIndex = currentIndex + 1;
  if (nextIndex < focusable.length) {
    const nextEl = focusable[nextIndex];
    focusAndSelect(nextEl, autoSelect);
    return true;
  } else {
    // Reached the end of focusable fields
    if (options.onComplete) {
      options.onComplete();
    } else {
      // If the last element is a button or form has a submit button, trigger submit
      const submitBtn = focusable.find(
        (el) => el.tagName === 'BUTTON' && (el.getAttribute('type') === 'submit' || el.getAttribute('data-enter-submit') === 'true')
      );
      if (submitBtn && submitBtn !== target) {
        submitBtn.focus();
      } else if (container.tagName === 'FORM') {
        (container as HTMLFormElement).requestSubmit?.();
      }
    }
    return true;
  }
}

/**
 * Focuses an element and optionally selects its text for instant replacement.
 */
function focusAndSelect(el: HTMLElement, autoSelect: boolean) {
  if (!el) return;
  el.focus();

  if (autoSelect && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
    // Select input text for instant numpad/keyboard overwriting
    try {
      if (
        el.type === 'text' ||
        el.type === 'number' ||
        el.type === 'tel' ||
        el.type === 'email' ||
        el.type === 'search' ||
        el.type === 'password'
      ) {
        el.select();
      }
    } catch {
      // Ignore types that don't support select()
    }
  }
}
