// ── Active nav on scroll ─────────────────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    }
  });
}, { rootMargin: '-20% 0px -60% 0px' });

sections.forEach(s => observer.observe(s));


// ── Now feed ─────────────────────────────────────────────────
async function loadNow() {
  const feed = document.getElementById('now-feed');
  if (!feed) return;
  try {
    const res = await fetch('/data/now.json?v=' + Date.now());
    const entries = await res.json();
    if (!entries.length) {
      feed.innerHTML = '<p class="empty-note">Nothing here yet. Check back soon.</p>';
      return;
    }
    feed.innerHTML = entries.map(e => {
      const thumb = e.thumb ? `
        <a class="now-thumb" ${e.url ? `href="${e.url}"` : ''} target="_blank" rel="noopener">
          <img src="${e.thumb}" alt="${e.title} cover" loading="lazy">
        </a>` : '';
      const titleHtml = e.url
        ? `<a href="${e.url}" target="_blank" rel="noopener">${e.title}</a>`
        : e.title;
      return `
        <article class="now-entry">
          ${thumb}
          <div class="now-body">
            <span class="tag tag-${e.tag}">${e.tag}</span>
            <h3>${titleHtml}</h3>
            <p>${e.body}</p>
          </div>
        </article>`;
    }).join('');
  } catch (err) {
    feed.innerHTML = '<p class="empty-note">Could not load entries.</p>';
  }
}


// ── Writing list ─────────────────────────────────────────────
async function loadWriting() {
  const list = document.getElementById('writing-list');
  if (!list) return;
  try {
    const res = await fetch('/data/writing.json?v=' + Date.now());
    const posts = await res.json();
    if (!posts.length) {
      list.innerHTML = '<p class="empty-note">Nothing here yet. Check back soon.</p>';
      return;
    }
    list.innerHTML = posts.map(p => `
      <article class="writing-entry">
        <span class="writing-date">${p.date}</span>
        <h3><a href="/writing/post.html?slug=${p.slug}">${p.title}</a></h3>
        <p>${p.description}</p>
      </article>`).join('');
  } catch (err) {
    list.innerHTML = '<p class="empty-note">Could not load posts.</p>';
  }
}


// ── Photo carousel ────────────────────────────────────────────
const ALL_PHOTOS = [
  'IMG_0947.jpg','IMG_0953.jpg','IMG_0958.jpg','IMG_0998.jpg',
  'IMG_1026.jpg','IMG_1061.jpg','IMG_1068.jpg','IMG_1089.jpg',
  'IMG_1196.jpg','IMG_1200.jpg','IMG_1255.jpg','IMG_1265.jpg',
  'IMG_1268.jpg','IMG_1271.jpg','IMG_1296.jpg','IMG_1319.jpg',
  'IMG_1337.jpg','IMG_1351.jpg','IMG_1377.jpg','IMG_1413.jpg',
  'IMG_1428.jpg','IMG_1435.jpg','IMG_1454.jpg','IMG_1455.jpg',
  'IMG_1512.jpg','IMG_1576.jpg','IMG_1590.jpg','IMG_1608.jpg',
  'IMG_1614.jpg','IMG_1659.jpg','IMG_1666.jpg','IMG_1678.jpg',
  'IMG_1716.jpg','IMG_1720.jpg','IMG_1791.jpg','IMG_1832.jpg',
  'IMG_1838.jpg','IMG_1893.jpg','IMG_1921.jpg','IMG_1932.jpg',
  'IMG_1944.jpg','IMG_1949.jpg','IMG_1958.jpg','IMG_1980.jpg',
  'IMG_2032.jpg','IMG_2039.jpg','IMG_2078.jpg','IMG_2079.jpg',
  'IMG_2084.jpg','IMG_2111.jpg','IMG_2116.jpg','IMG_2123.jpg',
  'IMG_2125.jpg','IMG_2140.jpg','IMG_2143.jpg','IMG_2149.jpg',
  'IMG_2163.jpg','IMG_2331.jpg','IMG_2365.jpg','IMG_2405.jpg',
  'IMG_2443.jpg','IMG_2447.jpg','IMG_2470.jpg','IMG_2479.jpg',
  'IMG_2511.jpg','IMG_2515.jpg','IMG_2521.jpg','IMG_2525.jpg',
  'IMG_2555.jpg','IMG_2563.jpg','IMG_2614.jpg','7205558662764279150.jpg',
];

const SHOW = 6;

function pickRandom(arr, n) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

const track  = document.getElementById('carousel-track');
const dotsEl = document.getElementById('carousel-dots');

if (track) {
  const chosen = pickRandom(ALL_PHOTOS, SHOW);
  chosen.forEach(file => {
    const img = document.createElement('img');
    img.src = `photos/${file}`;
    img.alt = '';
    track.appendChild(img);
  });

  const dots = chosen.map((_, i) => {
    const btn = document.createElement('button');
    btn.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    btn.setAttribute('aria-label', `Photo ${i + 1}`);
    btn.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(btn);
    return btn;
  });

  let current = 0;

  function goTo(n) {
    current = (n + chosen.length) % chosen.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  document.querySelector('.carousel-prev').addEventListener('click', () => goTo(current - 1));
  document.querySelector('.carousel-next').addEventListener('click', () => goTo(current + 1));
  setInterval(() => goTo(current + 1), 5000);
}

// ── Init ─────────────────────────────────────────────────────
loadNow();
loadWriting();
