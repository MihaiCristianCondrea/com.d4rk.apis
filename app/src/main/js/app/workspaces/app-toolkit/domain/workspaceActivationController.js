/**
 * Coordinates when the App Toolkit builder becomes interactive.
 *
 * Change Rationale: The builder previously rendered immediately, inviting edits before a trusted
 * baseline JSON was loaded. This controller defers visibility and disables mutation controls until
 * data arrives, aligning with Material motion guidance and reducing accidental edits on stale
 * payloads.
 *
 * @param {Object} [options] Configuration for the controller.
 * @param {HTMLElement|null} [options.container] Wrapper that holds the builder controls and forms.
 * @param {HTMLElement[]} [options.buttons] Buttons that should be disabled until the workspace is ready.
 * @param {() => boolean} [options.prefersReducedMotion] Callback to honor reduced-motion settings.
 * @returns {{ setReady: (isReady: boolean, opts?: { animate?: boolean }) => void, isReady: () => boolean }}
 * Returns helpers for toggling and querying the ready state.
 */
export function createWorkspaceActivationController(options = {}) {
  const container = options.container || null;
  const buttons = Array.isArray(options.buttons) ? options.buttons.filter(Boolean) : [];
  const prefersReducedMotion =
    typeof options.prefersReducedMotion === 'function'
      ? options.prefersReducedMotion
      : () => false;

  let readyState = false;
  let currentAnimation = null;

  const setButtonState = (disabled) => {
    buttons.forEach((button) => {
      button.disabled = disabled;
      button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    });
  };

  const cleanupContainerStyles = () => {
    if (!container) return;
    container.style.opacity = '';
    container.style.transform = '';
    container.style.filter = '';
    container.style.willChange = '';
  };

  const stopAnimation = () => {
    if (currentAnimation) {
      currentAnimation.cancel();
      currentAnimation = null;
    }
  };

  const updateContainer = (isReady, { animate = true } = {}) => {
    if (!container) {
      return;
    }

    stopAnimation();

    if (!isReady) {
      container.dataset.state = 'pending';
      container.hidden = true;
      cleanupContainerStyles();
      return;
    }

    container.hidden = false;
    container.dataset.state = 'ready';

    if (!animate || prefersReducedMotion() || typeof container.animate !== 'function') {
      cleanupContainerStyles();
      return;
    }

    cleanupContainerStyles();
    container.style.willChange = 'opacity, transform, filter';
    currentAnimation = container.animate(
      [
        { opacity: 0, transform: 'translateY(-8px)', filter: 'blur(2px)' },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }
      ],
      { duration: 260, easing: 'cubic-bezier(0.2, 0, 0, 1)' }
    );

    currentAnimation.onfinish = () => {
      cleanupContainerStyles();
      currentAnimation = null;
    };
    currentAnimation.oncancel = () => {
      cleanupContainerStyles();
      currentAnimation = null;
    };
  };

  const setReady = (isReady, { animate = true } = {}) => {
    readyState = Boolean(isReady);
    setButtonState(!readyState);
    updateContainer(readyState, { animate });
  };

  setReady(false, { animate: false });

  return {
    setReady,
    isReady: () => readyState
  };
}
