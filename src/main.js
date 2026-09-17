import './style.css';
import { marked } from 'marked';
import artifact from './letter.enc.json';
import { decryptLetter } from './crypto.js';
import { testimonials } from './testimonials.js';
import heroPhotoUrl from './assets/user-2.png';

marked.setOptions({ breaks: true, gfm: true });

const FADE_MS = 500;
const GATE_CLOSE_MS = 450;
const ID_CARD_CLOSE_MS = 250;
const COPY_TOAST_MS = 1600;
const COPY_TOAST_CLOSE_MS = 250;
const FONT_SCALE_MIN = 0.8;
const FONT_SCALE_MAX = 1.6;
const FONT_SCALE_STEP = 0.1;

const heroEl = document.getElementById('hero');
const heroCta = document.getElementById('hero-cta');
const form = document.getElementById('gate-form');
const passwordInput = document.getElementById('password');
const errorEl = document.getElementById('gate-error');
const letterEl = document.getElementById('letter');
const letterContentEl = document.getElementById('letter-content');
const letterBackBtn = document.getElementById('letter-back');
const letterFontDecreaseBtn = document.getElementById('letter-font-decrease');
const letterFontIncreaseBtn = document.getElementById('letter-font-increase');
const letterCopyBtn = document.getElementById('letter-copy');
const letterScrollTopBtn = document.getElementById('letter-scroll-top');
const stageEl = document.querySelector('.stage');
const copyToastOverlay = document.getElementById('copy-toast-overlay');
const testimonialTrack = document.getElementById('testimonial-track');
const heroPhotoImg = document.getElementById('hero-photo-img');
const heroPhotoBtn = document.getElementById('hero-photo-btn');
const idCardOverlay = document.getElementById('id-card-overlay');
const idCardImg = document.getElementById('id-card-img');
const idCardClose = document.getElementById('id-card-close');

heroPhotoImg.src = heroPhotoUrl;
idCardImg.src = heroPhotoUrl;

function renderTestimonials() {
  // 목록을 두 번 이어붙여 트랙을 절반씩 움직이면 이어붙인 지점이 티 나지 않는다
  for (const { name, role, logo, quote, rating } of [...testimonials, ...testimonials]) {
    const item = document.createElement('li');
    item.className = 'testimonial-card';

    const avatar = document.createElement('div');
    avatar.className = 'testimonial-avatar';
    avatar.innerHTML = logo; // 빌드에 포함된 로컬 로고 SVG만 주입, 외부 입력 없음
    item.appendChild(avatar);

    const body = document.createElement('div');
    body.className = 'testimonial-body';

    const quoteEl = document.createElement('p');
    quoteEl.className = 'testimonial-quote';
    quoteEl.textContent = quote;
    body.appendChild(quoteEl);

    const meta = document.createElement('p');
    meta.className = 'testimonial-meta';
    meta.textContent = `${name} · ${role}`;
    body.appendChild(meta);

    const ratingEl = document.createElement('p');
    ratingEl.className = 'testimonial-rating';
    ratingEl.textContent = `★ ${rating}`;
    body.appendChild(ratingEl);

    item.appendChild(body);
    testimonialTrack.appendChild(item);
  }
}

renderTestimonials();

function openGate() {
  form.hidden = false;
  heroCta.classList.add('is-active');
  void form.offsetWidth; // force reflow so the grow-out starts from the closed state
  requestAnimationFrame(() => {
    form.classList.add('is-open');
  });
  passwordInput.focus();
}

function closeGate() {
  form.classList.remove('is-open');
  heroCta.classList.remove('is-active');
  passwordInput.value = '';
  errorEl.classList.remove('is-visible');
  setTimeout(() => {
    form.hidden = true;
  }, GATE_CLOSE_MS);
}

function resetGate() {
  form.classList.remove('is-open');
  form.hidden = true;
  heroCta.classList.remove('is-active');
  passwordInput.value = '';
  errorEl.classList.remove('is-visible');
}

heroCta.addEventListener('click', () => {
  if (form.hidden) {
    openGate();
  } else {
    closeGate();
  }
});

let letterText = '';

function revealLetter(text) {
  letterText = text;
  letterContentEl.innerHTML = marked.parse(text);
  letterEl.hidden = false;
  letterEl.classList.add('is-entering');
  void letterEl.offsetWidth; // force reflow so the entering state is committed before we clear it
  requestAnimationFrame(() => {
    letterEl.classList.remove('is-entering');
  });

  heroEl.classList.add('is-leaving');
  setTimeout(() => {
    heroEl.hidden = true;
  }, FADE_MS);
}

function goBackToGate() {
  letterEl.classList.add('is-leaving');
  setTimeout(() => {
    letterEl.hidden = true;
    letterEl.classList.remove('is-leaving');
    letterContentEl.textContent = '';
  }, FADE_MS);

  resetGate();

  heroEl.classList.remove('is-leaving');
  heroEl.hidden = false;
  heroEl.classList.add('is-entering');
  void heroEl.offsetWidth; // force reflow so the entering state is committed before we clear it
  requestAnimationFrame(() => {
    heroEl.classList.remove('is-entering');
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorEl.classList.remove('is-visible');

  try {
    const text = await decryptLetter(artifact, passwordInput.value);
    revealLetter(text);
  } catch {
    errorEl.classList.add('is-visible');
  }
});

letterBackBtn.addEventListener('click', goBackToGate);

let fontScale = 1;

function applyFontScale() {
  letterContentEl.style.setProperty('--letter-scale', fontScale.toFixed(2));
  letterFontDecreaseBtn.disabled = fontScale <= FONT_SCALE_MIN;
  letterFontIncreaseBtn.disabled = fontScale >= FONT_SCALE_MAX;
}

letterFontDecreaseBtn.addEventListener('click', () => {
  fontScale = Math.max(FONT_SCALE_MIN, +(fontScale - FONT_SCALE_STEP).toFixed(2));
  applyFontScale();
});

letterFontIncreaseBtn.addEventListener('click', () => {
  fontScale = Math.min(FONT_SCALE_MAX, +(fontScale + FONT_SCALE_STEP).toFixed(2));
  applyFontScale();
});

applyFontScale();

let copyToastTimeoutId = null;

function openCopyToast() {
  clearTimeout(copyToastTimeoutId);
  copyToastOverlay.hidden = false;
  void copyToastOverlay.offsetWidth; // force reflow so the open transition starts from the closed state
  copyToastOverlay.classList.add('is-open');
  copyToastTimeoutId = setTimeout(closeCopyToast, COPY_TOAST_MS);
}

function closeCopyToast() {
  copyToastOverlay.classList.remove('is-open');
  setTimeout(() => {
    copyToastOverlay.hidden = true;
  }, COPY_TOAST_CLOSE_MS);
}

letterCopyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(letterText);
    openCopyToast();
  } catch {
    // clipboard unavailable; fail silently
  }
});

letterScrollTopBtn.addEventListener('click', () => {
  stageEl.scrollTo({ top: 0, behavior: 'smooth' });
});

copyToastOverlay.addEventListener('click', (event) => {
  if (event.target === copyToastOverlay) {
    clearTimeout(copyToastTimeoutId);
    closeCopyToast();
  }
});

function openIdCard() {
  idCardOverlay.hidden = false;
  void idCardOverlay.offsetWidth; // force reflow so the open transition starts from the closed state
  idCardOverlay.classList.add('is-open');
}

function closeIdCard() {
  idCardOverlay.classList.remove('is-open');
  setTimeout(() => {
    idCardOverlay.hidden = true;
  }, ID_CARD_CLOSE_MS);
}

heroPhotoBtn.addEventListener('click', openIdCard);
idCardClose.addEventListener('click', closeIdCard);
idCardOverlay.addEventListener('click', (event) => {
  if (event.target === idCardOverlay) {
    closeIdCard();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && idCardOverlay.classList.contains('is-open')) {
    closeIdCard();
  }
});
