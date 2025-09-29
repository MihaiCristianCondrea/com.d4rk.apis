
const youtubeChannelId = 'UCtzlWsxUK8FSvLwLDbESw4A';
async function fetchChannelVideos(channelId) {
    const url = `https://pipedapi.ducks.party/channel/${channelId}`;
    const resp = await fetch(url);
    if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`HTTP error! status: ${resp.status}, message: ${errorText}`);
    }
    const data = await resp.json();
    const streams = data.relatedStreams || [];
    return streams.map(v => ({
        title: v.title,
        artists: v.uploaderName,
        image: v.thumbnail,
        link: `https://www.youtube.com${v.url}`
    }));
}

async function loadSongs() {
    const grid = document.getElementById('songsGrid');
    const status = document.getElementById('songs-status');
    if (!grid) return;
    if (status) status.style.display = 'flex';
    grid.innerHTML = '';
    let tracks = [];
    try {
        tracks = await fetchChannelVideos(youtubeChannelId);
    } catch (err) {
        console.error('Failed to fetch songs list', err);
    }
    for (const track of tracks) {
        const img = track.image || 'assets/images/placeholder.png';
        const title = track.title;
        const artists = track.artists;
        const link = track.link;

        const card = document.createElement('div');
        card.className = 'song-card';
        card.innerHTML = `
            <img src="${img}" alt="${title}" loading="lazy">
            <div class="song-card-content">
                <h3>${title}</h3>
                <p>${artists}</p>
                <div class="song-card-links"><a href="${link}" target="_blank" rel="noopener noreferrer">YouTube</a></div>
            </div>`;
        grid.appendChild(card);
    }

    if (typeof SiteAnimations !== 'undefined' && SiteAnimations && typeof SiteAnimations.animateSongCards === 'function') {
        try {
            SiteAnimations.animateSongCards(grid.querySelectorAll('.song-card'));
        } catch (animationError) {
            console.error('Songs: Failed to animate song cards.', animationError);
        }
    }
    if (status) status.style.display = 'none';
}

// When router loads the page dynamically
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('songsGrid')) {
        loadSongs();
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchChannelVideos,
        loadSongs
    };
}
