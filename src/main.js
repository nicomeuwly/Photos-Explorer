// /src/main.js
const photoContainer = document.querySelector(".photo-container");
const musicElement = document.getElementById("music");

const musicToggleBtn = document.getElementById("music-toggle");
const slideshowToggleBtn =
  document.getElementById("slideshow-toggle") ||
  document.getElementById("slideshow-pause"); // compatibilité avec ton HTML

const currentPhotoIndexContainer = document.getElementById("current-photo-index");
const totalPhotosContainer = document.getElementById("total-photos");

let images = [];
let musics = [];
let slideshowPaused = false;

const ANIMATION_DURATION = 6000; // durée totale de l'animation (ms)
const OVERLAP_DELAY = ANIMATION_DURATION * 0.8; // quand lancer la suivante (80%)

// ordre aléatoire (déjà présent)
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

// scheduler / pause management
let nextPhotoTimeout = null;        // id du setTimeout planifié pour la prochaine photo
let nextPhotoDueTime = 0;           // timestamp (ms) où la prochaine photo doit arriver
let currentPhotoStartTime = 0;      // timestamp de démarrage de la photo actuelle
let remainingToNext = null;         // ms restants au moment de la pause

// --- Chargement fichiers ---
async function loadFiles() {
  try {
    // retire l'image statique initiale si elle existe (évite "image en bas à droite" résiduelle)
    const staticPhoto = document.getElementById("photo");
    if (staticPhoto) staticPhoto.remove();

    const res = await fetch("/files.json");
    const data = await res.json();
    images = data.images || [];
    musics = data.music || [];

    prepareRandomOrder();
    currentPhotoIndexContainer.textContent = currentImageIndex + 1;
    totalPhotosContainer.textContent = imageOrder.length;

    // Initialiser la première musique si disponible (mais ne pas l'auto-play)
    if (musics.length) {
      musicElement.src = musics[musicOrder[currentMusicIndex]];
    }

    startSlideshow();
  } catch (err) {
    console.error("Erreur chargement des fichiers :", err);
  }
}

// --- Musique ---
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
  if (!musicToggleBtn) return;
  musicToggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white">
    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
  </svg>`;
}
function setMusicIconPaused() {
  if (!musicToggleBtn) return;
  musicToggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white">
    <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
  </svg>`;
}

if (musicToggleBtn) musicToggleBtn.addEventListener("click", toggleMusic);

// --- Diaporama ---
// Affiche une nouvelle photo et planifie la suivante (mais n'écrit jamais de timers si paused)
function showNextPhoto() {
  if (!images.length || slideshowPaused) return;

  // clear any previously scheduled next to avoid duplicates
  if (nextPhotoTimeout) {
    clearTimeout(nextPhotoTimeout);
    nextPhotoTimeout = null;
  }

  // enregistrer l'instant de démarrage de la photo
  currentPhotoStartTime = Date.now();

  // index selon l'ordre pré-calculé
  const idx = imageOrder[currentImageIndex];
  const newPhoto = document.createElement("img");
  newPhoto.src = images[idx];

  // classe d'animation (déf. en CSS)
  newPhoto.classList.add("animate-photo");

  // style inline pour éviter flash non positionné
  Object.assign(newPhoto.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) scale(0.5) rotate(-10deg)",
    transformOrigin: "center center",
    maxWidth: "90%",
    maxHeight: "90%",
    opacity: 0,
    // si on est actuellement en pause, démarrer en paused (si on resume on remet en running)
    animationPlayState: slideshowPaused ? "paused" : "running",
  });

  // quand l'animation termine normalement -> supprimer l'élément (animationend est gelé si paused)
  newPhoto.addEventListener("animationend", () => {
    if (photoContainer.contains(newPhoto)) newPhoto.remove();
  }, { once: true });

  photoContainer.appendChild(newPhoto);
  // mise à jour de l'index affiché
  currentPhotoIndexContainer.textContent = currentImageIndex + 1;

  // Préparer l'index suivant
  currentImageIndex++;
  if (currentImageIndex >= imageOrder.length) currentImageIndex = 0;

  // planifier la suivante si on n'est pas en pause
  if (!slideshowPaused) {
    nextPhotoDueTime = currentPhotoStartTime + OVERLAP_DELAY;
    let delay = nextPhotoDueTime - Date.now();
    if (delay < 0) delay = 0;
    nextPhotoTimeout = setTimeout(showNextPhoto, delay);
  } else {
    // si on est en pause, on calcule le temps restant pour la prochaine photo
    remainingToNext = (currentPhotoStartTime + OVERLAP_DELAY) - Date.now();
    if (remainingToNext < 0) remainingToNext = 0;
  }
}

// start/reprise du slideshow
function startSlideshow() {
  if (!slideshowPaused && nextPhotoTimeout) {
    // déjà en cours
    return;
  }

  slideshowPaused = false;
  setSlideshowIconPlaying();

  // reprendre toutes les animations gelées
  document.querySelectorAll(".animate-photo").forEach(el => {
    el.style.animationPlayState = "running";
  });

  // si aucune photo n'a démarré, lancer immédiatement
  if (!currentPhotoStartTime) {
    showNextPhoto();
    return;
  }

  // sinon, planifier la suivante en tenant compte du temps restant (si on avait paussé)
  let toWait = null;
  if (remainingToNext !== null) {
    toWait = remainingToNext;
  } else {
    toWait = nextPhotoDueTime ? (nextPhotoDueTime - Date.now()) : OVERLAP_DELAY;
  }

  // éviter negative
  if (toWait <= 0) {
    showNextPhoto();
  } else {
    // sécuriser les timers précédents
    if (nextPhotoTimeout) { clearTimeout(nextPhotoTimeout); nextPhotoTimeout = null; }
    nextPhotoTimeout = setTimeout(showNextPhoto, toWait);
  }

  // reset remaining
  remainingToNext = null;
}

// pause du slideshow (freeze réel)
function pauseSlideshow() {
  if (slideshowPaused) return;
  slideshowPaused = true;
  setSlideshowIconPaused();

  // arrêter le timer de planification (s'il existe) et sauvegarder temps restant
  if (nextPhotoTimeout) {
    clearTimeout(nextPhotoTimeout);
    nextPhotoTimeout = null;
  }
  // calculer remaining à partir du nextPhotoDueTime (ou fallback)
  if (nextPhotoDueTime) {
    remainingToNext = nextPhotoDueTime - Date.now();
    if (remainingToNext < 0) remainingToNext = 0;
  } else {
    remainingToNext = OVERLAP_DELAY;
  }

  // geler toutes les animations en cours (les animationend seront aussi gelées)
  document.querySelectorAll(".animate-photo").forEach(el => {
    el.style.animationPlayState = "paused";
  });
}

// single toggle (bouton unique)
function toggleSlideshow() {
  if (slideshowPaused) startSlideshow();
  else pauseSlideshow();
}

if (slideshowToggleBtn) slideshowToggleBtn.addEventListener("click", toggleSlideshow);

// utilitaires icônes slideshow
function setSlideshowIconPlaying() {
  if (!slideshowToggleBtn) return;
  slideshowToggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white">
    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
  </svg>`;
}
function setSlideshowIconPaused() {
  if (!slideshowToggleBtn) return;
  slideshowToggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white">
    <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
  </svg>`;
}

loadFiles();
