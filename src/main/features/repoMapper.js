import { fetchRepositoryTree } from '../services/githubService';
import { generateAsciiTree, generatePathList, parseGithubUrl } from '../domain/treeUtils';

export function initRepoMapper() {
    const form = document.getElementById('repoMapperForm');
    const urlInput = document.getElementById('repoUrl');
    const tokenInput = document.getElementById('githubToken');
    const generateButton = document.getElementById('generateMapButton');
    const errorContainer = document.getElementById('repoMapperError');
    const resultContainer = document.getElementById('repoMapperResult');
    const foldersCount = document.getElementById('foldersCount');
    const filesCount = document.getElementById('filesCount');
    const copyButton = document.getElementById('copyButton');
    const treeOutput = document.getElementById('treeOutput');
    const formatAscii = document.getElementById('formatAscii');
    const formatPaths = document.getElementById('formatPaths');

    let format = 'ascii';
    let rawPaths = [];

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            setError(null);
            setTreeOutput('');
            setLoading(true);
            rawPaths = [];

            const parsed = parseGithubUrl(urlInput.value);
            if (!parsed) {
                setError('Invalid GitHub URL. Expected format: https://github.com/owner/repo');
                setLoading(false);
                return;
            }

            try {
                const data = await fetchRepositoryTree(parsed, tokenInput.value);
                if (data.truncated) {
                    setError('Warning: The repository is massive. Output truncated by GitHub API.');
                }
                rawPaths = data.tree;
                renderTree();
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        });
    }

    if (formatAscii) {
        formatAscii.addEventListener('click', () => {
            format = 'ascii';
            formatAscii.classList.add('selected');
            formatPaths.classList.remove('selected');
            renderTree();
        });
    }

    if (formatPaths) {
        formatPaths.addEventListener('click', () => {
            format = 'paths';
            formatPaths.classList.add('selected');
            formatAscii.classList.remove('selected');
            renderTree();
        });
    }

    if (copyButton) {
        copyButton.addEventListener('click', copyToClipboard);
    }

    function renderTree() {
        if (rawPaths.length > 0) {
            let stats = { files: 0, folders: 0 };
            if (format === 'ascii') {
                setTreeOutput(generateAsciiTree(rawPaths, (s) => stats = s));
            } else {
                setTreeOutput(generatePathList(rawPaths, (s) => stats = s));
            }
            foldersCount.textContent = `${stats.folders} Folders`;
            filesCount.textContent = `${stats.files} Files`;
            resultContainer.style.display = 'block';
        }
    }

    function setLoading(isLoading) {
        if (isLoading) {
            generateButton.setAttribute('disabled', 'true');
        } else {
            generateButton.removeAttribute('disabled');
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

    function setTreeOutput(output) {
        treeOutput.textContent = output;
    }

    function copyToClipboard() {
        if (!treeOutput.textContent) return;
        navigator.clipboard.writeText(treeOutput.textContent).then(() => {
            const originalText = copyButton.textContent;
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
                copyButton.textContent = originalText;
            }, 2000);
        });
    }
}
