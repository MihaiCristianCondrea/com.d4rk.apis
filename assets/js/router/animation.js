(function (global) {
    const FADE_OUT_EASING_FALLBACK = 'cubic-bezier(0.4, 0, 1, 1)';
    const FADE_IN_EASING_FALLBACK = 'cubic-bezier(0, 0, 0.2, 1)';

    function resolveRouterEasing(easingKey, fallback) {
        const siteAnimations = global.SiteAnimations;
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

    function getReducedDurationCap(defaultValue) {
        const doc = global.document;
        if (!doc || !doc.documentElement || typeof global.getComputedStyle !== 'function') {
            return defaultValue;
        }

        const value = global.getComputedStyle(doc.documentElement).getPropertyValue('--app-motion-reduced-duration');
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

    function createFadeTiming(direction) {
        const fallback = direction === 'out' ? FADE_OUT_EASING_FALLBACK : FADE_IN_EASING_FALLBACK;
        const fallbackResolved = resolveRouterEasing(direction === 'out' ? 'accelerate' : 'decelerate', fallback);

        let duration = direction === 'out' ? 220 : 360;
        let reducedDuration = 200;
        let easing = fallbackResolved;

        const siteAnimations = global.SiteAnimations;
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

    const defaultFadeOutTiming = () => createFadeTiming('out');
    const defaultFadeInTiming = () => createFadeTiming('in');

    function buildTransitionKeyframes(direction) {
        const siteAnimations = global.SiteAnimations;
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

        element.style.willChange = firstFrame.transform !== undefined || firstFrame.filter !== undefined
            ? 'opacity, transform'
            : 'opacity';

        return previous;
    }

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
        delete timing.reducedDuration;

        const siteAnimations = global.SiteAnimations;
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
            const cssCap = getReducedDurationCap(typeof reducedDurationTarget === 'number' ? reducedDurationTarget : 200);
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
                .catch(() => { })
                .finally(() => {
                    finalizeAnimationState(element, finalOpacity, previousStyles);
                });
        } catch (error) {
            finalizeAnimationState(element, finalOpacity, previousStyles);
            return Promise.resolve();
        }
    }

    function fadeOut(element, timingOverrides) {
        return performFade(
            element,
            buildTransitionKeyframes('out'),
            defaultFadeOutTiming,
            timingOverrides,
            0
        );
    }

    function fadeIn(element, timingOverrides) {
        return performFade(
            element,
            buildTransitionKeyframes('in'),
            defaultFadeInTiming,
            timingOverrides,
            1
        );
    }

    global.RouterAnimation = {
        fadeIn,
        fadeOut
    };
})(typeof window !== 'undefined' ? window : globalThis);
