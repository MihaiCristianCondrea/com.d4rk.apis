/**
 * Creates a focus timer controller that manages shared focus workflow behaviors.
 * @param {Object} options Configuration for the controller.
 * @param {string} options.storageKey The key used to persist notes in sessionStorage.
 * @param {number} options.durationSeconds The total session duration in seconds.
 * @param {{ remaining: number, interval: number | null, notes: string }} options.state Mutable state holder shared with the workspace.
 * @param {Object<string, function(): HTMLElement | null>} options.elementGetters Map of element getters keyed by semantic name.
 * @param {() => void} [options.onTimerComplete] Optional callback fired when the timer reaches zero.
 * @returns {{
 *   state: { remaining: number, interval: number | null, notes: string },
 *   probeSessionStorage: () => boolean,
 *   restoreNotes: () => void,
 *   wireControls: () => void,
 *   openDialog: (params?: { autoStart?: boolean }) => void,
 *   start: () => void,
 *   pause: () => void,
 *   reset: () => void,
 *   updateNoteIndicator: () => void
 * }}
 */
export function createFocusTimerController({
    storageKey,
    durationSeconds,
    state,
    elementGetters,
    onTimerComplete = () => {}
}) {
    let sessionStorageAvailable = false;

    const getElements = () => ({
        focusButton: elementGetters?.focusButton?.() || null,
        notesButton: elementGetters?.notesButton?.() || null,
        focusDialog: elementGetters?.focusDialog?.() || null,
        focusTimer: elementGetters?.focusTimer?.() || null,
        focusStart: elementGetters?.focusStart?.() || null,
        focusPause: elementGetters?.focusPause?.() || null,
        focusReset: elementGetters?.focusReset?.() || null,
        focusSave: elementGetters?.focusSave?.() || null,
        focusChecklist: elementGetters?.focusChecklist?.() || null,
        focusNotesField: elementGetters?.focusNotesField?.() || null
    });

    const updateTimerDisplay = () => {
        const { focusTimer } = getElements();
        if (!focusTimer) {
            return;
        }
        const remaining = Math.max(state.remaining, 0);
        const minutes = Math.floor(remaining / 60)
            .toString()
            .padStart(2, '0');
        const seconds = (remaining % 60).toString().padStart(2, '0');
        focusTimer.textContent = `${minutes}:${seconds}`;
    };

    const updateControls = () => {
        const { focusStart, focusPause } = getElements();
        const running = Boolean(state.interval);
        if (focusStart) {
            focusStart.disabled = running;
        }
        if (focusPause) {
            focusPause.disabled = !running;
        }
    };

    const persistNotes = (value) => {
        if (!sessionStorageAvailable) {
            return;
        }
        try {
            sessionStorage.setItem(storageKey, value);
        } catch (error) {
            // Ignore storage errors to keep UX responsive.
        }
    };

    const updateNoteIndicator = () => {
        const { notesButton } = getElements();
        if (!notesButton) {
            return;
        }
        if (state.notes && state.notes.trim()) {
            notesButton.dataset.noteState = 'saved';
        } else {
            delete notesButton.dataset.noteState;
        }
    };

    const render = () => {
        updateTimerDisplay();
        updateControls();
        updateNoteIndicator();
    };

    const pause = () => {
        if (state.interval) {
            clearInterval(state.interval);
            state.interval = null;
        }
        render();
    };

    const reset = () => {
        pause();
        state.remaining = durationSeconds;
        render();
    };

    const start = () => {
        if (state.interval) {
            return;
        }
        if (state.remaining <= 0) {
            state.remaining = durationSeconds;
        }
        state.interval = setInterval(() => {
            state.remaining -= 1;
            if (state.remaining <= 0) {
                state.remaining = 0;
                pause();
                onTimerComplete();
            }
            render();
        }, 1000);
        render();
    };

    const openDialog = ({ autoStart = false } = {}) => {
        const { focusDialog, focusNotesField } = getElements();
        if (!focusDialog) {
            return;
        }
        focusDialog.open = true;
        if (focusNotesField) {
            focusNotesField.value = state.notes || '';
        }
        if (autoStart) {
            reset();
            start();
        } else {
            render();
        }
    };

    const handleSave = () => {
        const { focusNotesField, focusSave } = getElements();
        const value = focusNotesField ? focusNotesField.value || '' : '';
        state.notes = value;
        persistNotes(value);
        updateNoteIndicator();
        if (focusSave) {
            focusSave.dataset.flashState = 'saved';
            setTimeout(() => delete focusSave.dataset.flashState, 750);
        }
    };

    const wireControls = () => {
        const {
            focusButton,
            notesButton,
            focusDialog,
            focusStart,
            focusPause,
            focusReset,
            focusSave,
            focusNotesField
        } = getElements();
        if (focusButton && !focusButton.dataset.wired) {
            focusButton.addEventListener('click', () => openDialog({ autoStart: true }));
            focusButton.dataset.wired = 'true';
        }
        if (notesButton && !notesButton.dataset.wired) {
            notesButton.addEventListener('click', () => openDialog({ autoStart: false }));
            notesButton.dataset.wired = 'true';
        }
        if (focusStart && !focusStart.dataset.wired) {
            focusStart.addEventListener('click', () => start());
            focusStart.dataset.wired = 'true';
        }
        if (focusPause && !focusPause.dataset.wired) {
            focusPause.addEventListener('click', () => pause());
            focusPause.dataset.wired = 'true';
        }
        if (focusReset && !focusReset.dataset.wired) {
            focusReset.addEventListener('click', () => reset());
            focusReset.dataset.wired = 'true';
        }
        if (focusSave && !focusSave.dataset.wired) {
            focusSave.addEventListener('click', () => handleSave());
            focusSave.dataset.wired = 'true';
        }
        if (focusDialog && !focusDialog.dataset.focusInit) {
            focusDialog.addEventListener('close', () => pause());
            focusDialog.dataset.focusInit = 'true';
        }
        if (focusNotesField && !focusNotesField.dataset.wired) {
            focusNotesField.addEventListener('input', () => {
                state.notes = focusNotesField.value || '';
            });
            focusNotesField.dataset.wired = 'true';
        }
    };

    const probeSessionStorage = () => {
        if (sessionStorageAvailable) {
            return sessionStorageAvailable;
        }
        if (typeof sessionStorage === 'undefined') {
            return false;
        }
        try {
            const probeKey = `${storageKey}__probe`;
            sessionStorage.setItem(probeKey, '1');
            sessionStorage.removeItem(probeKey);
            sessionStorageAvailable = true;
        } catch (error) {
            sessionStorageAvailable = false;
        }
        const { focusSave } = getElements();
        if (!sessionStorageAvailable && focusSave) {
            focusSave.disabled = true;
        }
        return sessionStorageAvailable;
    };

    const restoreNotes = () => {
        if (!probeSessionStorage()) {
            return;
        }
        try {
            state.notes = sessionStorage.getItem(storageKey) || '';
        } catch (error) {
            state.notes = '';
        }
        const { focusNotesField } = getElements();
        if (focusNotesField) {
            focusNotesField.value = state.notes;
        }
        updateNoteIndicator();
    };

    return {
        state,
        probeSessionStorage,
        restoreNotes,
        wireControls,
        openDialog,
        start,
        pause,
        reset,
        updateNoteIndicator
    };
}
