const photoContainer = document.querySelector(".photo-container");
const musicElement = document.getElementById("music");

const musicToggleBtn = document.getElementById("music-toggle");
const slideshowPauseBtn = document.getElementById("slideshow-pause");
const slideshowPlayBtn = document.getElementById("slideshow-play");

const currentPhotoIndexContainer = document.getElementById("current-photo-index");
const totalPhotosContainer = document.getElementById("total-photos");

let images = [];
let musics = [];
let slideshowPaused = false;

const ANIMATION_DURATION = 6000;
const OVERLAP_DELAY = ANIMATION_DURATION * 0.8;

// --- Ordre aléatoire ---
let imageOrder = [];
let musicOrder = [];
let currentImageIndex = 0;
let currentMusicIndex = 0;

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function prepareRandomOrder() {
  imageOrder = shuffleArray(images.map((_, i) => i));
  musicOrder = shuffleArray(musics.map((_, i) => i));
  currentImageIndex = 0;
  currentMusicIndex = 0;
}

// --- Chargement fichiers ---
async function loadFiles() {
  try {
    const res = await fetch("/files.json");
    const data = await res.json();
    images = data.images || [];
    musics = data.music || [];

    prepareRandomOrder();
    currentPhotoIndexContainer.textContent = currentImageIndex + 1;
    totalPhotosContainer.textContent = imageOrder.length;

    // Initialiser la première musique si disponible
    if (musics.length) {
      musicElement.src = musics[musicOrder[currentMusicIndex]];
    }

    startSlideshow();
  } catch (err) {
    console.error("Erreur chargement des fichiers :", err);
  }
}

// --- Musique ---
function playNextMusic() {
  if (!musics.length) return;

  currentMusicIndex++;
  if (currentMusicIndex >= musicOrder.length) currentMusicIndex = 0;

  musicElement.src = musics[musicOrder[currentMusicIndex]];
  musicElement.play().catch(err => console.log("Lecture bloquée :", err));
}

function toggleMusic() {
  if (musicElement.paused) {
    musicElement.play().catch(err => console.log("Lecture bloquée :", err));
    setMusicIconPlaying();
  } else {
    musicElement.pause();
    setMusicIconPaused();
  }
}

function setMusicIconPlaying() {
  musicToggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white">
    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
  </svg>`;
}

function setMusicIconPaused() {
  musicToggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white">
    <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
  </svg>`;
}

musicToggleBtn.addEventListener("click", toggleMusic);

// --- Diaporama ---
function showNextPhoto() {
  if (!images.length || slideshowPaused) return;

  const idx = imageOrder[currentImageIndex];
  const newPhoto = document.createElement("img");
  newPhoto.src = images[idx];
  newPhoto.classList.add(`photo-${currentImageIndex}`);
  newPhoto.classList.add("animate-photo");

  Object.assign(newPhoto.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) scale(0.5) rotate(-10deg)",
    transformOrigin: "center center",
    maxWidth: "90%",
    maxHeight: "90%",
    opacity: 0,
  });

  photoContainer.appendChild(newPhoto);
  currentPhotoIndexContainer.textContent = currentImageIndex + 1;

  setTimeout(() => {
    const photos = photoContainer.querySelectorAll("img");
    if (photos.length > 1) photos[0].remove();
  }, ANIMATION_DURATION);

  // Passer à la photo suivante
  currentImageIndex++;
  if (currentImageIndex >= imageOrder.length) currentImageIndex = 0;

  setTimeout(() => showNextPhoto(), OVERLAP_DELAY);
}

function startSlideshow() {
  slideshowPaused = false;
  slideshowPauseBtn.style.display = "inline-block";
  slideshowPlayBtn.style.display = "none";
  setSlideshowIconPlaying();
  showNextPhoto();
}

function pauseSlideshow() {
  slideshowPaused = true;
  slideshowPauseBtn.style.display = "none";
  slideshowPlayBtn.style.display = "inline-block";
  setSlideshowIconPaused();
}

function freezAnimation() {
  const status = slideshowPaused ? "running" : "paused";
  document.querySelector(`photo-${currentImageIndex}`).style.animationPlayState = status;
}

function setSlideshowIconPlaying() {
  slideshowPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white">
    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
  </svg>`;
}

function setSlideshowIconPaused() {
  slideshowPlayBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white">
    <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
  </svg>`;
}

slideshowPauseBtn.addEventListener("click", () => {
  // freezAnimation();
  pauseSlideshow();
});
slideshowPlayBtn.addEventListener("click", () => {
  // freezAnimation();
  startSlideshow;
});

loadFiles();
