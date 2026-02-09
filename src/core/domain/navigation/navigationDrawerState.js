/**
 * @file Pure navigation drawer state transitions.
 */

/**
 * Creates a normalized drawer state model.
 *
 * @param {{ isOpen?: boolean, sections?: Record<string, boolean> }} [input]
 * @returns {{ isOpen: boolean, sections: Record<string, boolean> }}
 */
export function createDrawerState(input = {}) {
  return {
    isOpen: Boolean(input.isOpen),
    sections: { ...(input.sections || {}) },
  };
}

/**
 * Returns next state for opening the drawer.
 *
 * @param {{ isOpen: boolean, sections: Record<string, boolean> }} state
 * @returns {{ isOpen: boolean, sections: Record<string, boolean> }}
 */
export function openDrawerState(state) {
  return { ...state, isOpen: true };
}

/**
 * Returns next state for closing the drawer.
 *
 * @param {{ isOpen: boolean, sections: Record<string, boolean> }} state
 * @returns {{ isOpen: boolean, sections: Record<string, boolean> }}
 */
export function closeDrawerState(state) {
  return { ...state, isOpen: false };
}

/**
 * Sets expansion state for a named section.
 *
 * @param {{ isOpen: boolean, sections: Record<string, boolean> }} state
 * @param {string} sectionKey
 * @param {boolean} expanded
 * @returns {{ isOpen: boolean, sections: Record<string, boolean> }}
 */
export function setSectionExpandedState(state, sectionKey, expanded) {
  return {
    ...state,
    sections: {
      ...state.sections,
      [sectionKey]: Boolean(expanded),
    },
  };
}
