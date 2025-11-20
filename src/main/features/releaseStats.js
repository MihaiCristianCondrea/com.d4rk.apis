import { fetchReleaseStats } from '../services/githubService';
import { parseGithubUrl } from '../domain/treeUtils';

export function initReleaseStats() {
    const form = document.getElementById('releaseStatsForm');
    const urlInput = document.getElementById('repoUrl');
    const tokenInput = document.getElementById('githubToken');
    const analyzeButton = document.getElementById('analyzeButton');
    const errorContainer = document.getElementById('releaseStatsError');
    const resultContainer = document.getElementById('releaseStatsResult');
    const selectedReleaseName = document.getElementById('selectedReleaseName');
    const selectedReleaseMeta = document.getElementById('selectedReleaseMeta');
    const selectedReleaseDownloads = document.getElementById('selectedReleaseDownloads');
    const assetList = document.getElementById('assetList');
    const totalDownloads = document.getElementById('totalDownloads');
    const releaseList = document.getElementById('releaseList');

    let data = null;
    let selectedReleaseIndex = 0;

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            setData(null);

            const parsed = parseGithubUrl(urlInput.value);
            if (!parsed) {
                setError('Invalid GitHub URL. Format: https://github.com/owner/repo');
                setLoading(false);
                return;
            }

            try {
                const stats = await fetchReleaseStats(parsed, tokenInput.value);
                setData(stats);
                selectedReleaseIndex = 0;
                render();
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        });
    }

    function render() {
        if (!data) {
            resultContainer.style.display = 'none';
            return;
        }

        resultContainer.style.display = 'block';
        totalDownloads.textContent = data.totalDownloads.toLocaleString();

        renderReleaseList();
        renderSelectedRelease();
    }

    function renderReleaseList() {
        releaseList.innerHTML = '';
        data.releases.forEach((release, index) => {
            const item = document.createElement('div');
            item.className = `release-item ${index === selectedReleaseIndex ? 'selected' : ''}`;
            item.innerHTML = `
                <div class="release-info">
                    <span>${release.name || release.tagName}</span>
                    <span>${release.totalDownloads.toLocaleString()}</span>
                </div>
                <div class="progress-bar">
                    <div style="width: ${data.releases.length > 0 ? (release.totalDownloads / Math.max(...data.releases.map(r => r.totalDownloads))) * 100 : 0}%"></div>
                </div>
            `;
            item.addEventListener('click', () => {
                selectedReleaseIndex = index;
                render();
            });
            releaseList.appendChild(item);
        });
    }

    function renderSelectedRelease() {
        const activeRelease = data.releases[selectedReleaseIndex];
        if (!activeRelease) return;

        selectedReleaseName.textContent = activeRelease.name;
        selectedReleaseMeta.innerHTML = `
            <md-icon>label</md-icon>
            <span>${activeRelease.tagName}</span>
            <span>•</span>
            <span>${new Date(activeRelease.publishedAt).toLocaleDateString()}</span>
        `;
        selectedReleaseDownloads.innerHTML = `
            <span>Downloads</span>
            <span>${activeRelease.totalDownloads.toLocaleString()}</span>
        `;

        assetList.innerHTML = '';
        if (activeRelease.assets.length === 0) {
            assetList.innerHTML = '<p>No assets in this release.</p>';
            return;
        }

        const maxAssetDownloads = Math.max(...activeRelease.assets.map(a => a.downloads));
        activeRelease.assets.forEach(asset => {
            const item = document.createElement('div');
            item.className = 'asset-item';
            item.innerHTML = `
                <div class="asset-info">
                    <span>${asset.name}</span>
                    <span>${asset.downloads.toLocaleString()}</span>
                </div>
                <div class="progress-bar">
                    <div style="width: ${maxAssetDownloads > 0 ? (asset.downloads / maxAssetDownloads) * 100 : 0}%"></div>
                </div>
            `;
            assetList.appendChild(item);
        });
    }

    function setLoading(isLoading) {
        if (isLoading) {
            analyzeButton.setAttribute('disabled', 'true');
        } else {
            analyzeButton.removeAttribute('disabled');
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

    function setData(stats) {
        data = stats;
    }
}
