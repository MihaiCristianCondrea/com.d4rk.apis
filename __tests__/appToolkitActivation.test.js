const {
  createWorkspaceActivationController,
} = require('../app/src/main/js/app/workspaces/appToolkit/domain/workspaceActivationController.js');

describe('workspaceActivationController', () => {
  test('keeps builder controls disabled until the workspace is marked ready', () => {
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
  });

  test('triggers a reveal animation when motion is allowed', () => {
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
  });
});
