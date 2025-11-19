(function (global) {
    const utils = global.ApiBuilderUtils;
    if (!utils) {
        console.error('AndroidStudioTutorials: ApiBuilderUtils is required.');
        return;
    }

    const HOME_FILENAME = 'android_home.json';
    const LESSON_FILENAME = 'android_lesson.json';
    const HOME_TYPE_HINT =
        'Suggested: full_banner, square_image, ad_view_banner_large, ad_view_banner, ad_view_native';
    const BLOCK_TYPE_HINT =
        'Suggested: content_text, header, image, content_code, content_divider, ad_large_banner, ad_banner';
    const MIN_GITHUB_TOKEN_LENGTH = 20;
    const FOCUS_SESSION_DURATION = 25 * 60;
    const FOCUS_STORAGE_KEY = 'androidWorkspaceNote';
    const GITHUB_TARGETS = {
        'home-debug': {
            path: 'api/android_studio_tutorials/v1/debug/en/home/api_get_lessons.json',
            previewKey: 'home'
        },
        'home-release': {
            path: 'api/android_studio_tutorials/v1/release/en/home/api_get_lessons.json',
            previewKey: 'home'
        },
        'lesson-debug': {
            prefix: 'api/android_studio_tutorials/v1/debug/en/lessons/',
            previewKey: 'lesson'
        },
        'lesson-release': {
            prefix: 'api/android_studio_tutorials/v1/release/en/lessons/',
            previewKey: 'lesson'
        }
    };
    const workspace = {
        initialized: false,
        elements: {},
        homeState: null,
        lessonState: null,
        homePreview: '',
        lessonPreview: '',
        homeResult: { success: false, payload: null },
        lessonResult: { success: false, payload: null },
        baseline: { home: '', lesson: '' },
        lastEdited: null,
        focus: {
            remaining: FOCUS_SESSION_DURATION,
            interval: null,
            notes: ''
        },
        githubStepIndex: 0,
        sessionStorageAvailable: false
    };

    const ANDROID_BLOCK_FIELDS = {
        content_text: [
            { key: 'content_text', label: 'Text', type: 'textarea', helperText: 'Supports HTML formatting.' }
        ],
        header: [
            { key: 'content_text', label: 'Header text', type: 'text' }
        ],
        image: [
            { key: 'content_image_url', label: 'Image URL', type: 'url' }
        ],
        content_code: [
            { key: 'content_code_programming_language', label: 'Language', type: 'text', helperText: 'Example: Kotlin, Java, XML' },
            { key: 'content_code', label: 'Code snippet', type: 'textarea', helperText: 'Keep code HTML-escaped.' }
        ],
        ad_large_banner: [],
        ad_banner: [],
        content_divider: []
    };

    function initAndroidTutorialsWorkspace() {
        const workspaceRoot = document.getElementById('androidWorkspace');
        if (!workspaceRoot) {
            return;
        }
        const alreadyInitialized = workspaceRoot.dataset.initialized === 'true';

        cacheWorkspaceElements();
        wireDialogDismissHandlers();
        prepareSessionStorage();
        restoreFocusNotes();
        wireFocusControls();
        wireRemoteFetch();
        wireGithubWizard();
        initHomeBuilder();
        initLessonBuilder();
        updateWorkspaceMetrics();
        updateToolbarPulses();
        updateDiffSheet();
        updateFocusTimerDisplay();
        updateFocusControls();
        workspaceRoot.dataset.initialized = 'true';
        workspace.initialized = true;

        if (!alreadyInitialized) {
            setTimeout(() => {
                updateLastEditedLabel();
            }, 0);
        }
    }

    function cacheWorkspaceElements() {
        workspace.elements = workspace.elements || {};
        const elements = workspace.elements;
        elements.trackedCount = document.getElementById('androidHomeCardCount');
        elements.releaseReadyCount = document.getElementById('androidReleaseReadyCount');
        elements.blockAverage = document.getElementById('androidLessonBlockAverage');
        elements.reviewCount = document.getElementById('androidReviewCount');
        elements.lastEdited = document.getElementById('androidLastEdited');
        elements.workspacePulse = document.getElementById('androidWorkspacePulse');
        elements.releaseProgress = document.getElementById('androidReleaseProgress');
        elements.homeToolbarPulse = document.getElementById('androidHomeToolbarPulse');
        elements.lessonToolbarPulse = document.getElementById('androidLessonToolbarPulse');
        elements.focusButton = document.getElementById('androidFocusButton');
        elements.notesButton = document.getElementById('androidNotesButton');
        elements.focusDialog = document.getElementById('androidFocusDialog');
        elements.focusTimer = document.getElementById('androidFocusTimer');
        elements.focusStart = document.getElementById('androidFocusStart');
        elements.focusPause = document.getElementById('androidFocusPause');
        elements.focusReset = document.getElementById('androidFocusReset');
        elements.focusSave = document.getElementById('androidFocusSave');
        elements.focusChecklist = document.getElementById('androidFocusChecklist');
        elements.focusNotesField = document.getElementById('androidFocusNotes');
        elements.fetchInput = document.getElementById('androidFetchInput');
        elements.fetchButton = document.getElementById('androidFetchButton');
        elements.fetchTargetSet = document.getElementById('androidFetchTarget');
        elements.fetchPresetButtons = Array.from(
            document.querySelectorAll('[data-android-fetch-preset]')
        );
        elements.diffSheet = document.getElementById('androidDiffSheet');
        elements.diffContent = document.getElementById('androidDiffContent');
        elements.githubWizardButton = document.getElementById('androidGithubWizardButton');
        elements.githubDialog = document.getElementById('androidGithubDialog');
        elements.githubStepper = document.getElementById('androidGithubStepper');
        elements.githubBack = document.getElementById('androidGithubBack');
        elements.githubNext = document.getElementById('androidGithubNext');
        elements.githubToken = document.getElementById('androidGithubToken');
        elements.githubRepo = document.getElementById('androidGithubRepo');
        elements.githubBranch = document.getElementById('androidGithubBranch');
        elements.githubMessage = document.getElementById('androidGithubMessage');
        elements.githubTarget = document.getElementById('androidGithubTarget');
        elements.githubLessonSlug = document.getElementById('androidGithubLessonSlug');
        elements.githubStatus = document.getElementById('androidGithubStatus');
    }

    function wireDialogDismissHandlers() {
        const { focusDialog, githubDialog } = workspace.elements;
        [focusDialog, githubDialog].forEach((dialog) => {
            if (!dialog || dialog.dataset.dialogCloseInit === 'true') {
                return;
            }
            const closeButtons = dialog.querySelectorAll('[dialog-action="close"]');
            closeButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    if (typeof dialog.close === 'function') {
                        dialog.close();
                    } else {
                        dialog.open = false;
                    }
                });
            });
            dialog.dataset.dialogCloseInit = 'true';
        });
    }

    function prepareSessionStorage() {
        if (workspace.sessionStorageAvailable) {
            return;
        }
        if (typeof sessionStorage === 'undefined') {
            return;
        }
        try {
            const probeKey = `${FOCUS_STORAGE_KEY}__probe`;
            sessionStorage.setItem(probeKey, '1');
            sessionStorage.removeItem(probeKey);
            workspace.sessionStorageAvailable = true;
        } catch (error) {
            workspace.sessionStorageAvailable = false;
        }
        if (!workspace.sessionStorageAvailable && workspace.elements.focusSave) {
            workspace.elements.focusSave.disabled = true;
        }
    }

    function restoreFocusNotes() {
        if (!workspace.sessionStorageAvailable) {
            return;
        }
        try {
            workspace.focus.notes = sessionStorage.getItem(FOCUS_STORAGE_KEY) || '';
        } catch (error) {
            workspace.focus.notes = '';
        }
        if (workspace.elements.focusNotesField) {
            workspace.elements.focusNotesField.value = workspace.focus.notes;
        }
        updateNoteIndicator();
    }

    function updateNoteIndicator() {
        const { notesButton } = workspace.elements;
        if (!notesButton) {
            return;
        }
        if (workspace.focus.notes && workspace.focus.notes.trim()) {
            notesButton.dataset.noteState = 'saved';
        } else {
            delete notesButton.dataset.noteState;
        }
    }

    function wireFocusControls() {
        const {
            focusButton,
            notesButton,
            focusDialog,
            focusStart,
            focusPause,
            focusReset,
            focusSave,
            focusNotesField
        } = workspace.elements;
        if (focusButton && !focusButton.dataset.wired) {
            focusButton.addEventListener('click', () => openFocusDialog({ autoStart: true }));
            focusButton.dataset.wired = 'true';
        }
        if (notesButton && !notesButton.dataset.wired) {
            notesButton.addEventListener('click', () => openFocusDialog({ autoStart: false }));
            notesButton.dataset.wired = 'true';
        }
        if (focusStart && !focusStart.dataset.wired) {
            focusStart.addEventListener('click', () => startFocusTimer());
            focusStart.dataset.wired = 'true';
        }
        if (focusPause && !focusPause.dataset.wired) {
            focusPause.addEventListener('click', () => pauseFocusTimer());
            focusPause.dataset.wired = 'true';
        }
        if (focusReset && !focusReset.dataset.wired) {
            focusReset.addEventListener('click', () => resetFocusTimer());
            focusReset.dataset.wired = 'true';
        }
        if (focusSave && !focusSave.dataset.wired) {
            focusSave.addEventListener('click', () => {
                const value = focusNotesField ? focusNotesField.value || '' : '';
                workspace.focus.notes = value;
                if (workspace.sessionStorageAvailable) {
                    try {
                        sessionStorage.setItem(FOCUS_STORAGE_KEY, value);
                    } catch (error) {
                        // ignore storage errors
                    }
                }
                updateNoteIndicator();
                flashButton(
                    focusSave,
                    '<span class="material-symbols-outlined">check</span><span>Saved</span>'
                );
            });
            focusSave.dataset.wired = 'true';
        }
        if (focusDialog && !focusDialog.dataset.focusInit) {
            focusDialog.addEventListener('close', () => pauseFocusTimer());
            focusDialog.dataset.focusInit = 'true';
        }
    }

    function openFocusDialog({ autoStart = false } = {}) {
        const { focusDialog, focusNotesField } = workspace.elements;
        if (!focusDialog) {
            return;
        }
        focusDialog.open = true;
        if (focusNotesField) {
            focusNotesField.value = workspace.focus.notes || '';
        }
        if (autoStart) {
            resetFocusTimer();
            startFocusTimer();
        } else {
            updateFocusTimerDisplay();
            updateFocusControls();
        }
    }

    function startFocusTimer() {
        if (workspace.focus.interval) {
            return;
        }
        if (workspace.focus.remaining <= 0) {
            workspace.focus.remaining = FOCUS_SESSION_DURATION;
        }
        workspace.focus.interval = setInterval(() => {
            workspace.focus.remaining -= 1;
            if (workspace.focus.remaining <= 0) {
                workspace.focus.remaining = 0;
                pauseFocusTimer();
                updateToolbarPulses('focusComplete');
            }
            updateFocusTimerDisplay();
            updateFocusControls();
        }, 1000);
        updateFocusTimerDisplay();
        updateFocusControls();
    }

    function pauseFocusTimer() {
        if (workspace.focus.interval) {
            clearInterval(workspace.focus.interval);
            workspace.focus.interval = null;
        }
        updateFocusControls();
    }

    function resetFocusTimer() {
        pauseFocusTimer();
        workspace.focus.remaining = FOCUS_SESSION_DURATION;
        updateFocusTimerDisplay();
        updateFocusControls();
    }

    function updateFocusTimerDisplay() {
        const { focusTimer } = workspace.elements;
        if (!focusTimer) {
            return;
        }
        const remaining = Math.max(workspace.focus.remaining, 0);
        const minutes = Math.floor(remaining / 60)
            .toString()
            .padStart(2, '0');
        const seconds = (remaining % 60).toString().padStart(2, '0');
        focusTimer.textContent = `${minutes}:${seconds}`;
    }

    function updateFocusControls() {
        const { focusStart, focusPause } = workspace.elements;
        const running = Boolean(workspace.focus.interval);
        if (focusStart) {
            focusStart.disabled = running;
        }
        if (focusPause) {
            focusPause.disabled = !running;
        }
    }

    function wireRemoteFetch() {
        const { fetchButton, fetchPresetButtons, fetchTargetSet } = workspace.elements;
        if (fetchButton && !fetchButton.dataset.wired) {
            fetchButton.addEventListener('click', () => {
                const target = getFetchTarget();
                const url = workspace.elements.fetchInput?.value || '';
                fetchRemotePayload(target, url);
            });
            fetchButton.dataset.wired = 'true';
        }
        if (Array.isArray(fetchPresetButtons)) {
            fetchPresetButtons.forEach((button) => {
                if (!button || button.dataset.wired === 'true') {
                    return;
                }
                button.addEventListener('click', () => {
                    const target = button.dataset.androidFetchTarget || 'home';
                    const url = button.dataset.androidFetchPreset || '';
                    if (workspace.elements.fetchTargetSet) {
                        workspace.elements.fetchTargetSet.value = target;
                    }
                    if (workspace.elements.fetchInput) {
                        workspace.elements.fetchInput.value = url;
                    }
                    fetchRemotePayload(target, url);
                });
                button.dataset.wired = 'true';
            });
        }
        if (fetchTargetSet && !fetchTargetSet.dataset.wired) {
            fetchTargetSet.addEventListener('change', () => updateFetchPlaceholder());
            fetchTargetSet.dataset.wired = 'true';
            updateFetchPlaceholder();
        }
    }

    function getFetchTarget() {
        const { fetchTargetSet } = workspace.elements;
        if (!fetchTargetSet || fetchTargetSet.value === undefined || fetchTargetSet.value === null) {
            return 'home';
        }
        return fetchTargetSet.value || 'home';
    }

    function updateFetchPlaceholder() {
        const { fetchInput } = workspace.elements;
        if (!fetchInput) {
            return;
        }
        const target = getFetchTarget();
        fetchInput.placeholder =
            target === 'lesson'
                ? 'https://example.com/android_lesson.json'
                : 'https://example.com/android_home.json';
    }

    async function fetchRemotePayload(target, url) {
        const trimmed = utils.trimString(url || '');
        const statusElement = target === 'lesson' ? workspace.lessonValidationStatus : workspace.homeValidationStatus;
        if (!trimmed) {
            utils.setValidationStatus(statusElement, {
                status: 'error',
                message: 'Provide a JSON URL to fetch.'
            });
            return;
        }
        try {
            const response = await fetch(trimmed, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }
            const text = await response.text();
            const formatted = utils.prettifyJsonString(text);
            if (target === 'lesson') {
                workspace.lessonImport?.(text);
                workspace.baseline.lesson = formatted;
            } else {
                workspace.homeImport?.(text);
                workspace.baseline.home = formatted;
            }
            utils.setValidationStatus(statusElement, {
                status: 'success',
                message: 'Remote payload loaded successfully.'
            });
            const metrics = updateWorkspaceMetrics();
            updateToolbarPulses();
            refreshFocusChecklist(metrics);
            updateDiffSheet();
        } catch (error) {
            console.error('AndroidStudioTutorials: remote fetch failed', error);
            utils.setValidationStatus(statusElement, {
                status: 'error',
                message: error.message || 'Unable to fetch JSON file.'
            });
        }
    }

    function wireGithubWizard() {
        const { githubWizardButton, githubDialog, githubBack, githubNext, githubTarget } = workspace.elements;
        if (githubWizardButton && !githubWizardButton.dataset.wired) {
            githubWizardButton.addEventListener('click', () => {
                setGithubStep(0);
                clearGithubStatus();
                if (githubDialog) {
                    githubDialog.open = true;
                }
                updateDiffSheet();
            });
            githubWizardButton.dataset.wired = 'true';
        }
        if (githubBack && !githubBack.dataset.wired) {
            githubBack.addEventListener('click', () => {
                if (workspace.githubStepIndex > 0) {
                    setGithubStep(workspace.githubStepIndex - 1);
                    clearGithubStatus();
                }
            });
            githubBack.dataset.wired = 'true';
        }
        if (githubNext && !githubNext.dataset.wired) {
            githubNext.addEventListener('click', async () => {
                clearGithubStatus();
                if (workspace.githubStepIndex === 0) {
                    try {
                        validateGithubToken(workspace.elements.githubToken?.value || '');
                        setGithubStep(1);
                    } catch (error) {
                        setGithubStatus({ status: 'error', message: error.message });
                    }
                    return;
                }
                if (workspace.githubStepIndex === 1) {
                    try {
                        ensureGithubTargetReady();
                        setGithubStep(2);
                    } catch (error) {
                        setGithubStatus({ status: 'error', message: error.message });
                    }
                    return;
                }
                if (workspace.githubStepIndex === 2) {
                    await publishToGithub();
                }
            });
            githubNext.dataset.wired = 'true';
        }
        if (githubTarget && !githubTarget.dataset.wired) {
            githubTarget.addEventListener('change', () => clearGithubStatus());
            githubTarget.dataset.wired = 'true';
        }
    }

    function ensureGithubTargetReady() {
        const { githubTarget, githubLessonSlug } = workspace.elements;
        const targetKey = githubTarget?.value || 'home-debug';
        const target = GITHUB_TARGETS[targetKey];
        if (!target) {
            throw new Error('Select a payload target.');
        }
        if (target.previewKey === 'lesson') {
            const slug = utils.trimString(githubLessonSlug?.value || '');
            if (!slug) {
                throw new Error('Provide a lesson slug for lesson targets.');
            }
        }
        const previewResult = target.previewKey === 'home' ? workspace.homeResult : workspace.lessonResult;
        if (!previewResult.success) {
            throw new Error('Resolve preview validation issues before publishing.');
        }
        updateDiffSheet();
    }

    function setGithubStep(index) {
        const steps = ['authenticate', 'target', 'review'];
        const clamped = Math.max(0, Math.min(index, steps.length - 1));
        workspace.githubStepIndex = clamped;
        if (workspace.elements.githubStepper) {
            workspace.elements.githubStepper.value = steps[clamped];
        }
        if (workspace.elements.githubBack) {
            workspace.elements.githubBack.disabled = clamped === 0;
        }
        if (workspace.elements.githubNext) {
            workspace.elements.githubNext.textContent =
                clamped === steps.length - 1 ? 'Publish' : 'Next';
        }
    }

    function clearGithubStatus() {
        const { githubStatus } = workspace.elements;
        if (githubStatus) {
            githubStatus.innerHTML = '';
            githubStatus.dataset.status = '';
        }
    }

    function setGithubStatus({ status = 'info', message = '' } = {}) {
        const { githubStatus } = workspace.elements;
        if (!githubStatus) {
            return;
        }
        utils.setValidationStatus(githubStatus, { status, message });
    }

    function validateGithubToken(value) {
        const trimmed = utils.trimString(value || '');
        if (!trimmed || trimmed.length < MIN_GITHUB_TOKEN_LENGTH) {
            throw new Error('Token must be at least 20 characters.');
        }
        return trimmed;
    }

    function extractStatusMessage(element) {
        if (!element) {
            return '';
        }
        const messageSpan = element.querySelector('span:last-child');
        if (messageSpan && messageSpan.textContent) {
            return messageSpan.textContent.trim();
        }
        return element.textContent ? element.textContent.trim() : '';
    }

    function handlePreviewResult(target, result) {
        if (result?.success) {
            workspace.lastEdited = Date.now();
        }
        updateLastEditedLabel();
        const metrics = updateWorkspaceMetrics();
        updateToolbarPulses();
        refreshFocusChecklist(metrics);
        updateDiffSheet();
    }

    function updateWorkspaceMetrics() {
        const metrics = {
            totalCards: 0,
            releaseReadyCards: 0,
            missingRequiredCount: 0,
            lessonBlocks: 0,
            lessonReady: false
        };
        const cards = workspace.homeState?.cards || [];
        const sanitize = workspace.homeSanitize;
        const sanitizedCards = sanitize
            ? cards
                  .map((card) => sanitize(card))
                  .filter((card) => card && Object.keys(card).length > 0)
            : [];
        metrics.totalCards = sanitizedCards.length;
        sanitizedCards.forEach((card) => {
            const hasRequired = card.lesson_id && card.lesson_type && card.lesson_title;
            if (hasRequired) {
                metrics.releaseReadyCards += 1;
            } else {
                metrics.missingRequiredCount += 1;
            }
        });
        const composeLesson = workspace.lessonCompose;
        let lessonPayload = null;
        if (typeof composeLesson === 'function') {
            try {
                lessonPayload = composeLesson();
            } catch (error) {
                lessonPayload = null;
            }
        }
        const lessons = Array.isArray(lessonPayload?.data) ? lessonPayload.data : [];
        const lesson = lessons[0] || {};
        const blocks = Array.isArray(lesson.lesson_content) ? lesson.lesson_content : [];
        metrics.lessonBlocks = blocks.length;
        metrics.lessonReady = Boolean(lesson.lesson_title && blocks.length);
        workspace.lastMetrics = metrics;

        const {
            trackedCount,
            releaseReadyCount,
            blockAverage,
            reviewCount,
            workspacePulse,
            releaseProgress
        } = workspace.elements;
        if (trackedCount) {
            trackedCount.textContent = String(metrics.totalCards);
        }
        if (releaseReadyCount) {
            releaseReadyCount.textContent = String(metrics.releaseReadyCards);
        }
        if (blockAverage) {
            blockAverage.textContent = String(metrics.lessonBlocks);
        }
        if (reviewCount) {
            if (!metrics.totalCards && !metrics.lessonBlocks) {
                reviewCount.textContent = '0 cards needing attention';
            } else if (metrics.missingRequiredCount === 0 && metrics.lessonReady) {
                reviewCount.textContent = 'All payloads look ready';
            } else {
                const parts = [];
                if (metrics.missingRequiredCount) {
                    parts.push(
                        `${metrics.missingRequiredCount} home ${
                            metrics.missingRequiredCount === 1 ? 'card' : 'cards'
                        }`
                    );
                }
                if (!metrics.lessonReady) {
                    parts.push('lesson setup');
                }
                reviewCount.textContent = `${parts.join(' · ')} pending`;
            }
        }
        if (workspacePulse) {
            let message;
            if (!metrics.totalCards && !metrics.lessonBlocks) {
                message = 'Review entries to unlock insights.';
            } else if (metrics.missingRequiredCount === 0 && metrics.lessonReady) {
                message = 'Everything is production ready. Ship when you are ready.';
            } else {
                const homePart = metrics.totalCards
                    ? `${metrics.releaseReadyCards}/${metrics.totalCards} home ready`
                    : 'No home cards yet';
                const lessonPart = metrics.lessonReady
                    ? 'Lesson ready'
                    : 'Lesson needs title & blocks';
                message = `${homePart} · ${lessonPart}`;
            }
            workspacePulse.textContent = message;
        }
        if (releaseProgress) {
            const homeRatio = metrics.totalCards ? metrics.releaseReadyCards / metrics.totalCards : 0;
            const lessonRatio = metrics.lessonReady ? 1 : 0;
            const overall = (homeRatio + lessonRatio) / 2;
            releaseProgress.style.width = `${Math.round(overall * 100)}%`;
            releaseProgress.dataset.value = overall.toFixed(2);
        }
        return metrics;
    }

    function updateToolbarPulses(reason) {
        updateHomeToolbarPulse(reason);
        updateLessonToolbarPulse(reason);
    }

    function updateHomeToolbarPulse(reason) {
        const element = workspace.elements.homeToolbarPulse;
        if (!element) {
            return;
        }
        if (reason === 'focusComplete') {
            element.textContent = 'Focus session complete.';
            return;
        }
        const statusElement = workspace.homeValidationStatus;
        const status = statusElement?.dataset.status;
        const statusMessage = extractStatusMessage(statusElement);
        if (status && statusMessage) {
            element.textContent = statusMessage;
            return;
        }
        const metrics = workspace.lastMetrics || { totalCards: 0, missingRequiredCount: 0 };
        if (!metrics.totalCards) {
            element.textContent = 'Awaiting input';
            return;
        }
        if (metrics.missingRequiredCount) {
            element.textContent = `${metrics.missingRequiredCount} ${
                metrics.missingRequiredCount === 1 ? 'card needs metadata' : 'cards need metadata'
            }`;
        } else {
            element.textContent = 'Ready to publish';
        }
    }

    function updateLessonToolbarPulse(reason) {
        const element = workspace.elements.lessonToolbarPulse;
        if (!element) {
            return;
        }
        if (reason === 'focusComplete') {
            element.textContent = 'Focus session complete.';
            return;
        }
        const statusElement = workspace.lessonValidationStatus;
        const status = statusElement?.dataset.status;
        const statusMessage = extractStatusMessage(statusElement);
        if (status && statusMessage) {
            element.textContent = statusMessage;
            return;
        }
        const metrics = workspace.lastMetrics || { lessonBlocks: 0, lessonReady: false };
        if (!metrics.lessonBlocks) {
            element.textContent = 'Add lesson blocks to begin';
        } else if (!metrics.lessonReady) {
            element.textContent = 'Complete lesson title and content';
        } else {
            element.textContent = 'Lesson ready to publish';
        }
    }

    function refreshFocusChecklist(metrics = workspace.lastMetrics || {}) {
        const { focusChecklist } = workspace.elements;
        if (!focusChecklist) {
            return;
        }
        focusChecklist.innerHTML = '';
        const previewReadyHome = workspace.homeValidationStatus?.dataset.status === 'success';
        const previewReadyLesson = workspace.lessonValidationStatus?.dataset.status === 'success';
        const items = [
            {
                label: 'Build home feed',
                detail: metrics.totalCards
                    ? `${metrics.totalCards} ${metrics.totalCards === 1 ? 'card' : 'cards'} tracked`
                    : 'Add your first home card.',
                done: metrics.totalCards > 0
            },
            {
                label: 'Complete required metadata',
                detail: metrics.missingRequiredCount
                    ? `${metrics.missingRequiredCount} ${
                          metrics.missingRequiredCount === 1 ? 'card missing fields' : 'cards missing fields'
                      }`
                    : 'All required fields captured.',
                done: metrics.totalCards > 0 && metrics.missingRequiredCount === 0
            },
            {
                label: 'Structure lesson content',
                detail: metrics.lessonReady
                    ? `${metrics.lessonBlocks} ${metrics.lessonBlocks === 1 ? 'block' : 'blocks'} configured`
                    : 'Add a title and content blocks.',
                done: metrics.lessonReady
            },
            {
                label: 'Validate JSON previews',
                detail:
                    previewReadyHome && previewReadyLesson
                        ? 'Home and lesson previews valid.'
                        : 'Resolve validation messages before publishing.',
                done: previewReadyHome && previewReadyLesson
            }
        ];
        items.forEach((item) => {
            const listItem = document.createElement('md-list-item');
            listItem.classList.add('focus-checklist-item');
            const checkbox = document.createElement('md-checkbox');
            checkbox.setAttribute('slot', 'start');
            checkbox.checked = item.done;
            checkbox.disabled = true;
            listItem.appendChild(checkbox);
            const headline = document.createElement('div');
            headline.setAttribute('slot', 'headline');
            headline.textContent = item.label;
            listItem.appendChild(headline);
            if (item.detail) {
                const supporting = document.createElement('div');
                supporting.setAttribute('slot', 'supporting-text');
                supporting.textContent = item.detail;
                listItem.appendChild(supporting);
            }
            focusChecklist.appendChild(listItem);
        });
    }

    function updateDiffSheet() {
        const { diffContent, diffSheet } = workspace.elements;
        if (!diffContent) {
            return;
        }
        const homeBaseline = workspace.baseline.home;
        const lessonBaseline = workspace.baseline.lesson;
        if (!homeBaseline && !lessonBaseline) {
            diffContent.classList.add('diff-view--empty');
            diffContent.textContent = 'Load a baseline JSON file to compare changes.';
            if (diffSheet) {
                diffSheet.open = false;
                diffSheet.classList.add('is-empty');
            }
            return;
        }
        const fragments = [];
        if (homeBaseline) {
            fragments.push(
                renderDiffSection({
                    label: 'Home API',
                    baseline: homeBaseline,
                    current: workspace.homePreview,
                    ready: workspace.homeResult.success
                })
            );
        }
        if (lessonBaseline) {
            fragments.push(
                renderDiffSection({
                    label: 'Lesson API',
                    baseline: lessonBaseline,
                    current: workspace.lessonPreview,
                    ready: workspace.lessonResult.success
                })
            );
        }
        const available = fragments.filter(Boolean);
        if (!available.length) {
            diffContent.classList.add('diff-view--empty');
            diffContent.textContent = 'Resolve preview errors to view the diff.';
            if (diffSheet) {
                diffSheet.open = false;
                diffSheet.classList.add('is-empty');
            }
            return;
        }
        diffContent.classList.remove('diff-view--empty');
        diffContent.innerHTML = '';
        available.forEach((fragment) => diffContent.appendChild(fragment));
        if (diffSheet) {
            diffSheet.classList.remove('is-empty');
            diffSheet.open = true;
        }
    }

    function renderDiffSection({ label, baseline, current, ready }) {
        const section = document.createElement('div');
        section.className = 'diff-view__group';
        const heading = document.createElement('h3');
        heading.className = 'diff-view__title';
        heading.textContent = label;
        section.appendChild(heading);
        if (!ready) {
            const message = document.createElement('p');
            message.className = 'diff-view__message';
            message.textContent = 'Preview not ready.';
            section.appendChild(message);
            return section;
        }
        if (!current || current === baseline) {
            const message = document.createElement('p');
            message.className = 'diff-view__message';
            message.textContent = 'No differences detected.';
            section.appendChild(message);
            return section;
        }
        const body = document.createElement('div');
        body.className = 'diff-view__body';
        const baselineColumn = document.createElement('div');
        baselineColumn.className = 'diff-view__column diff-view__column--baseline';
        const baselineHeading = document.createElement('h4');
        baselineHeading.textContent = 'Baseline';
        baselineColumn.appendChild(baselineHeading);
        const baselinePre = document.createElement('pre');
        baselinePre.className = 'jsondiffpatch-delta';
        baselinePre.textContent = baseline;
        baselineColumn.appendChild(baselinePre);
        const currentColumn = document.createElement('div');
        currentColumn.className = 'diff-view__column diff-view__column--current';
        const currentHeading = document.createElement('h4');
        currentHeading.textContent = 'Current';
        currentColumn.appendChild(currentHeading);
        const currentPre = document.createElement('pre');
        currentPre.className = 'jsondiffpatch-delta';
        currentPre.textContent = current;
        currentColumn.appendChild(currentPre);
        body.appendChild(baselineColumn);
        body.appendChild(currentColumn);
        section.appendChild(body);
        return section;
    }

    function updateLastEditedLabel() {
        const { lastEdited } = workspace.elements;
        if (!lastEdited) {
            return;
        }
        if (!workspace.lastEdited) {
            lastEdited.textContent = 'awaiting changes';
            return;
        }
        const now = Date.now();
        const diff = now - workspace.lastEdited;
        if (diff < 60_000) {
            lastEdited.textContent = 'just now';
            return;
        }
        if (diff < 3_600_000) {
            const minutes = Math.round(diff / 60_000);
            lastEdited.textContent = `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
            return;
        }
        lastEdited.textContent = new Date(workspace.lastEdited).toLocaleString();
    }

    function parseRepository(value) {
        const trimmed = utils.trimString(value || '');
        const segments = trimmed.split('/').filter(Boolean);
        if (segments.length !== 2) {
            throw new Error('Repository must be provided as owner/name.');
        }
        return { owner: segments[0], repo: segments[1] };
    }

    function encodeGithubPath(path) {
        return path
            .split('/')
            .map((segment) => encodeURIComponent(segment))
            .join('/');
    }

    function encodeContentToBase64(text) {
        const string = typeof text === 'string' ? text : String(text ?? '');
        if (typeof TextEncoder !== 'undefined') {
            const encoder = new TextEncoder();
            const bytes = encoder.encode(string);
            let binary = '';
            bytes.forEach((byte) => {
                binary += String.fromCharCode(byte);
            });
            return btoa(binary);
        }
        if (typeof btoa !== 'undefined') {
            return btoa(unescape(encodeURIComponent(string)));
        }
        throw new Error('Base64 encoding is not supported in this environment.');
    }

    async function readGithubError(response) {
        try {
            const details = await response.json();
            if (details?.message) {
                return details.message;
            }
        } catch (error) {
            // ignore parsing errors
        }
        return `GitHub request failed: ${response.status} ${response.statusText}`;
    }

    async function publishToGithub() {
        const {
            githubToken,
            githubRepo,
            githubBranch,
            githubMessage,
            githubTarget,
            githubLessonSlug
        } = workspace.elements;
        try {
            const token = validateGithubToken(githubToken?.value || '');
            const repoValue = utils.trimString(githubRepo?.value || '');
            if (!repoValue) {
                throw new Error('Provide a repository in owner/name format.');
            }
            const branch = utils.trimString(githubBranch?.value || '');
            if (!branch) {
                throw new Error('Provide a branch name.');
            }
            const message = utils.trimString(githubMessage?.value || '');
            if (!message) {
                throw new Error('Provide a commit message.');
            }
            const targetKey = githubTarget?.value || 'home-debug';
            const target = GITHUB_TARGETS[targetKey];
            if (!target) {
                throw new Error('Select a payload target.');
            }
            const previewKey = target.previewKey;
            const previewString = previewKey === 'home' ? workspace.homePreview : workspace.lessonPreview;
            const previewResult = previewKey === 'home' ? workspace.homeResult : workspace.lessonResult;
            if (!previewResult.success || !previewString) {
                throw new Error('Resolve preview validation issues before publishing.');
            }
            let path = target.path;
            if (!path && target.prefix) {
                const slug = utils.trimString(githubLessonSlug?.value || '');
                if (!slug) {
                    throw new Error('Provide a lesson slug for lesson targets.');
                }
                const normalized = slug
                    .toLowerCase()
                    .replace(/\s+/g, '_')
                    .replace(/[^a-z0-9_\-]/g, '_');
                path = `${target.prefix}api_get_${normalized}.json`;
            }
            if (!path) {
                throw new Error('Unable to determine repository path.');
            }
            setGithubStatus({ status: 'info', message: 'Publishing to GitHub…' });
            const { owner, repo } = parseRepository(repoValue);
            const encodedPath = encodeGithubPath(path);
            const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;
            const headers = {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${token}`
            };
            let existingSha = null;
            const getResponse = await fetch(`${baseUrl}?ref=${encodeURIComponent(branch)}`, {
                headers
            });
            if (getResponse.status === 200) {
                const body = await getResponse.json();
                existingSha = body.sha;
            } else if (getResponse.status !== 404) {
                const messageText = await readGithubError(getResponse);
                throw new Error(messageText);
            }
            const putResponse = await fetch(baseUrl, {
                method: 'PUT',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    content: encodeContentToBase64(previewString),
                    branch,
                    sha: existingSha || undefined
                })
            });
            if (!putResponse.ok) {
                const messageText = await readGithubError(putResponse);
                throw new Error(messageText);
            }
            workspace.baseline[previewKey] = previewString;
            updateDiffSheet();
            setGithubStatus({ status: 'success', message: 'Published successfully.' });
        } catch (error) {
            console.error('AndroidStudioTutorials: publish failed', error);
            setGithubStatus({ status: 'error', message: error.message || 'Unable to publish changes.' });
        }
    }

    function initHomeBuilder() {
        const builderRoot = document.getElementById('androidHomeBuilder');
        if (!builderRoot || builderRoot.dataset.initialized === 'true') {
            return;
        }

        const entriesContainer = document.getElementById('androidHomeEntries');
        const previewArea = document.getElementById('androidHomePreview');
        const validationStatus = document.getElementById('androidHomeValidation');
        const addButton = document.getElementById('androidHomeAddCard');
        const resetButton = document.getElementById('androidHomeResetButton');
        const copyButton = document.getElementById('androidHomeCopyButton');
        const downloadButton = document.getElementById('androidHomeDownloadButton');
        const importButton = document.getElementById('androidHomeImportButton');
        const importInput = document.getElementById('androidHomeImportInput');

        const state = {
            cards: [createEmptyCard()]
        };
        workspace.homeState = state;
        workspace.homePreviewArea = previewArea;
        workspace.homeValidationStatus = validationStatus;

        function createEmptyCard() {
            return {
                lesson_id: '',
                lesson_type: '',
                lesson_title: '',
                lesson_description: '',
                thumbnail_image_url: '',
                square_image_url: '',
                deep_link_path: '',
                lesson_tags: [],
                customFields: []
            };
        }

        function render() {
            if (!entriesContainer) {
                return;
            }
            utils.clearElement(entriesContainer);
            if (!state.cards.length) {
                state.cards.push(createEmptyCard());
            }
            state.cards.forEach((card, index) => {
                entriesContainer.appendChild(createCard(card, index));
            });
            requestPreviewUpdate();
        }

        function createCard(card, index) {
            const wrapper = utils.createElement('div', { classNames: 'builder-card' });
            const header = utils.createElement('div', { classNames: 'builder-card-header' });
            header.appendChild(utils.createElement('h3', { text: `Card ${index + 1}` }));
            header.appendChild(
                utils.createInlineButton({
                    label: 'Remove',
                    icon: 'delete',
                    variant: 'danger',
                    onClick: () => {
                        if (state.cards.length === 1) {
                            state.cards[0] = createEmptyCard();
                        } else {
                            state.cards.splice(index, 1);
                        }
                        render();
                    }
                })
            );
            wrapper.appendChild(header);

            const fields = utils.createElement('div', { classNames: 'builder-card-fields' });
            fields.appendChild(
                utils.createInputField({
                    label: 'Lesson ID',
                    value: card.lesson_id,
                    onInput: (value) => {
                        state.cards[index].lesson_id = value;
                        requestPreviewUpdate();
                    }
                }).wrapper
            );
            fields.appendChild(
                utils.createInputField({
                    label: 'Lesson type',
                    value: card.lesson_type,
                    helperText: HOME_TYPE_HINT,
                    onInput: (value) => {
                        state.cards[index].lesson_type = value;
                        requestPreviewUpdate();
                    }
                }).wrapper
            );
            fields.appendChild(
                utils.createInputField({
                    label: 'Lesson title',
                    value: card.lesson_title,
                    onInput: (value) => {
                        state.cards[index].lesson_title = value;
                        requestPreviewUpdate();
                    }
                }).wrapper
            );
            fields.appendChild(
                utils.createTextareaField({
                    label: 'Description',
                    value: card.lesson_description,
                    rows: 3,
                    onInput: (value) => {
                        state.cards[index].lesson_description = value;
                        requestPreviewUpdate();
                    }
                }).wrapper
            );
            fields.appendChild(
                utils.createInputField({
                    label: 'Thumbnail URL',
                    value: card.thumbnail_image_url,
                    placeholder: 'https://example.com/banner.webp',
                    onInput: (value) => {
                        state.cards[index].thumbnail_image_url = value;
                        requestPreviewUpdate();
                    }
                }).wrapper
            );
            fields.appendChild(
                utils.createInputField({
                    label: 'Square image URL',
                    value: card.square_image_url,
                    placeholder: 'https://example.com/square.webp',
                    onInput: (value) => {
                        state.cards[index].square_image_url = value;
                        requestPreviewUpdate();
                    }
                }).wrapper
            );
            fields.appendChild(
                utils.createInputField({
                    label: 'Deep link path',
                    value: card.deep_link_path,
                    placeholder: 'com.d4rk.androidtutorials://lesson/...',
                    onInput: (value) => {
                        state.cards[index].deep_link_path = value;
                        requestPreviewUpdate();
                    }
                }).wrapper
            );

            const tagsSection = utils.createElement('div', { classNames: 'builder-subsection' });
            tagsSection.appendChild(utils.createElement('h4', { text: 'Tags' }));
            const tagsList = utils.createElement('div', { classNames: 'tag-list' });
            card.lesson_tags.forEach((tag, tagIndex) => {
                tagsList.appendChild(
                    createTagRow(
                        tag,
                        (value) => {
                            state.cards[index].lesson_tags[tagIndex] = value;
                            requestPreviewUpdate();
                        },
                        () => {
                            state.cards[index].lesson_tags.splice(tagIndex, 1);
                            render();
                        }
                    )
                );
            });
            tagsSection.appendChild(tagsList);
            tagsSection.appendChild(
                utils.createInlineButton({
                    label: 'Add tag',
                    icon: 'add',
                    onClick: () => {
                        state.cards[index].lesson_tags.push('');
                        render();
                    }
                })
            );
            fields.appendChild(tagsSection);

            const customSection = utils.createElement('div', { classNames: 'builder-subsection' });
            customSection.appendChild(utils.createElement('h4', { text: 'Custom fields' }));
            const customList = utils.createElement('div', { classNames: 'custom-field-list' });
            card.customFields.forEach((field, fieldIndex) => {
                customList.appendChild(
                    createCustomFieldRow(
                        field,
                        (key) => {
                            state.cards[index].customFields[fieldIndex].key = key;
                            requestPreviewUpdate();
                        },
                        (value) => {
                            state.cards[index].customFields[fieldIndex].value = value;
                            requestPreviewUpdate();
                        },
                        () => {
                            state.cards[index].customFields.splice(fieldIndex, 1);
                            render();
                        }
                    )
                );
            });
            customSection.appendChild(customList);
            customSection.appendChild(
                utils.createInlineButton({
                    label: 'Add field',
                    icon: 'add',
                    onClick: () => {
                        state.cards[index].customFields.push({ key: '', value: '' });
                        render();
                    }
                })
            );
            fields.appendChild(customSection);

            wrapper.appendChild(fields);
            return wrapper;
        }

        function createTagRow(value, onChange, onRemove) {
            const row = utils.createElement('div', { classNames: 'tag-row' });
            row.appendChild(
                utils.createInputField({
                    label: 'Tag',
                    value,
                    onInput: onChange
                }).wrapper
            );
            row.appendChild(
                utils.createInlineButton({
                    label: 'Remove',
                    icon: 'close',
                    onClick: onRemove
                })
            );
            return row;
        }

        function importJson(text) {
            try {
                const json = utils.parseJson(text);
                const cards = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
                if (!cards.length) {
                    utils.setValidationStatus(validationStatus, {
                        status: 'error',
                        message: 'No cards found in the imported JSON.'
                    });
                    throw new Error('No cards found in the imported JSON.');
                }
                const toStringValue = (value) => (value === undefined || value === null ? '' : String(value));
                state.cards = cards.map((raw) => ({
                    lesson_id: utils.trimString(toStringValue(raw.lesson_id)),
                    lesson_type: utils.trimString(toStringValue(raw.lesson_type)),
                    lesson_title: utils.trimString(toStringValue(raw.lesson_title)),
                    lesson_description: utils.trimString(toStringValue(raw.lesson_description)),
                    thumbnail_image_url: utils.trimString(toStringValue(raw.thumbnail_image_url)),
                    square_image_url: utils.trimString(toStringValue(raw.square_image_url)),
                    deep_link_path: utils.trimString(toStringValue(raw.deep_link_path || raw.deep_link)),
                    lesson_tags: Array.isArray(raw.lesson_tags)
                        ? raw.lesson_tags
                              .map((tag) => utils.trimString(toStringValue(tag)))
                              .filter(Boolean)
                        : [],
                    customFields: Object.entries(raw)
                        .filter(([key]) =>
                            ![
                                'lesson_id',
                                'lesson_type',
                                'lesson_title',
                                'lesson_description',
                                'thumbnail_image_url',
                                'square_image_url',
                                'deep_link_path',
                                'deep_link',
                                'lesson_tags'
                            ].includes(key)
                        )
                        .map(([key, value]) => ({
                            key: utils.trimString(key),
                            value: stringifyValue(value)
                        }))
                }));
                render();
            } catch (error) {
                console.error('AndroidStudioTutorials(Home):', error);
                utils.setValidationStatus(validationStatus, {
                    status: 'error',
                    message: error.message || 'Unable to import JSON.'
                });
                alert(error.message || 'Unable to import JSON.');
            }
        }

        function sanitizeHomeCard(card) {
            const trimmed = (value) =>
                utils.trimString(typeof value === 'string' ? value : value == null ? '' : String(value));
            const payload = {};
            const lessonId = trimmed(card.lesson_id);
            if (lessonId) payload.lesson_id = lessonId;
            const lessonType = trimmed(card.lesson_type);
            if (lessonType) payload.lesson_type = lessonType;
            const lessonTitle = trimmed(card.lesson_title);
            if (lessonTitle) payload.lesson_title = lessonTitle;
            const description = trimmed(card.lesson_description);
            if (description) payload.lesson_description = description;
            const thumbnail = trimmed(card.thumbnail_image_url);
            if (thumbnail) payload.thumbnail_image_url = thumbnail;
            const square = trimmed(card.square_image_url);
            if (square) payload.square_image_url = square;
            const deepLink = trimmed(card.deep_link_path);
            if (deepLink) payload.deep_link_path = deepLink;
            const tags = (Array.isArray(card.lesson_tags) ? card.lesson_tags : [])
                .map((tag) => trimmed(tag))
                .filter(Boolean);
            if (tags.length) {
                payload.lesson_tags = Array.from(new Set(tags));
            }
            card.customFields
                .map((field) => ({ key: trimmed(field.key), value: field.value }))
                .filter((field) => field.key)
                .forEach((field) => {
                    const parsed = parseMaybeNumber(field.value);
                    if (parsed !== '') {
                        payload[field.key] = parsed;
                    }
                });
            return payload;
        }

        async function updatePreview() {
            const result = await utils.renderJsonPreview({
                previewArea,
                statusElement: validationStatus,
                data: state.cards,
                buildPayload: (cards) => ({ data: cards }),
                autoFix: (payload) => {
                    const cards = Array.isArray(payload?.data) ? payload.data : [];
                    payload.data = cards
                        .map((card) => sanitizeHomeCard(card))
                        .filter((card) => Object.keys(card).length > 0);
                    return payload;
                },
                successMessage: (payload) => {
                    const count = Array.isArray(payload?.data) ? payload.data.length : 0;
                    if (!count) {
                        return 'Valid JSON · No cards yet';
                    }
                    return count === 1 ? 'Valid JSON · 1 home card' : `Valid JSON · ${count} home cards`;
                }
            });
            workspace.homePreview = previewArea ? previewArea.value : '';
            workspace.homeResult = result;
            handlePreviewResult('home', result);
        }

        const previewUpdateTask = utils.createDeferredTask(updatePreview, {
            delay: 360,
            idle: true
        });

        function requestPreviewUpdate(options = {}) {
            const { immediate = false } = options;
            if (immediate) {
                return previewUpdateTask.flush();
            }
            previewUpdateTask.schedule();
            return undefined;
        }

        attachCommonHandlers({
            addButton,
            resetButton,
            copyButton,
            downloadButton,
            importButton,
            importInput,
            previewArea,
            onAdd: () => {
                state.cards.push(createEmptyCard());
                render();
            },
            onReset: () => {
                state.cards = [createEmptyCard()];
                render();
            },
            onDownload: () => {
                utils.downloadJson(HOME_FILENAME, previewArea?.value || '');
            },
            onImport: importJson
        });

        builderRoot.dataset.initialized = 'true';
        workspace.homeImport = importJson;
        workspace.homeSanitize = sanitizeHomeCard;
        render();
    }

    function initLessonBuilder() {
        const builderRoot = document.getElementById('androidLessonBuilder');
        if (!builderRoot || builderRoot.dataset.initialized === 'true') {
            return;
        }

        const metadataContainer = document.getElementById('androidLessonMetadata');
        const blocksContainer = document.getElementById('androidLessonBlocks');
        const previewArea = document.getElementById('androidLessonPreview');
        const validationStatus = document.getElementById('androidLessonValidation');
        const titleField = document.getElementById('androidLessonTitle');
        const addBlockButton = document.getElementById('androidLessonAddBlock');
        const resetButton = document.getElementById('androidLessonResetButton');
        const copyButton = document.getElementById('androidLessonCopyButton');
        const downloadButton = document.getElementById('androidLessonDownloadButton');
        const importButton = document.getElementById('androidLessonImportButton');
        const importInput = document.getElementById('androidLessonImportInput');

        const state = {
            title: '',
            metadata: [],
            blocks: []
        };
        workspace.lessonState = state;
        workspace.lessonPreviewArea = previewArea;
        workspace.lessonValidationStatus = validationStatus;

        if (titleField) {
            titleField.addEventListener('input', (event) => {
                state.title = event.target.value;
                requestPreviewUpdate();
            });
        }

        function render() {
            renderMetadata();
            renderBlocks();
            requestPreviewUpdate();
        }

        function renderMetadata() {
            if (!metadataContainer) {
                return;
            }
            utils.clearElement(metadataContainer);
            const header = utils.createElement('div', { classNames: 'builder-subsection-header' });
            header.appendChild(utils.createElement('h4', { text: 'Lesson metadata' }));
            header.appendChild(
                utils.createInlineButton({
                    label: 'Add field',
                    icon: 'add',
                    onClick: () => {
                        state.metadata.push({ key: '', value: '' });
                        renderMetadata();
                        requestPreviewUpdate();
                    }
                })
            );
            metadataContainer.appendChild(header);
            const list = utils.createElement('div', { classNames: 'custom-field-list' });
            state.metadata.forEach((field, index) => {
                list.appendChild(
                    createCustomFieldRow(
                        field,
                        (key) => {
                            state.metadata[index].key = key;
                            requestPreviewUpdate();
                        },
                        (value) => {
                            state.metadata[index].value = value;
                            requestPreviewUpdate();
                        },
                        () => {
                            state.metadata.splice(index, 1);
                            renderMetadata();
                            requestPreviewUpdate();
                        }
                    )
                );
            });
            metadataContainer.appendChild(list);
        }

        function renderBlocks() {
            if (!blocksContainer) {
                return;
            }
            utils.clearElement(blocksContainer);
            if (!state.blocks.length) {
                state.blocks.push(createEmptyBlock());
            }
            state.blocks.forEach((block, index) => {
                blocksContainer.appendChild(createBlockCard(block, index));
            });
        }

        function createEmptyBlock() {
            return {
                content_id: String(state.blocks.length + 1),
                content_type: 'content_text',
                props: {},
                customFields: []
            };
        }

        function createBlockCard(block, index) {
            const card = utils.createElement('div', { classNames: 'builder-card' });
            const header = utils.createElement('div', { classNames: 'builder-card-header' });
            header.appendChild(utils.createElement('h3', { text: `Block ${index + 1}` }));
            header.appendChild(
                utils.createInlineButton({
                    label: 'Remove',
                    icon: 'delete',
                    variant: 'danger',
                    onClick: () => {
                        if (state.blocks.length === 1) {
                            state.blocks[0] = createEmptyBlock();
                        } else {
                            state.blocks.splice(index, 1);
                        }
                        renderBlocks();
                        requestPreviewUpdate();
                    }
                })
            );
            card.appendChild(header);

            const fields = utils.createElement('div', { classNames: 'builder-card-fields' });
            fields.appendChild(
                utils.createInputField({
                    label: 'Content ID',
                    value: block.content_id,
                    onInput: (value) => {
                        state.blocks[index].content_id = value;
                        requestPreviewUpdate();
                    }
                }).wrapper
            );
            fields.appendChild(
                utils.createInputField({
                    label: 'Content type',
                    value: block.content_type,
                    helperText: BLOCK_TYPE_HINT,
                    onInput: (value) => {
                        state.blocks[index].content_type = value;
                        cleanupPropsForType(state.blocks[index]);
                        renderBlocks();
                        requestPreviewUpdate();
                    }
                }).wrapper
            );

            const fieldDefinitions = ANDROID_BLOCK_FIELDS[block.content_type] || [];
            fieldDefinitions.forEach((definition) => {
                if (definition.type === 'textarea') {
                    fields.appendChild(
                        utils.createTextareaField({
                            label: definition.label,
                            value: block.props[definition.key] || '',
                            helperText: definition.helperText || '',
                            onInput: (value) => {
                                state.blocks[index].props[definition.key] = value;
                                requestPreviewUpdate();
                            }
                        }).wrapper
                    );
                } else {
                    fields.appendChild(
                        utils.createInputField({
                            label: definition.label,
                            value: block.props[definition.key] || '',
                            type: definition.type === 'number' ? 'number' : 'text',
                            placeholder: definition.placeholder || '',
                            helperText: definition.helperText || '',
                            onInput: (value) => {
                                state.blocks[index].props[definition.key] = value;
                                requestPreviewUpdate();
                            }
                        }).wrapper
                    );
                }
            });

            const customSection = utils.createElement('div', { classNames: 'builder-subsection' });
            customSection.appendChild(utils.createElement('h4', { text: 'Custom fields' }));
            const list = utils.createElement('div', { classNames: 'custom-field-list' });
            block.customFields.forEach((field, fieldIndex) => {
                list.appendChild(
                    createCustomFieldRow(
                        field,
                        (key) => {
                            state.blocks[index].customFields[fieldIndex].key = key;
                            requestPreviewUpdate();
                        },
                        (value) => {
                            state.blocks[index].customFields[fieldIndex].value = value;
                            requestPreviewUpdate();
                        },
                        () => {
                            state.blocks[index].customFields.splice(fieldIndex, 1);
                            renderBlocks();
                            requestPreviewUpdate();
                        }
                    )
                );
            });
            customSection.appendChild(list);
            customSection.appendChild(
                utils.createInlineButton({
                    label: 'Add field',
                    icon: 'add',
                    onClick: () => {
                        state.blocks[index].customFields.push({ key: '', value: '' });
                        renderBlocks();
                    }
                })
            );
            fields.appendChild(customSection);

            card.appendChild(fields);
            return card;
        }

        function cleanupPropsForType(block) {
            const allowed = new Set((ANDROID_BLOCK_FIELDS[block.content_type] || []).map((field) => field.key));
            Object.keys(block.props).forEach((key) => {
                if (!allowed.has(key)) {
                    delete block.props[key];
                }
            });
        }

        function importJson(text) {
            try {
                const json = utils.parseJson(text);
                const lessonArray = Array.isArray(json?.data) ? json.data : [];
                if (!lessonArray.length) {
                    utils.setValidationStatus(validationStatus, {
                        status: 'error',
                        message: 'No lessons found in JSON.'
                    });
                    throw new Error('No lessons found in JSON.');
                }
                const lesson = lessonArray[0];
                state.title = utils.trimString(lesson.lesson_title || '');
                if (titleField) {
                    titleField.value = state.title;
                }
                state.metadata = Object.entries(lesson)
                    .filter(([key]) => !['lesson_title', 'lesson_content'].includes(key))
                    .map(([key, value]) => ({
                        key: utils.trimString(key),
                        value: stringifyValue(value)
                    }));
                const content = Array.isArray(lesson.lesson_content) ? lesson.lesson_content : [];
                state.blocks = content.map((entry, index) => mapBlockFromJson(entry, index));
                render();
            } catch (error) {
                console.error('AndroidStudioTutorials(Lesson):', error);
                utils.setValidationStatus(validationStatus, {
                    status: 'error',
                    message: error.message || 'Unable to import lesson JSON.'
                });
                alert(error.message || 'Unable to import lesson JSON.');
            }
        }

        function mapBlockFromJson(entry, index) {
            const block = {
                content_id: entry.content_id ? String(entry.content_id) : String(index + 1),
                content_type: entry.content_type || 'content_text',
                props: {},
                customFields: []
            };
            const allowed = new Set((ANDROID_BLOCK_FIELDS[block.content_type] || []).map((field) => field.key));
            Object.entries(entry).forEach(([key, value]) => {
                if (key === 'content_id' || key === 'content_type') {
                    return;
                }
                if (allowed.has(key)) {
                    block.props[key] = stringifyValue(value);
                } else {
                    block.customFields.push({
                        key: utils.trimString(key),
                        value: stringifyValue(value)
                    });
                }
            });
            return block;
        }

        function composeLessonPayload() {
            const lesson = {};
            const title = utils.trimString(state.title ?? '');
            if (title) {
                lesson.lesson_title = title;
            }
            state.metadata
                .map((field) => ({ key: utils.trimString(field.key), value: field.value }))
                .filter((field) => field.key)
                .forEach((field) => {
                    const parsed = parseMaybeNumber(field.value);
                    if (parsed !== '') {
                        lesson[field.key] = parsed;
                    }
                });
            const content = state.blocks
                .map((block) => buildBlockPayload(block))
                .filter((payload) => Object.keys(payload).length > 0);
            if (content.length) {
                lesson.lesson_content = content;
            }
            const finalData = Object.keys(lesson).length ? [lesson] : [];
            return { data: finalData };
        }

        async function updatePreview() {
            const result = await utils.renderJsonPreview({
                previewArea,
                statusElement: validationStatus,
                data: null,
                buildPayload: composeLessonPayload,
                successMessage: (payload) => {
                    const lessons = Array.isArray(payload?.data) ? payload.data : [];
                    const firstLesson = lessons[0];
                    if (!firstLesson || Object.keys(firstLesson).length === 0) {
                        return 'Valid JSON · No lesson data yet';
                    }
                    const blocks = Array.isArray(firstLesson.lesson_content)
                        ? firstLesson.lesson_content.length
                        : 0;
                    if (!blocks) {
                        return 'Valid JSON · Lesson metadata only';
                    }
                    return blocks === 1
                        ? 'Valid JSON · 1 content block'
                        : `Valid JSON · ${blocks} content blocks`;
                }
            });
            workspace.lessonPreview = previewArea ? previewArea.value : '';
            workspace.lessonResult = result;
            handlePreviewResult('lesson', result);
        }

        const previewUpdateTask = utils.createDeferredTask(updatePreview, {
            delay: 360,
            idle: true
        });

        function requestPreviewUpdate(options = {}) {
            const { immediate = false } = options;
            if (immediate) {
                return previewUpdateTask.flush();
            }
            previewUpdateTask.schedule();
            return undefined;
        }

        function buildBlockPayload(block) {
            const payload = {};
            const contentId = utils.trimString(block.content_id ?? '');
            if (contentId) payload.content_id = contentId;
            const contentType = utils.trimString(block.content_type ?? '');
            if (contentType) payload.content_type = contentType;
            const definitions = ANDROID_BLOCK_FIELDS[block.content_type] || [];
            definitions.forEach((definition) => {
                const value = block.props[definition.key];
                if (value === undefined || value === '') {
                    return;
                }
                if (definition.type === 'number') {
                    const parsed = utils.parseNumber(value);
                    if (parsed !== undefined) {
                        payload[definition.key] = parsed;
                    }
                } else {
                    const trimmed = utils.trimString(value);
                    if (trimmed) {
                        payload[definition.key] = trimmed;
                    }
                }
            });
            block.customFields
                .map((field) => ({ key: utils.trimString(field.key), value: field.value }))
                .filter((field) => field.key)
                .forEach((field) => {
                    const parsed = parseMaybeNumber(field.value);
                    if (parsed !== '') {
                        payload[field.key] = parsed;
                    }
                });
            return payload;
        }

        attachCommonHandlers({
            addButton: addBlockButton,
            resetButton,
            copyButton,
            downloadButton,
            importButton,
            importInput,
            previewArea,
            onAdd: () => {
                state.blocks.push(createEmptyBlock());
                renderBlocks();
                requestPreviewUpdate();
            },
            onReset: () => {
                state.title = '';
                if (titleField) {
                    titleField.value = '';
                }
                state.metadata = [];
                state.blocks = [createEmptyBlock()];
                render();
            },
            onDownload: () => {
                utils.downloadJson(LESSON_FILENAME, previewArea?.value || '');
            },
            onImport: importJson
        });

        builderRoot.dataset.initialized = 'true';
        workspace.lessonImport = importJson;
        workspace.lessonCompose = composeLessonPayload;
        render();
    }

    function createCustomFieldRow(field, onKeyChange, onValueChange, onRemove) {
        const row = utils.createElement('div', { classNames: 'custom-field-row' });
        row.appendChild(
            utils.createInputField({
                label: 'Key',
                value: field.key,
                onInput: onKeyChange
            }).wrapper
        );
        row.appendChild(
            utils.createInputField({
                label: 'Value',
                value: field.value,
                onInput: onValueChange
            }).wrapper
        );
        row.appendChild(
            utils.createInlineButton({
                label: 'Remove',
                icon: 'close',
                onClick: onRemove
            })
        );
        return row;
    }

    function attachCommonHandlers({
        addButton,
        resetButton,
        copyButton,
        downloadButton,
        importButton,
        importInput,
        previewArea,
        onAdd,
        onReset,
        onDownload,
        onImport
    }) {
        if (addButton) {
            addButton.addEventListener('click', onAdd);
        }
        if (resetButton) {
            resetButton.addEventListener('click', onReset);
        }
        if (copyButton && previewArea) {
            copyButton.addEventListener('click', async () => {
                await utils.copyToClipboard(previewArea.value);
                flashButton(copyButton, '<span class="material-symbols-outlined">check</span><span>Copied</span>');
            });
        }
        if (downloadButton) {
            downloadButton.addEventListener('click', onDownload);
        }
        if (importButton && importInput) {
            utils.attachFilePicker(importButton, importInput, onImport);
        }
    }

    function stringifyValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value);
            } catch (error) {
                return '';
            }
        }
        return String(value);
    }

    function parseMaybeNumber(value) {
        if (value === '' || value === null || value === undefined) {
            return '';
        }
        const trimmed = String(value).trim();
        if (trimmed === '') {
            return '';
        }
        const number = Number(trimmed);
        return Number.isFinite(number) ? number : trimmed;
    }

    function flashButton(button, html) {
        const original = button.innerHTML;
        button.disabled = true;
        button.innerHTML = html;
        setTimeout(() => {
            button.innerHTML = original;
            button.disabled = false;
        }, 1500);
    }

    global.initAndroidTutorialsWorkspace = initAndroidTutorialsWorkspace;
})(typeof window !== 'undefined' ? window : globalThis);
