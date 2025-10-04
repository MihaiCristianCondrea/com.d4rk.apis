(function (global) {
    const FOCUSABLE_SELECTOR = [
        'button:not([disabled])',
        'a[href]:not([tabindex="-1"])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        'md-filled-button:not([disabled])',
        'md-filled-tonal-button:not([disabled])',
        'md-tonal-button:not([disabled])',
        'md-text-button:not([disabled])',
        'md-outlined-button:not([disabled])',
        'md-elevated-button:not([disabled])',
        'md-icon-button:not([disabled])',
        'md-outlined-select:not([disabled])',
        'md-switch:not([disabled])',
        'md-checkbox:not([disabled])'
    ].join(', ');

    const openDialogs = new Set();

    function isElementVisible(element) {
        if (!element) {
            return false;
        }
        if (element.hidden) {
            return false;
        }
        const style = window.getComputedStyle(element);
        if (style.visibility === 'hidden' || style.display === 'none') {
            return false;
        }
        const rects = element.getClientRects();
        return rects.length > 0 && rects[0].width > 0 && rects[0].height > 0;
    }

    function getFocusableElements(dialog) {
        if (!dialog || typeof dialog.querySelectorAll !== 'function') {
            return [];
        }
        return Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) =>
            isElementVisible(element)
        );
    }

    function closeDialog(dialog) {
        if (!dialog) {
            return;
        }
        if (typeof dialog.close === 'function') {
            dialog.close();
        } else {
            dialog.open = false;
        }
    }

    function rememberTrigger(dialog, trigger) {
        if (!dialog) {
            return;
        }
        const HTMLElementCtor = typeof global.HTMLElement === 'function' ? global.HTMLElement : null;
        const element = HTMLElementCtor && trigger instanceof HTMLElementCtor ? trigger : document.activeElement;
        dialog.__appDialogTrigger = element && typeof element.focus === 'function' ? element : null;
    }

    function restoreTriggerFocus(dialog) {
        if (!dialog) {
            return;
        }
        const trigger = dialog.__appDialogTrigger;
        if (trigger && typeof trigger.focus === 'function') {
            trigger.focus({ preventScroll: true });
        }
        dialog.__appDialogTrigger = null;
    }

    function updateBodyState() {
        if (!document.body) {
            return;
        }
        if (openDialogs.size > 0) {
            document.body.setAttribute('data-dialog-open', 'true');
        } else {
            document.body.removeAttribute('data-dialog-open');
        }
    }

    function focusInitialElement(dialog) {
        if (!dialog) {
            return;
        }
        const explicitTarget = dialog.querySelector('[data-dialog-initial-focus]');
        if (explicitTarget && typeof explicitTarget.focus === 'function') {
            explicitTarget.focus({ preventScroll: true });
            return;
        }
        const focusable = getFocusableElements(dialog);
        if (focusable.length > 0 && typeof focusable[0].focus === 'function') {
            focusable[0].focus({ preventScroll: true });
        } else if (typeof dialog.focus === 'function') {
            if (!dialog.hasAttribute('tabindex')) {
                dialog.setAttribute('tabindex', '-1');
            }
            dialog.focus({ preventScroll: true });
        }
    }

    function setInlineStyles(target, styles) {
        if (!target || !styles) {
            return;
        }
        Object.entries(styles).forEach(([property, value]) => {
            if (value === null || value === undefined) {
                target.style.removeProperty(property);
            } else {
                target.style.setProperty(property, value);
            }
        });
    }

    function applyDialogLayout(dialog) {
        if (!dialog) {
            return;
        }

        const applyStyles = () => {
            const root = dialog.shadowRoot;
            if (!root) {
                return;
            }

            const nativeDialog = root.querySelector('dialog');
            const scrim = root.querySelector('.scrim');
            const container = root.querySelector('.container');
            const scroller = root.querySelector('.scroller');

            setInlineStyles(nativeDialog, {
                position: 'fixed',
                inset: '0',
                margin: '0',
                padding: 'clamp(0.75rem, 4vw, 2.5rem)',
                'box-sizing': 'border-box',
                display: 'flex',
                'flex-direction': 'column',
                'align-items': 'center',
                'justify-content': 'center',
                width: '100vw',
                'max-width': '100vw',
                height: 'max(100vh, 100dvh)',
                'min-height': 'max(100vh, 100dvh)',
                'max-height': 'max(100vh, 100dvh)',
                background: 'transparent',
                'pointer-events': 'auto',
            });

            setInlineStyles(scrim, {
                position: 'fixed',
                inset: '0',
                background: 'rgba(15, 23, 42, 0.6)',
                'backdrop-filter': 'blur(8px)',
                'pointer-events': 'none',
            });

            setInlineStyles(container, {
                'box-sizing': 'border-box',
                display: 'flex',
                'flex-direction': 'column',
                width: 'min(90vw, 600px)',
                'max-width': 'min(90vw, 600px)',
                'min-width': 'min(90vw, 320px)',
                'max-height': 'min(90vh, 720px)',
                padding: 'clamp(1rem, 3vw, 2.25rem)',
                margin: '0',
                'border-radius': '28px',
                'box-shadow': '0 32px 80px rgba(15, 23, 42, 0.28)',
                'background-color': 'var(--app-dialog-bg-color, var(--md-sys-color-surface-container-low))',
                overflow: 'auto',
                'pointer-events': 'auto',
                'scrollbar-gutter': 'stable both-edges',
            });

            setInlineStyles(scroller, {
                'overscroll-behavior': 'contain',
            });
        };

        try {
            const maybePromise = dialog.updateComplete;
            if (maybePromise && typeof maybePromise.then === 'function') {
                maybePromise.then(applyStyles).catch(() => applyStyles());
                return;
            }
        } catch (error) {
            // Ignore errors accessing updateComplete and fall back to async styling.
        }

        if (typeof global.requestAnimationFrame === 'function') {
            global.requestAnimationFrame(applyStyles);
        } else {
            setTimeout(applyStyles, 0);
        }
    }

    function handleOpened(event) {
        const dialog = event.currentTarget;
        applyDialogLayout(dialog);
        openDialogs.add(dialog);
        updateBodyState();
        focusInitialElement(dialog);
    }

    function handleClosed(event) {
        const dialog = event.currentTarget;
        openDialogs.delete(dialog);
        updateBodyState();
        restoreTriggerFocus(dialog);
    }

    function handleKeydown(event) {
        if (event.defaultPrevented || event.key !== 'Escape') {
            return;
        }
        const dialog = event.currentTarget;
        event.stopPropagation();
        closeDialog(dialog);
    }

    function enhanceDialog(dialog) {
        if (!dialog || dialog.dataset.dialogEnhanced === 'true') {
            return;
        }

        dialog.dataset.dialogEnhanced = 'true';
        if ('ariaModal' in dialog && !dialog.hasAttribute('aria-modal')) {
            dialog.setAttribute('aria-modal', 'true');
        }
        if ('noFocusTrap' in dialog) {
            dialog.noFocusTrap = false;
        }

        applyDialogLayout(dialog);
        dialog.addEventListener('opened', handleOpened);
        dialog.addEventListener('closed', handleClosed);
        dialog.addEventListener('keydown', handleKeydown);
    }

    function init(root = document) {
        if (!root) {
            return 0;
        }
        const dialogs = Array.from(root.querySelectorAll('.app-dialog'));
        dialogs.forEach((dialog) => enhanceDialog(dialog));
        return dialogs.length;
    }

    const AppDialogs = {
        init,
        enhanceDialog,
        rememberTrigger,
        closeDialog
    };

    global.AppDialogs = AppDialogs;

    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            init(document);
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AppDialogs;
    }
})(typeof window !== 'undefined' ? window : globalThis);
