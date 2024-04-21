// app.js
const loginButton = document.getElementById('loginButton');
const usernameElement = document.getElementById('username');
const likedSongsElement = document.getElementById('likedSongs');
const refreshLikedSongsButton = document.getElementById('refreshLikedSongsButton');
let likedSongs = [];
let currentAudio = null;
let cachedLikedSongs = [];

loginButton.addEventListener('click', () => {
    window.location.href = '/login';
});

refreshLikedSongsButton.addEventListener('click', () => {
    fetchUserData();
});

const progressOverlay = document.getElementById('progressOverlay');

const storedUserData = localStorage.getItem('userData');
if (storedUserData) {
    const {userProfile, likedSongs: storedLikedSongs} = JSON.parse(storedUserData);
    usernameElement.textContent = userProfile.display_name;
    loginButton.style.display = 'none';
    refreshLikedSongsButton.style.display = 'inline-block';
    likedSongs = storedLikedSongs;
    cachedLikedSongs = storedLikedSongs;
    displayTotalSongs();
    displayRandomSongs();
} else {
    // Check if the user is logged in
    fetch('/check-login')
        .then(response => response.json())
        .then(data => {
            if (data.loggedIn) {
                // If the user is logged in, fetch the user data
                fetchUserData();
            } else {
                // If the user is not logged in, hide the progress overlay
                progressOverlay.classList.add('hidden');
            }
        })
        .catch(error => {
            console.error('Error checking login status:', error);
            // Handle the error appropriately, e.g., show an error message
        });
}

function fetchUserData() {
    progressOverlay.classList.remove('hidden');
    const eventSource = new EventSource('/user-data');

    eventSource.addEventListener('complete', (event) => {
        const data = JSON.parse(event.data);
        const {userProfile, likedSongs: fetchedLikedSongs} = data;
        usernameElement.textContent = userProfile.display_name;
        loginButton.style.display = 'none';
        refreshLikedSongsButton.style.display = 'inline-block';
        likedSongs = fetchedLikedSongs;
        cachedLikedSongs = fetchedLikedSongs;
        localStorage.setItem('userData', JSON.stringify({userProfile, likedSongs: fetchedLikedSongs}));
        displayTotalSongs();
        displayRandomSongs();
        progressOverlay.classList.add('hidden');
        eventSource.close();
    });
}

function displayTotalSongs() {
    const totalSongsElement = document.getElementById('totalSongs');
    totalSongsElement.textContent = likedSongs.length;
}

function displayRandomSongs() {
    likedSongsElement.innerHTML = '';
    const randomSongs = getRandomItems(likedSongs, 9);
    randomSongs.forEach(renderSongItem);
}

function renderSongItem(song) {
    const li = document.createElement('li');
    li.classList.add('song-item');
    li.innerHTML = `
        <img src="${song.track.album.images[0].url}" alt="${song.track.album.name}" class="album-artwork">
        <h3 class="text-xl font-semibold mb-2">${song.track.name}</h3>
        <p class="text-gray-300">${song.track.artists[0].name}</p>
        <div class="flex items-center mt-4">
            <audio id="audio-${song.track.id}" src="${song.track.preview_url}"></audio>
            <button class="play-button bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-green-400 transition duration-300 ease-in-out transform hover:scale-105" data-song-id="${song.track.id}">
                <i class="fas fa-play mr-2"></i> Play Preview
            </button>
        </div>
    `;

    const playButton = li.querySelector('.play-button');
    playButton.addEventListener('click', (event) => {
        event.stopPropagation();
        handlePlayButtonClick(song.track.id);
    });

    const albumArtwork = li.querySelector('.album-artwork');
    albumArtwork.addEventListener('click', () => {
        showSongDetail(song);
    });

    likedSongsElement.appendChild(li);
}

function handlePlayButtonClick(songId) {
    const audioElement = document.getElementById(`audio-${songId}`);
    const playButton = audioElement.parentElement.querySelector('.play-button');

    if (audioElement.paused) {
        if (currentAudio && !currentAudio.paused) {
            currentAudio.pause();
            const currentPlayButton = currentAudio.parentElement.querySelector('.play-button');
            currentPlayButton.innerHTML = '<i class="fas fa-play mr-2"></i> Play Preview';
        }
        audioElement.play();
        playButton.innerHTML = '<i class="fas fa-pause mr-2"></i> Pause';
        currentAudio = audioElement;
    } else {
        audioElement.pause();
        playButton.innerHTML = '<i class="fas fa-play mr-2"></i> Play Preview';
        currentAudio = null;
    }
}

function getRandomItems(arr, count) {
    const shuffled = arr.slice();
    let i = arr.length;
    let min = i - count;
    let temp;
    let index;
    while (i-- > min) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
    return shuffled.slice(min);
}

function showSongDetail(song) {
    const songDetailContainer = document.getElementById('songDetailContainer');
    const songDetailNameElement = document.getElementById('songDetailName');
    const songDetailArtistElement = document.getElementById('songDetailArtist');
    const songDetailImageElement = document.getElementById('songDetailImage');

    songDetailNameElement.textContent = song.track.name;
    songDetailArtistElement.textContent = song.track.artists[0].name;
    songDetailImageElement.src = song.track.album.images[0].url;
    songDetailImageElement.alt = song.track.album.name;

    songDetailContainer.classList.remove('hidden');

    if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        const currentPlayButton = currentAudio.parentElement.querySelector('.play-button');
        currentPlayButton.innerHTML = '<i class="fas fa-play mr-2"></i> Play Preview';
    }

    // Create an audio element for the song snippet
    const audioElement = document.createElement('audio');
    audioElement.src = song.track.preview_url;
    audioElement.autoplay = true;
    currentAudio = audioElement;

    const mainElement = document.querySelector('main');
    mainElement.classList.add('hidden');

    // Push a new state to the browser history
    history.pushState({songId: song.track.id}, '', `/song/${song.track.id}`);

    smoothScrollToTop();
}

function smoothScrollToTop() {
    const currentPosition = window.pageYOffset;
    if (currentPosition > 0) {
        window.requestAnimationFrame(smoothScrollToTop);
        window.scrollTo(0, currentPosition - currentPosition / 8);
    }
}

const refreshButton = document.getElementById('refreshButton');
refreshButton.addEventListener('click', () => {
    displayRandomSongs();
});

window.addEventListener('popstate', () => {
    const songDetailContainer = document.getElementById('songDetailContainer');
    const mainElement = document.querySelector('main');

    if (songDetailContainer.classList.contains('hidden')) {
        return;
    }

    songDetailContainer.classList.add('hidden');
    mainElement.classList.remove('hidden');

    // Stop the song snippet if it's playing
    if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        currentAudio = null;
    }
});