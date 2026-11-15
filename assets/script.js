const header = document.querySelector('.header');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.nav');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  navigation?.classList.toggle('open', !isOpen);
});

navigation?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menuButton?.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('open');
}));

window.addEventListener('scroll', () => {
  header?.classList.toggle('scrolled', window.scrollY > 12);
}, { passive: true });

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .08 });

document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));

document.querySelectorAll('.faq details').forEach(item => {
  item.addEventListener('toggle', () => {
    if (!item.open) return;
    document.querySelectorAll('.faq details[open]').forEach(openItem => {
      if (openItem !== item) openItem.removeAttribute('open');
    });
  });
});

const blogCards = [...document.querySelectorAll('[data-blog-post]')];
const blogDate = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

fetch('content/blog-posts.json', { cache: 'no-store' })
  .then(response => {
    if (!response.ok) throw new Error(`Blog feed HTTP ${response.status}`);
    return response.json();
  })
  .then(data => {
    const posts = Array.isArray(data.items) ? data.items.slice(0, blogCards.length) : [];
    posts.forEach((post, index) => {
      const card = blogCards[index];
      const url = new URL(post.url);
      if (url.hostname !== 'blog.naver.com' || !url.pathname.startsWith('/ysukkim33/')) return;
      const publishedAt = new Date(post.publishedAt);
      card.href = url.href;
      card.querySelector('.tool-label').textContent = `BLOG · ${blogDate.format(publishedAt).replaceAll(' ', '').replace(/\.$/, '')}`;
      card.querySelector('h3').textContent = post.title;
      card.querySelector('p').textContent = post.excerpt;
    });
  })
  .catch(error => console.info('Using the verified blog fallback cards.', error.message));
