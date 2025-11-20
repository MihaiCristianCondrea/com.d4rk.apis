export const parseGithubUrl = (inputUrl) => { // FIXME: Unused constant parseGithubUrl
    try {
        const cleanUrl = inputUrl.replace(/\/$/, ''); // Remove trailing slash
        const pattern = /github\.com\/([^/]+)\/([^/]+)/;
        const match = cleanUrl.match(pattern);
        if (match) {
            return { owner: match[1], repo: match[2] };
        }
        return null;
    } catch (e) {
        return null;
    }
};

export const parseGithubCommitUrl = (inputUrl) => { // FIXME: Unused constant parseGithubCommitUrl
    try {
        const cleanUrl = inputUrl.replace(/\/$/, '');
        const pattern = /github\.com\/([^/]+)\/([^/]+)\/commit\/([a-fA-F0-9]+)/;
        const match = cleanUrl.match(pattern);
        if (match) {
            return { owner: match[1], repo: match[2], commitSha: match[3] };
        }
        return null;
    } catch (e) {
        return null;
    }
};

export const generateAsciiTree = (paths, setStats) => { // FIXME: Unused constant generateAsciiTree
    const structure = {};
    let fileCount = 0;
    let folderCount = 0;

    paths.forEach(item => {
        if (item.type === 'blob') fileCount++;
        if (item.type === 'tree') folderCount++;

        const parts = item.path.split('/');
        let current = structure;

        parts.forEach((part, index) => {
            if (!current[part]) {
                current[part] = index === parts.length - 1 ? (item.type === 'blob' ? null : {}) : {};
            }
            const next = current[part];
            if (next !== null) {
                current = next;
            }
        });
    });

    setStats({ files: fileCount, folders: folderCount });

    let output = '';

    const buildString = (obj, prefix = '') => {
        const keys = Object.keys(obj).sort((a, b) => {
            const aIsFolder = obj[a] !== null;
            const bIsFolder = obj[b] !== null;

            if (aIsFolder && !bIsFolder) return -1;
            if (!aIsFolder && bIsFolder) return 1;
            return a.localeCompare(b);
        });

        keys.forEach((key, index) => {
            const isLast = index === keys.length - 1;
            const connector = isLast ? '└── ' : '├── ';

            output += `${prefix}${connector}${key}\n`;

            const child = obj[key];
            if (child !== null) {
                const childPrefix = prefix + (isLast ? '    ' : '│   ');
                buildString(child, childPrefix);
            }
        });
    };

    buildString(structure);
    return output;
};

export const generatePathList = (paths, setStats) => { // FIXME: Unused constant generatePathList
    let fileCount = 0;
    let folderCount = 0;
    const lines = paths.map(p => {
        if (p.type === 'blob') fileCount++;
        if (p.type === 'tree') folderCount++;
        return p.path;
    });
    setStats({ files: fileCount, folders: folderCount });
    return lines.join('\n');
};
