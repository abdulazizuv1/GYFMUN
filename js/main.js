/* ─────────────────────────────────────────────────────────────────────────────
   GYFMUN — main.js
   Handles: particles, scroll reveal, smooth scroll, form validation + Firebase
───────────────────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Particles ───────────────────────────────────────────────────────────── */
  const hero = document.getElementById('hero');
  if (hero) {
    const PARTICLE_COUNT = 60;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      p.style.cssText = [
        `left:${Math.random() * 100}%`,
        `top:${Math.random() * 100}%`,
        `animation-delay:${(Math.random() * 8).toFixed(2)}s`,
        `animation-duration:${(5 + Math.random() * 7).toFixed(2)}s`,
        `opacity:${(0.2 + Math.random() * 0.5).toFixed(2)}`,
        `width:${Math.random() < 0.3 ? '4px' : '2px'}`,
        `height:${Math.random() < 0.3 ? '4px' : '2px'}`,
      ].join(';');
      hero.appendChild(p);
    }
  }

  /* ── Scroll Reveal (Intersection Observer) ───────────────────────────────── */
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach(el => revealObserver.observe(el));

  /* ── Smooth scroll for CTA ───────────────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ── Form logic ──────────────────────────────────────────────────────────── */
  const form      = document.getElementById('reg-form');
  const submitBtn = document.getElementById('submit-btn');
  const successEl = document.getElementById('success-screen');
  const errorBanner = document.getElementById('form-error-banner');

  if (!form) return;

  /* Validation helpers */
  function setError(fieldId, show) {
    const group = document.querySelector(`#${fieldId}`)?.closest('.form-group');
    const errEl = document.getElementById(`err-${fieldId}`);
    if (!group) return;
    group.classList.toggle('has-error', show);
    if (errEl) errEl.style.display = show ? 'block' : 'none';
  }

  function clearAllErrors() {
    form.querySelectorAll('.form-group').forEach(g => g.classList.remove('has-error'));
    form.querySelectorAll('.error-msg').forEach(e => e.style.display = 'none');
    errorBanner.classList.remove('visible');
  }

  /* Clear error on input */
  form.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => {
      const group = el.closest('.form-group');
      if (group && group.classList.contains('has-error')) {
        group.classList.remove('has-error');
        const errEl = group.querySelector('.error-msg');
        if (errEl) errEl.style.display = 'none';
      }
    });
  });

  function validateForm() {
    clearAllErrors();
    let valid = true;

    const fullName    = form.fullName.value.trim();
    const email       = form.email.value.trim();
    const studyPlace  = form.studyPlace.value.trim();
    const telegram    = form.telegram.value.trim();
    const phone       = form.phone.value.trim();
    const whyDelegate = form.whyDelegate.value.trim();
    const munCountRaw = form.munCount.value.trim();
    const consent     = form.consent.checked;

    if (!fullName) {
      setError('fullName', true);
      valid = false;
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRe.test(email)) {
      setError('email', true);
      valid = false;
    }

    if (!studyPlace) {
      setError('studyPlace', true);
      valid = false;
    }

    if (!telegram || !telegram.startsWith('@') || telegram.length < 2) {
      setError('telegram', true);
      valid = false;
    }

    if (!phone) {
      setError('phone', true);
      valid = false;
    }

    if (!whyDelegate) {
      setError('whyDelegate', true);
      valid = false;
    }

    /* munCount must be a non-negative integer */
    const munCountNum = Number(munCountRaw);
    if (
      munCountRaw === '' ||
      !Number.isInteger(munCountNum) ||
      munCountNum < 0
    ) {
      setError('munCount', true);
      valid = false;
    }

    if (!consent) {
      setError('consent', true);
      valid = false;
    }

    return valid;
  }

  /* Submit */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      /* Scroll to first error */
      const firstError = form.querySelector('.has-error');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    /* Check Firebase is initialised */
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
      errorBanner.textContent = 'Ошибка конфигурации: Firebase не инициализирован. Пожалуйста, заполните firebase-config.js.';
      errorBanner.classList.add('visible');
      return;
    }

    setLoading(true);

    const payload = {
      fullName:        form.fullName.value.trim(),
      email:           form.email.value.trim(),
      studyPlace:      form.studyPlace.value.trim(),
      telegram:        form.telegram.value.trim(),
      phone:           form.phone.value.trim(),
      countryPref:     form.countryPref.value.trim(),
      whyDelegate:     form.whyDelegate.value.trim(),
      munCount:        parseInt(form.munCount.value, 10),
      munExperience:   form.munExperience.value.trim(),
      committee:       'Совет Безопасности',
      consentAccepted: true,
      submittedAt:     firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
      await firebase.firestore().collection('applications').add(payload);
      showSuccess();
    } catch (err) {
      console.error('Firestore error:', err);
      errorBanner.textContent = `Не удалось отправить заявку: ${err.message}. Попробуйте ещё раз.`;
      errorBanner.classList.add('visible');
      setLoading(false);
    }
  });

  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle('loading', on);
  }

  function showSuccess() {
    const formCard = document.getElementById('form-wrapper');
    form.style.display = 'none';
    successEl.classList.remove('hidden');
    formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

});
