/**
 * Global context used by this module.
 *
 * In a browser this resolves to `window`, otherwise it falls back to `globalThis`.
 * This allows the module to be imported in non-DOM environments without crashing.
 *
 * @type {Window & typeof globalThis}
 */
const globalContext = typeof window !== 'undefined' ? window : globalThis;

/**
 * Default easing curve for fade-out transitions when no site-level override is available.
 *
 * Matches Material-style "accelerate" motion.
 *
 * @type {string}
 */
const FADE_OUT_EASING_FALLBACK = 'cubic-bezier(0.4, 0, 1, 1)';

/**
 * Default easing curve for fade-in transitions when no site-level override is available.
 *
 * Matches Material-style "decelerate" motion.
 *
 * @type {string}
 */
const FADE_IN_EASING_FALLBACK = 'cubic-bezier(0, 0, 0.2, 1)';

/**
 * Optional site-wide animation configuration.
 *
 * This shape is inferred from how the module reads `globalContext.SiteAnimations`.
 * Only the fields used here are documented.
 *
 * @typedef {Object} SiteAnimationsConfig
 * @property {Record<string, string>} [fallbacks] Map of easing keys to fallback curves.
 * @property {Record<string, string>} [easings] Map of easing keys to preferred curves.
 * @property {(preferred: string | undefined, fallback: string | undefined) => string} [resolveEasing]
 *   Resolves the final easing curve to use.
 * @property {(options: { type: 'effect', speed: string }) => {
 *   duration?: number,
 *   reducedDuration?: number,
 *   easing?: string,
 *   fallbackEasing?: string
 * } | null} [getMotionSpec] Returns a motion spec for a given context.
 * @property {() => { windowSize?: 'expanded' | string } | null} [getMotionContext]
 *   Returns contextual information (such as window size) for motion decisions.
 * @property {() => boolean} [canAnimate] Returns `false` when WAAPI should not be used.
 * @property {() => boolean} [shouldReduceMotion] Returns `true` when reduced motion is preferred.
 * @property {(direction: 'in' | 'out') => Keyframe[] | null} [createPageTransitionKeyframes]
 *   Creates keyframes for page transitions.
 */

/**
 * Resolves an easing curve for router animations from the global SiteAnimations configuration.
 *
 * Behavior:
 * - If `SiteAnimations` is present:
 *   - Look up a preferred easing in `SiteAnimations.easings[easingKey]`.
 *   - Look up a fallback in `SiteAnimations.fallbacks[easingKey]`, falling back to the
 *     provided `fallback` argument.
 *   - If `resolveEasing` is provided, delegate to it; otherwise return the fallback.
 * - If `SiteAnimations` is not present, returns the provided `fallback`.
 *
 * This function never throws and always returns a string.
 *
 * @param {string} easingKey Logical easing key (e.g. `"accelerate"`, `"decelerate"`).
 * @param {string} fallback Fallback CSS easing curve.
 * @returns {string} Resolved easing curve to use for the animation.
 */
function resolveRouterEasing(easingKey, fallback) {
    /** @type {SiteAnimationsConfig | undefined} */
    const siteAnimations = globalContext.SiteAnimations;
    if (siteAnimations) {
        const fallbacks = siteAnimations.fallbacks || {};
        const preferred = siteAnimations.easings && siteAnimations.easings[easingKey];
        const effectiveFallback = fallbacks[easingKey] || fallback;
        if (typeof siteAnimations.resolveEasing === 'function') {
            return siteAnimations.resolveEasing(preferred, effectiveFallback);
        }
        return effectiveFallback;
    }
    return fallback;
}

/**
 * Reads an upper bound for reduced-motion animation durations from CSS.
 *
 * It looks up the `--app-motion-reduced-duration` custom property on
 * `document.documentElement` and interprets the value as either:
 * - Milliseconds (e.g. `"200"`, `"200ms"`)
 * - Seconds (e.g. `"0.2s"`), which are converted to milliseconds
 *
 * If any part of this lookup fails or the value is invalid, `defaultValue`
 * is returned unchanged.
 *
 * @param {number} defaultValue Duration in milliseconds used as fallback.
 * @returns {number} Effective duration cap in milliseconds.
 */
function getReducedDurationCap(defaultValue) {
    const doc = globalContext.document;
    if (!doc || !doc.documentElement || typeof globalContext.getComputedStyle !== 'function') {
        return defaultValue;
    }

    const value = globalContext
        .getComputedStyle(doc.documentElement)
        .getPropertyValue('--app-motion-reduced-duration');
    if (!value) {
        return defaultValue;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return defaultValue;
    }

    let parsed = parseFloat(trimmed);
    if (!Number.isFinite(parsed)) {
        return defaultValue;
    }

    if (trimmed.endsWith('s') && !trimmed.endsWith('ms')) {
        parsed *= 1000;
    }

    return parsed;
}

/**
 * Resolves a logical transition speed based on direction and motion context.
 *
 * Rules:
 * - For fade out:
 *   - `"expanded"` window size ⇒ `"default"`
 *   - Other sizes ⇒ `"fast"`
 * - For fade in:
 *   - `"expanded"` window size ⇒ `"slow"`
 *   - Other sizes ⇒ `"default"`
 *
 * This speed key is passed into `SiteAnimations.getMotionSpec` to obtain a
 * concrete duration profile.
 *
 * @param {'in'|'out'} direction Direction of the transition.
 * @param {{ windowSize?: string } | null | undefined} context Optional motion context.
 * @returns {'fast'|'slow'|'default'} Resolved speed category.
 */
function resolveTransitionSpeed(direction, context) {
    const windowSize = context && context.windowSize;
    if (direction === 'out') {
        if (windowSize === 'expanded') {
            return 'default';
        }
        return 'fast';
    }
    if (windowSize === 'expanded') {
        return 'slow';
    }
    return 'default';
}

/**
 * Creates a timing configuration object for fade transitions.
 *
 * Behavior:
 * - Starts from default values:
 *   - Fade out: duration ~220ms
 *   - Fade in: duration ~360ms
 *   - `reducedDuration` default: 200ms
 *   - Easing: resolved via {@link resolveRouterEasing} (`accelerate` for out,
 *     `decelerate` for in), falling back to the module constants.
 * - If `SiteAnimations.getMotionSpec` is available:
 *   - Uses the `type: 'effect'` spec with a speed derived from
 *     {@link resolveTransitionSpeed}.
 *   - Overrides `duration`, `reducedDuration`, and easing when provided.
 *
 * The returned object includes:
 * - `duration`: number (ms)
 * - `easing`: string (CSS timing function)
 * - `fill`: `"both"` (for WAAPI)
 * - `reducedDuration`: number (ms), used later for reduced-motion handling.
 *
 * @param {'in'|'out'} direction Direction of the fade transition.
 * @returns {{ duration: number, easing: string, fill: 'both', reducedDuration: number }} Timing config.
 */
function createFadeTiming(direction) {
    const fallback = direction === 'out' ? FADE_OUT_EASING_FALLBACK : FADE_IN_EASING_FALLBACK;
    const fallbackResolved = resolveRouterEasing(
        direction === 'out' ? 'accelerate' : 'decelerate',
        fallback
    );

    let duration = direction === 'out' ? 220 : 360;
    let reducedDuration = 200;
    let easing = fallbackResolved;

    /** @type {SiteAnimationsConfig | undefined} */
    const siteAnimations = globalContext.SiteAnimations;
    if (siteAnimations && typeof siteAnimations.getMotionSpec === 'function') {
        const context = typeof siteAnimations.getMotionContext === 'function'
            ? siteAnimations.getMotionContext()
            : null;
        const speed = resolveTransitionSpeed(direction, context);
        const spec = siteAnimations.getMotionSpec({ type: 'effect', speed });

        if (spec) {
            if (typeof spec.duration === 'number') {
                duration = spec.duration;
            }
            if (typeof spec.reducedDuration === 'number') {
                reducedDuration = spec.reducedDuration;
            }

            const preferred = spec.easing;
            const fallbackEasing = spec.fallbackEasing || fallbackResolved;

            if (typeof siteAnimations.resolveEasing === 'function') {
                easing = siteAnimations.resolveEasing(preferred, fallbackEasing);
            } else if (preferred || fallbackEasing) {
                easing = preferred || fallbackEasing;
            }
        }
    }

    return {
        duration,
        easing,
        fill: 'both',
        reducedDuration
    };
}

/**
 * Lazily creates timing configuration for fade-out transitions.
 *
 * Wrapped in a function so callers always receive a fresh timing object.
 *
 * @returns {{ duration: number, easing: string, fill: 'both', reducedDuration: number }}
 */
const defaultFadeOutTiming = () => createFadeTiming('out');

/**
 * Lazily creates timing configuration for fade-in transitions.
 *
 * Wrapped in a function so callers always receive a fresh timing object.
 *
 * @returns {{ duration: number, easing: string, fill: 'both', reducedDuration: number }}
 */
const defaultFadeInTiming = () => createFadeTiming('in');

/**
 * Builds keyframes for page transition fades.
 *
 * Behavior:
 * - If `SiteAnimations.createPageTransitionKeyframes` is present and returns
 *   an array with at least two entries, those keyframes are used.
 * - Otherwise, falls back to simple opacity-based keyframes:
 *   - Fade out: `{ opacity: 1 } → { opacity: 0 }`
 *   - Fade in: `{ opacity: 0 } → { opacity: 1 }`
 *
 * @param {'in'|'out'} direction Direction of the transition.
 * @returns {Keyframe[]} Array of keyframes suitable for `element.animate`.
 */
function buildTransitionKeyframes(direction) {
    /** @type {SiteAnimationsConfig | undefined} */
    const siteAnimations = globalContext.SiteAnimations;
    if (siteAnimations && typeof siteAnimations.createPageTransitionKeyframes === 'function') {
        const frames = siteAnimations.createPageTransitionKeyframes(direction);
        if (Array.isArray(frames) && frames.length >= 2) {
            return frames;
        }
    }
    return direction === 'out'
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [{ opacity: 0 }, { opacity: 1 }];
}

/**
 * Prepares an element for animation by applying the first keyframe and
 * capturing its current inline styles for later restoration.
 *
 * It:
 * - Applies `opacity`, `transform`, and `filter` from the first frame when present.
 * - Sets `will-change` to hint to the browser which properties will animate.
 *
 * Returns an object with previous inline values so they can be restored when
 * the animation completes or fails.
 *
 * @param {HTMLElement | null} element Element to prepare.
 * @param {Keyframe[]} frames Keyframes to be applied.
 * @returns {{
 *   opacity: string,
 *   transform: string,
 *   filter: string,
 *   willChange: string
 * } | null} Previous inline style values, or null if the element was not prepared.
 */
function prepareElementForAnimation(element, frames) {
    if (!element || !element.style || !Array.isArray(frames) || frames.length === 0) {
        return null;
    }

    const firstFrame = frames[0];
    const previous = {
        opacity: element.style.opacity,
        transform: element.style.transform,
        filter: element.style.filter,
        willChange: element.style.willChange
    };

    if (firstFrame.opacity !== undefined) {
        element.style.opacity = String(firstFrame.opacity);
    }

    if (firstFrame.transform !== undefined) {
        element.style.transform = firstFrame.transform;
    }

    if (firstFrame.filter !== undefined) {
        element.style.filter = firstFrame.filter;
    }

    element.style.willChange =
        firstFrame.transform !== undefined || firstFrame.filter !== undefined
            ? 'opacity, transform'
            : 'opacity';

    return previous;
}

/**
 * Restores or finalizes the element's inline style after an animation.
 *
 * Behavior:
 * - If `finalOpacity` is a number, it is applied as the final inline opacity.
 * - Otherwise, if `previousStyles` is provided, the original opacity is restored.
 * - `transform`, `filter`, and `willChange` are always restored from
 *   `previousStyles` when available; if not provided, they are cleared.
 *
 * @param {HTMLElement | null} element Element whose styles should be finalized.
 * @param {number | undefined} finalOpacity Final opacity to apply, if any.
 * @param {{
 *   opacity: string,
 *   transform: string,
 *   filter: string,
 *   willChange: string
 * } | null} previousStyles Previously captured inline styles.
 * @returns {void}
 */
function finalizeAnimationState(element, finalOpacity, previousStyles) {
    if (!element || !element.style) {
        return;
    }

    if (typeof finalOpacity === 'number') {
        element.style.opacity = String(finalOpacity);
    } else if (previousStyles && previousStyles.opacity !== undefined) {
        element.style.opacity = previousStyles.opacity;
    }

    if (previousStyles) {
        element.style.transform = previousStyles.transform;
        element.style.filter = previousStyles.filter;
        element.style.willChange = previousStyles.willChange;
    } else {
        element.style.transform = '';
        element.style.filter = '';
        element.style.willChange = '';
    }
}

/**
 * Core fade helper that drives both fade-in and fade-out router transitions.
 *
 * Behavior:
 * - Normalizes keyframes into an array.
 * - Applies the first frame via {@link prepareElementForAnimation}.
 * - Builds the timing configuration from:
 *   - `defaultTiming()` or `defaultTiming` object.
 *   - Optional `overrides`.
 * - If `SiteAnimations.canAnimate` returns false, or `element.animate` is not
 *   available, the animation is skipped and final styles are applied instantly.
 * - If reduced motion is requested (`SiteAnimations.shouldReduceMotion`):
 *   - Duration is capped by {@link getReducedDurationCap} and any
 *     `reducedDuration` from the base timing.
 *   - Easing is forced to a decelerate curve.
 *   - Delay is removed.
 * - When using WAAPI, the returned promise resolves after `animation.finished`
 *   settles (errors are ignored) and styles are finalized.
 *
 * @param {HTMLElement | null} element Element to animate.
 * @param {Keyframe[] | Keyframe} keyframes Keyframes or single keyframe.
 * @param {() => { duration: number, easing: string, fill: string, reducedDuration?: number } | {
 *   duration: number,
 *   easing: string,
 *   fill: string,
 *   reducedDuration?: number
 * }} defaultTiming Default timing (factory or object).
 * @param {KeyframeAnimationOptions | undefined} overrides Optional timing overrides.
 * @param {number | undefined} finalOpacity Final opacity to enforce after animation.
 * @returns {Promise<void>} Promise that resolves when animation effects have been applied.
 */
function performFade(element, keyframes, defaultTiming, overrides, finalOpacity) {
    if (!element) {
        return Promise.resolve();
    }

    const framesArray = Array.isArray(keyframes) ? keyframes : [keyframes];
    if (framesArray.length === 0) {
        if (element.style && typeof finalOpacity === 'number') {
            element.style.opacity = String(finalOpacity);
        }
        return Promise.resolve();
    }

    const previousStyles = prepareElementForAnimation(element, framesArray);

    const baseTiming = typeof defaultTiming === 'function'
        ? defaultTiming()
        : Object.assign({}, defaultTiming);
    const reducedDurationTarget = baseTiming && typeof baseTiming.reducedDuration === 'number'
        ? baseTiming.reducedDuration
        : undefined;

    const timing = Object.assign({}, baseTiming, overrides || {});
    // `reducedDuration` is an internal hint, not part of the WAAPI timing options.
    delete timing.reducedDuration;

    /** @type {SiteAnimationsConfig | undefined} */
    const siteAnimations = globalContext.SiteAnimations;
    const canUseWaapi = !siteAnimations
        || typeof siteAnimations.canAnimate !== 'function'
        || siteAnimations.canAnimate();

    if (!canUseWaapi || typeof element.animate !== 'function') {
        finalizeAnimationState(element, finalOpacity, previousStyles);
        return Promise.resolve();
    }

    const prefersReducedMotion = siteAnimations
        && typeof siteAnimations.shouldReduceMotion === 'function'
        && siteAnimations.shouldReduceMotion();

    if (prefersReducedMotion) {
        const cssCap = getReducedDurationCap(
            typeof reducedDurationTarget === 'number' ? reducedDurationTarget : 200
        );
        const reducedCap = typeof reducedDurationTarget === 'number'
            ? Math.min(cssCap, reducedDurationTarget)
            : cssCap;

        if (typeof timing.duration === 'number') {
            timing.duration = Math.min(timing.duration, reducedCap);
        } else {
            timing.duration = reducedCap;
        }
        timing.easing = resolveRouterEasing('decelerate', FADE_IN_EASING_FALLBACK);
        timing.delay = 0;
    }

    try {
        const animation = element.animate(framesArray, timing);
        return animation.finished
            .catch(() => { /* Ignore animation cancellation errors. */ })
            .finally(() => {
                finalizeAnimationState(element, finalOpacity, previousStyles);
            });
    } catch (error) {
        finalizeAnimationState(element, finalOpacity, previousStyles);
        return Promise.resolve();
    }
}

/**
 * Fades an element out to opacity 0 using the router fade-out motion spec.
 *
 * This is a convenience wrapper over {@link performFade} with:
 * - Outgoing keyframes (`buildTransitionKeyframes('out')`).
 * - Default fade-out timing (`defaultFadeOutTiming`).
 * - Final opacity set to `0`.
 *
 * @param {HTMLElement | null} element Element to fade out.
 * @param {KeyframeAnimationOptions} [timingOverrides] Optional timing overrides.
 * @returns {Promise<void>} Promise resolving when the fade-out has completed or been skipped.
 */
function fadeOut(element, timingOverrides) {
    return performFade(
        element,
        buildTransitionKeyframes('out'),
        defaultFadeOutTiming,
        timingOverrides,
        0
    );
}

/**
 * Fades an element in to opacity 1 using the router fade-in motion spec.
 *
 * This is a convenience wrapper over {@link performFade} with:
 * - Incoming keyframes (`buildTransitionKeyframes('in')`).
 * - Default fade-in timing (`defaultFadeInTiming`).
 * - Final opacity set to `1`.
 *
 * @param {HTMLElement | null} element Element to fade in.
 * @param {KeyframeAnimationOptions} [timingOverrides] Optional timing overrides.
 * @returns {Promise<void>} Promise resolving when the fade-in has completed or been skipped.
 */
function fadeIn(element, timingOverrides) {
    return performFade(
        element,
        buildTransitionKeyframes('in'),
        defaultFadeInTiming,
        timingOverrides,
        1
    );
}

/**
 * Router animation helpers exposed as a small namespace object.
 *
 * This mirrors the most common usage pattern: `RouterAnimation.fadeIn(...)`
 * and `RouterAnimation.fadeOut(...)`.
 *
 * @type {{ fadeIn: typeof fadeIn, fadeOut: typeof fadeOut }}
 */
const RouterAnimation = {
    fadeIn,
    fadeOut
};

export default RouterAnimation;
export { RouterAnimation, fadeIn, fadeOut };
