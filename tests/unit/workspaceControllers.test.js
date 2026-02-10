import { createFocusTimerController } from '../../src/core/data/services/focusTimerController.js';
import { createGithubWizardController } from '../../src/app/workspaces/shared/data/services/githubWizardController.js';

/**
 * Builds a minimal set of elements required by the focus timer controller.
 * @param {string} prefix Unique prefix for element identification.
 * @returns {{ state: { remaining: number, interval: null, notes: string }, saveButton: HTMLButtonElement, controller: ReturnType<typeof createFocusTimerController> }}
 */
function createFocusHarness(prefix) {
    const saveButton = document.createElement('button');
    saveButton.id = `${prefix}-save`;
    const notesField = document.createElement('textarea');
    notesField.id = `${prefix}-notes`;
    const timer = document.createElement('div');
    timer.id = `${prefix}-timer`;
    const state = { remaining: 1500, interval: null, notes: '' };
    const controller = createFocusTimerController({
        storageKey: `${prefix}Note`,
        durationSeconds: 1500,
        state,
        elementGetters: {
            focusSave: () => saveButton,
            focusNotesField: () => notesField,
            focusTimer: () => timer
        }
    });
    return { state, saveButton, controller };
}

/**
 * Constructs a wizard harness for validating step transitions.
 * @param {string} prefix Identifier used to namespace elements.
 * @returns {{ state: { index: number }, elements: { backButton: HTMLButtonElement, nextButton: HTMLButtonElement, stepper: HTMLInputElement, openButton: HTMLButtonElement }, controller: ReturnType<typeof createGithubWizardController> }}
 */
function createWizardHarness(prefix) {
    const openButton = document.createElement('button');
    const backButton = document.createElement('button');
    const nextButton = document.createElement('button');
    const targetSelect = document.createElement('select');
    const stepper = document.createElement('input');
    stepper.id = `${prefix}-stepper`;
    const state = { index: 0 };
    const controller = createGithubWizardController({
        steps: ['authenticate', 'target', 'review'],
        state,
        elementGetters: {
            openButton: () => openButton,
            backButton: () => backButton,
            nextButton: () => nextButton,
            targetSelect: () => targetSelect,
            stepper: () => stepper
        },
        onStepChange: (index) => {
            state.index = index;
        },
        onNext: (index) => {
            if (index >= 2) {
                return false;
            }
            return index + 1;
        },
        onBack: (index) => Math.max(index - 1, 0),
        onTargetChange: () => targetSelect.dispatchEvent(new Event('cleared'))
    });

    return { state, elements: { openButton, backButton, nextButton, stepper }, controller };
}

describe('focusTimerController', () => {
    const originalSessionStorage = global.sessionStorage;

    afterEach(() => {
        Object.defineProperty(global, 'sessionStorage', {
            value: originalSessionStorage,
            configurable: true
        });
        jest.useRealTimers();
    });

    test('disables save when sessionStorage throws for both workspaces', () => {
        const throwingStorage = {
            setItem: () => {
                throw new Error('denied');
            },
            removeItem: () => {}
        };
        Object.defineProperty(global, 'sessionStorage', {
            value: throwingStorage,
            configurable: true
        });

        const androidHarness = createFocusHarness('android');
        const englishHarness = createFocusHarness('english');

        expect(androidHarness.controller.probeSessionStorage()).toBe(false);
        expect(englishHarness.controller.probeSessionStorage()).toBe(false);
        expect(androidHarness.saveButton.disabled).toBe(true);
        expect(englishHarness.saveButton.disabled).toBe(true);
    });
});

describe('githubWizardController', () => {
    test('advances and rewinds steps consistently across workspaces', async () => {
        const androidWizard = createWizardHarness('android');
        const englishWizard = createWizardHarness('english');

        [androidWizard, englishWizard].forEach((harness) => harness.controller.wire());

        androidWizard.elements.openButton.click();
        englishWizard.elements.openButton.click();
        expect(androidWizard.state.index).toBe(0);
        expect(englishWizard.state.index).toBe(0);
        expect(androidWizard.elements.stepper.value).toBe('authenticate');
        expect(englishWizard.elements.stepper.value).toBe('authenticate');

        androidWizard.elements.nextButton.click();
        englishWizard.elements.nextButton.click();
        await Promise.resolve();
        expect(androidWizard.state.index).toBe(1);
        expect(englishWizard.state.index).toBe(1);
        expect(androidWizard.elements.stepper.value).toBe('target');
        expect(englishWizard.elements.stepper.value).toBe('target');

        androidWizard.elements.nextButton.click();
        englishWizard.elements.nextButton.click();
        await Promise.resolve();
        expect(androidWizard.state.index).toBe(2);
        expect(englishWizard.state.index).toBe(2);
        expect(androidWizard.elements.stepper.value).toBe('review');
        expect(englishWizard.elements.stepper.value).toBe('review');
        expect(androidWizard.elements.nextButton.textContent).toBe('Publish');
        expect(englishWizard.elements.nextButton.textContent).toBe('Publish');

        androidWizard.elements.backButton.click();
        englishWizard.elements.backButton.click();
        expect(androidWizard.state.index).toBe(1);
        expect(englishWizard.state.index).toBe(1);
    });
});
