const COMMITTERS_RANKING_URL = 'https://committers.top/rank_only/romania.json';
const COMMITTERS_USERNAME = 'MihaiCristianCondrea';
const COMMITTERS_UPDATED_FALLBACK = 'Last updated: —';

function formatOrdinal(value) {
    const absValue = Math.abs(Number(value));
    if (!Number.isFinite(absValue)) {
        return `${value}`;
    }
    const mod100 = absValue % 100;
    if (mod100 >= 11 && mod100 <= 13) {
        return `${value}th`;
    }
    switch (absValue % 10) {
        case 1:
            return `${value}st`;
        case 2:
            return `${value}nd`;
        case 3:
            return `${value}rd`;
        default:
            return `${value}th`;
    }
}

function formatDataAsOf(rawValue) {
    if (typeof rawValue !== 'string') {
        return null;
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
        return null;
    }

    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s+([+-]\d{2})(\d{2})$/);
    if (match) {
        const [, datePart, timePart, tzHour, tzMinute] = match;
        const isoCandidate = `${datePart}T${timePart}${tzHour}:${tzMinute}`;
        const parsed = new Date(isoCandidate);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
        }
    }

    const fallbackParsed = new Date(trimmed);
    if (!Number.isNaN(fallbackParsed.getTime())) {
        return fallbackParsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    }

    return trimmed;
}

function updateCommittersStatus(statusElement, message, isError = false) {
    if (!statusElement) {
        return;
    }
    statusElement.textContent = message;
    statusElement.classList.toggle('error', Boolean(isError));
}

async function fetchCommittersRanking() {
    const rankElement = typeof getDynamicElement === 'function'
        ? getDynamicElement('committers-rank')
        : document.getElementById('committers-rank');
    const statusElement = typeof getDynamicElement === 'function'
        ? getDynamicElement('committers-status')
        : document.getElementById('committers-status');
    const updatedElement = typeof getDynamicElement === 'function'
        ? getDynamicElement('committers-updated')
        : document.getElementById('committers-updated');

    if (!rankElement || !statusElement) {
        return;
    }

    const defaultRankText = '—';
    rankElement.textContent = defaultRankText;
    updateCommittersStatus(statusElement, 'Checking latest ranking...', false);
    if (updatedElement) {
        updatedElement.textContent = COMMITTERS_UPDATED_FALLBACK;
    }

    try {
        const response = await fetch(COMMITTERS_RANKING_URL, {
            headers: {
                'Accept': 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok (status ${response.status})`);
        }

        const data = await response.json();
        const users = Array.isArray(data?.user) ? data.user : [];
        const userIndex = users.findIndex((username) => username === COMMITTERS_USERNAME);

        if (userIndex === -1) {
            updateCommittersStatus(statusElement, 'Mihai-Cristian Condrea is not listed in the current ranking.', true);
            return;
        }

        const rank = userIndex + 1;
        rankElement.textContent = `#${rank.toLocaleString(undefined)}`;
        updateCommittersStatus(statusElement, `Mihai-Cristian Condrea is currently ${formatOrdinal(rank)} in Romania's GitHub committers leaderboard.`, false);

        if (updatedElement) {
            const formattedTimestamp = formatDataAsOf(data?.data_asof);
            updatedElement.textContent = formattedTimestamp
                ? `Last updated: ${formattedTimestamp}`
                : COMMITTERS_UPDATED_FALLBACK;
        }
    } catch (error) {
        console.error('Committers ranking error:', error);
        updateCommittersStatus(statusElement, 'Ranking data is unavailable right now. Please try again later.', true);
        if (updatedElement) {
            updatedElement.textContent = COMMITTERS_UPDATED_FALLBACK;
        }
    }
}

if (typeof globalThis !== 'undefined') {
    globalThis.formatOrdinal = formatOrdinal;
    globalThis.formatDataAsOf = formatDataAsOf;
    globalThis.fetchCommittersRanking = fetchCommittersRanking;
    globalThis.updateCommittersStatus = updateCommittersStatus;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatOrdinal,
        formatDataAsOf,
        updateCommittersStatus,
        fetchCommittersRanking
    };
}
