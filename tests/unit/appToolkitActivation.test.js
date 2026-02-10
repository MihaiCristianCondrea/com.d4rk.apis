/**
 * @file Jest coverage for the App Toolkit workspace activation controller.
 *
 * Change Rationale: The App Toolkit feature was normalized to the canonical
 * `app/workspaces/app-toolkit` directory so tests follow the same feature
 * structure used across the application.
 */
const {
  createWorkspaceActivationController,
} = require('../../src/app/workspaces/app-toolkit/domain/workspaceActivationController.js');

/**
 * Verifies the activation controller keeps buttons disabled until ready.
 *
 * @returns {void}
 */
const shouldDisableUntilReady = () => {
  const container = document.createElement('div');
  const addButton = document.createElement('button');
  const sortButton = document.createElement('button');
  const resetButton = document.createElement('button');

  const controller = createWorkspaceActivationController({
    container,
    buttons: [addButton, sortButton, resetButton],
    prefersReducedMotion: () => true,
  });

  expect(container.hidden).toBe(true);
  [addButton, sortButton, resetButton].forEach((button) => {
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  controller.setReady(true, { animate: false });

  expect(container.hidden).toBe(false);
  expect(container.dataset.state).toBe('ready');
  [addButton, sortButton, resetButton].forEach((button) => {
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('false');
  });
};

/**
 * Verifies the activation controller plays reveal animations when allowed.
 *
 * @returns {void}
 */
const shouldAnimateReveal = () => {
  const container = document.createElement('div');
  const cancel = jest.fn();
  const animate = jest.fn(() => ({ cancel }));
  container.animate = animate;

  const controller = createWorkspaceActivationController({
    container,
    buttons: [],
    prefersReducedMotion: () => false,
  });

  controller.setReady(true, { animate: true });

  expect(container.hidden).toBe(false);
  expect(animate).toHaveBeenCalledTimes(1);
  const keyframes = animate.mock.calls[0][0];
  expect(keyframes[0].opacity).toBe(0);
  expect(keyframes[1].opacity).toBe(1);

  controller.setReady(false, { animate: false });
  expect(cancel).toHaveBeenCalledTimes(1);
};

describe('workspaceActivationController', () => {
  test('keeps builder controls disabled until the workspace is marked ready', shouldDisableUntilReady);

  test('triggers a reveal animation when motion is allowed', shouldAnimateReveal);
});
