/**
 * Creates a reusable GitHub wizard controller that wires stepper controls.
 * @param {Object} options Controller configuration.
 * @param {string[]} options.steps Ordered list of step identifiers for the stepper element.
 * @param {{ index: number }} options.state Mutable state holder for the current step index.
 * @param {Object<string, function(): HTMLElement | null>} options.elementGetters Element lookup callbacks keyed by control name.
 * @param {(index: number) => void} [options.onStepChange] Callback executed whenever the step changes.
 * @param {() => void} [options.onOpen] Hook invoked when the wizard is opened.
 * @param {(index: number) => number | boolean | Promise<number | boolean>} [options.onNext]
 * Callback invoked before advancing. Returning `false` prevents automatic step changes; returning a number sets the next index.
 * @param {(index: number) => number | void} [options.onBack] Callback invoked before moving backward. Returning a number overrides the back target.
 * @param {() => void} [options.onTargetChange] Callback invoked when the target selector changes.
 * @returns {{
 *   wire: () => void,
 *   setStep: (index: number) => void,
 *   getStep: () => number
 * }}
 */
export function createGithubWizardController({
    steps,
    state,
    elementGetters,
    onStepChange = () => {},
    onOpen = () => {},
    onNext = () => {},
    onBack = () => {},
    onTargetChange = () => {}
}) {
    const getElements = () => ({
        openButton: elementGetters?.openButton?.() || null,
        dialog: elementGetters?.dialog?.() || null,
        backButton: elementGetters?.backButton?.() || null,
        nextButton: elementGetters?.nextButton?.() || null,
        targetSelect: elementGetters?.targetSelect?.() || null,
        stepper: elementGetters?.stepper?.() || null
    });

    const setStep = (index) => {
        const clamped = Math.max(0, Math.min(index, steps.length - 1));
        state.index = clamped;
        const { stepper, backButton, nextButton } = getElements();
        if (stepper) {
            stepper.value = steps[clamped];
        }
        if (backButton) {
            backButton.disabled = clamped === 0;
        }
        if (nextButton) {
            nextButton.textContent = clamped === steps.length - 1 ? 'Publish' : 'Next';
        }
        onStepChange(clamped);
    };

    const getStep = () => state.index || 0;

    const handleOpen = () => {
        const { dialog } = getElements();
        setStep(0);
        onOpen();
        if (dialog) {
            dialog.open = true;
        }
    };

    const handleBack = () => {
        const override = onBack(getStep());
        if (typeof override === 'number') {
            setStep(override);
            return;
        }
        setStep(Math.max(0, getStep() - 1));
    };

    const handleNext = async () => {
        const directive = await onNext(getStep());
        if (directive === false) {
            return;
        }
        if (typeof directive === 'number') {
            setStep(directive);
            return;
        }
        if (getStep() < steps.length - 1) {
            setStep(getStep() + 1);
        }
    };

    const wire = () => {
        const { openButton, backButton, nextButton, targetSelect } = getElements();
        if (openButton && !openButton.dataset.wired) {
            openButton.addEventListener('click', () => handleOpen());
            openButton.dataset.wired = 'true';
        }
        if (backButton && !backButton.dataset.wired) {
            backButton.addEventListener('click', () => handleBack());
            backButton.dataset.wired = 'true';
        }
        if (nextButton && !nextButton.dataset.wired) {
            nextButton.addEventListener('click', () => {
                void handleNext();
            });
            nextButton.dataset.wired = 'true';
        }
        if (targetSelect && !targetSelect.dataset.wired) {
            targetSelect.addEventListener('change', () => onTargetChange());
            targetSelect.dataset.wired = 'true';
        }
    };

    return { wire, setStep, getStep };
}
