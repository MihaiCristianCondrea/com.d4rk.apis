/**
 * @file UI controller for App Toolkit GitHub dialog interactions.
 */

/**
 * Wires dialog, token file and step navigation events.
 *
 * @param {object} deps Dependencies.
 * @returns {void}
 */
export function wireGithubDialogController(deps) {
  const {
    githubTokenFileButton, githubTokenFileInput, clearGithubStatus, shouldForceGithubTokenFilePicker,
    supportsFileSystemAccess, tryReuseStoredGithubTokenHandle, tryReuseFallbackGithubTokenFile,
    pickGithubTokenFileWithFsAccess, handleGithubTokenFileSelection,
    githubWizardButton, githubDialog, setGithubStep, setLoadingState, githubNextButton,
    githubBackButton, getGithubStepIndex, validateGithubToken, githubTokenInput, setGithubStatus,
    parseRepository, githubRepoInput, updateDiffSheet, publishToGithub
  } = deps;

  if (githubTokenFileButton && githubTokenFileInput) {
    githubTokenFileButton.addEventListener('click', async (event) => {
      clearGithubStatus();
      const forcePicker = shouldForceGithubTokenFilePicker(event);
      if (!forcePicker) {
        const reused = supportsFileSystemAccess ? await tryReuseStoredGithubTokenHandle() : await tryReuseFallbackGithubTokenFile();
        if (reused) return;
      }
      if (supportsFileSystemAccess) {
        const handled = await pickGithubTokenFileWithFsAccess();
        if (handled) return;
      }
      githubTokenFileInput.value = '';
      githubTokenFileInput.click();
    });

    githubTokenFileInput.addEventListener('change', async () => {
      const file = githubTokenFileInput.files && githubTokenFileInput.files[0];
      if (file) {
        clearGithubStatus();
        await handleGithubTokenFileSelection(file);
      }
    });
  }

  if (githubWizardButton && githubDialog) {
    githubWizardButton.addEventListener('click', () => {
      clearGithubStatus();
      setGithubStep(0);
      if (typeof AppDialogs !== 'undefined' && AppDialogs && typeof AppDialogs.rememberTrigger === 'function') {
        AppDialogs.rememberTrigger(githubDialog, document.activeElement);
      }
      githubDialog.open = true;
    });
  }

  if (githubDialog) {
    ['close', 'cancel'].forEach((eventName) => githubDialog.addEventListener(eventName, () => {
      setGithubStep(0);
      clearGithubStatus();
      setLoadingState(githubNextButton, false);
    }));
  }

  if (githubBackButton) {
    githubBackButton.addEventListener('click', () => {
      if (getGithubStepIndex() > 0) {
        setGithubStep(getGithubStepIndex() - 1);
        clearGithubStatus();
      }
    });
  }

  if (githubNextButton) {
    githubNextButton.addEventListener('click', async () => {
      clearGithubStatus();
      const index = getGithubStepIndex();
      if (index === 0) {
        try { validateGithubToken(githubTokenInput ? githubTokenInput.value : ''); setGithubStep(1); } catch (error) { setGithubStatus({ status: 'error', message: error.message }); }
        return;
      }
      if (index === 1) {
        try { parseRepository(githubRepoInput ? githubRepoInput.value : ''); } catch (error) { setGithubStatus({ status: 'error', message: error.message }); return; }
        setGithubStep(2);
        updateDiffSheet();
        return;
      }
      await publishToGithub();
    });
  }
}
