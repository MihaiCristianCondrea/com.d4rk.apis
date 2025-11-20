import { fetchCommitPatch } from '@/services/githubService';
import { parseGithubCommitUrl } from '@/domain/treeUtils';

export function initGitPatch() {
    const form = document.getElementById('gitPatchForm');
    const urlInput = document.getElementById('commitUrl');
    const tokenInput = document.getElementById('githubToken');
    const getPatchButton = document.getElementById('getPatchButton');
    const errorContainer = document.getElementById('gitPatchError');
    const resultContainer = document.getElementById('gitPatchResult');
    const downloadPatchButton = document.getElementById('downloadPatchButton');
    const copyPatchButton = document.getElementById('copyPatchButton');
    const patchOutput = document.getElementById('patchOutput');

    let patchContent = '';

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            setError(null);
            setPatchContent('');
            setLoading(true);

            const parsed = parseGithubCommitUrl(urlInput.value);
            if (!parsed) {
                setError('Invalid Commit URL. Format: https://github.com/owner/repo/commit/sha');
                setLoading(false);
                return;
            }

            try {
                const content = await fetchCommitPatch(parsed, tokenInput.value);
                setPatchContent(content);
                resultContainer.style.display = 'block';
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        });
    }

    if (downloadPatchButton) {
        downloadPatchButton.addEventListener('click', downloadPatch);
    }

    if (copyPatchButton) {
        copyPatchButton.addEventListener('click', copyToClipboard);
    }

    function setLoading(isLoading) {
        if (isLoading) {
            getPatchButton.setAttribute('disabled', 'true');
        } else {
            getPatchButton.removeAttribute('disabled');
        }
    }

    function setError(message) {
        if (message) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
        } else {
            errorContainer.style.display = 'none';
        }
    }

    function setPatchContent(content) {
        patchContent = content;
        patchOutput.textContent = content;
    }

    function copyToClipboard() {
        if (!patchContent) return;
        navigator.clipboard.writeText(patchContent).then(() => {
            const originalText = copyPatchButton.textContent;
            copyPatchButton.textContent = 'Copied!';
            setTimeout(() => {
                copyPatchButton.textContent = originalText;
            }, 2000);
        });
    }

    function downloadPatch() {
        if (!patchContent) return;
        const blob = new Blob([patchContent], { type: 'text/plain' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        const parsed = parseGithubCommitUrl(urlInput.value);
        const filename = parsed ? `${parsed.repo}-${parsed.commitSha.substring(0, 7)}.patch` : 'git-patch.patch';
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
    }
}
