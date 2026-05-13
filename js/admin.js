/* ─────────────────────────────────────────────────────────────────────────────
   GYFMUN — admin.js
   Handles: Firebase Auth, dashboard, applications table, rating, modal
───────────────────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Safety guard ────────────────────────────────────────────────────────── */
  if (typeof firebase === 'undefined' || !firebase.apps.length) {
    const screen = document.getElementById('login-screen');
    if (screen) {
      screen.innerHTML = `
        <div class="login-card">
          <div class="login-logo">GYFMUN</div>
          <p class="login-subtitle" style="color:#e74c3c;margin-bottom:0;">
            Ошибка: Firebase не инициализирован.<br>
            Заполните <code>js/firebase-config.js</code> своими данными и перезагрузите страницу.
          </p>
        </div>`;
    }
    return;
  }

  const auth = firebase.auth();
  const db   = firebase.firestore();

  /* Cached applications array (sorted) */
  let applications = [];

  /* ── Auth state ──────────────────────────────────────────────────────────── */
  auth.onAuthStateChanged(user => {
    if (user) {
      showDashboard();
      loadApplications();
    } else {
      showLogin();
    }
  });

  /* ── Show / hide screens ─────────────────────────────────────────────────── */
  function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
  }

  function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
  }

  /* ── Login form ──────────────────────────────────────────────────────────── */
  const loginForm  = document.getElementById('login-form');
  const loginBtn   = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;

    loginError.classList.add('hidden');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Вход...';

    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      loginError.textContent = translateAuthError(err.code);
      loginError.classList.remove('hidden');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Войти';
    }
  });

  function translateAuthError(code) {
    const map = {
      'auth/invalid-email':      'Неверный формат email.',
      'auth/user-not-found':     'Пользователь не найден.',
      'auth/wrong-password':     'Неверный пароль.',
      'auth/invalid-credential': 'Неверный email или пароль.',
      'auth/too-many-requests':  'Слишком много попыток. Повторите позже.',
      'auth/network-request-failed': 'Ошибка сети. Проверьте подключение.',
    };
    return map[code] || `Ошибка: ${code}`;
  }

  /* ── Logout ──────────────────────────────────────────────────────────────── */
  document.getElementById('logout-btn').addEventListener('click', () => {
    auth.signOut();
  });

  /* ── Load applications ───────────────────────────────────────────────────── */
  async function loadApplications() {
    const tbody = document.getElementById('apps-tbody');
    tbody.innerHTML = '<tr><td colspan="8" class="table-loading">Загрузка данных...</td></tr>';

    try {
      const snapshot = await db
        .collection('applications')
        .orderBy('munCount', 'desc')
        .get();

      applications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      renderStats(applications);
      renderTable(applications);
    } catch (err) {
      console.error('Firestore read error:', err);
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="table-loading" style="color:#e74c3c;">
            Ошибка загрузки: ${err.message}
          </td>
        </tr>`;
    }
  }

  /* ── Stats ───────────────────────────────────────────────────────────────── */
  function renderStats(apps) {
    document.getElementById('stat-total').textContent = apps.length;

    if (apps.length === 0) {
      document.getElementById('stat-avg').textContent = '—';
      document.getElementById('stat-top').textContent = '—';
      document.getElementById('stat-top-sub').textContent = 'нет данных';
      return;
    }

    const avg = apps.reduce((sum, a) => sum + (a.munCount || 0), 0) / apps.length;
    document.getElementById('stat-avg').textContent = avg.toFixed(1);

    const top = apps[0]; /* already sorted desc */
    document.getElementById('stat-top').textContent = top.fullName || '—';
    document.getElementById('stat-top-sub').textContent = `${top.munCount ?? 0} конференций`;
  }

  /* ── Table ───────────────────────────────────────────────────────────────── */
  function renderTable(apps) {
    const tbody = document.getElementById('apps-tbody');

    if (apps.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="table-empty">
              <div class="table-empty-icon">📭</div>
              <p>Заявок пока нет.</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = apps.map((app, i) => {
      const rank    = i + 1;
      const rating  = getRating(app.munCount ?? 0);
      const date    = formatDate(app.submittedAt);
      const rankCls = rank <= 3 ? `rank-${rank}` : '';

      return `
        <tr data-id="${app.id}">
          <td><span class="rank-num ${rankCls}">#${rank}</span></td>
          <td>${escHtml(app.fullName || '—')}</td>
          <td style="color:var(--text-muted);font-size:13px;">${escHtml(app.email || '—')}</td>
          <td style="color:var(--gold);font-size:13px;">${escHtml(app.telegram || '—')}</td>
          <td class="mun-count-cell">${app.munCount ?? '—'}</td>
          <td><span class="badge ${rating.cls}">${rating.label}</span></td>
          <td class="date-cell">${date}</td>
          <td>
            <button class="btn-detail" data-id="${app.id}">Подробнее</button>
          </td>
        </tr>`;
    }).join('');

    /* Attach click listeners */
    tbody.querySelectorAll('.btn-detail').forEach(btn => {
      btn.addEventListener('click', () => openModal(btn.dataset.id));
    });
  }

  /* ── Rating ──────────────────────────────────────────────────────────────── */
  function getRating(munCount) {
    if (munCount === 0)      return { label: 'Новичок',    cls: 'badge-gray' };
    if (munCount <= 2)       return { label: 'Начинающий', cls: 'badge-blue' };
    if (munCount <= 5)       return { label: 'Опытный',    cls: 'badge-gold' };
    return                          { label: 'Ветеран',    cls: 'badge-vet'  };
  }

  /* ── Modal ───────────────────────────────────────────────────────────────── */
  const modal   = document.getElementById('detail-modal');
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  function openModal(id) {
    const app = applications.find(a => a.id === id);
    if (!app) return;

    const rating   = getRating(app.munCount ?? 0);
    const date     = formatDate(app.submittedAt);
    const rankNum  = applications.findIndex(a => a.id === id) + 1;
    const consent  = app.consentAccepted
      ? '<span class="consent-yes">✓ Подтверждено</span>'
      : '<span class="consent-no">✗ Не подтверждено</span>';

    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-header-info">
          <h2>${escHtml(app.fullName || '—')}</h2>
          <p>Ранг #${rankNum} &nbsp;·&nbsp; <span class="badge ${rating.cls}">${rating.label}</span>
             &nbsp;·&nbsp; ${date}</p>
        </div>
        <button class="modal-close" id="modal-close-btn" aria-label="Закрыть">✕</button>
      </div>

      <div class="modal-body">

        <div class="modal-section">
          <div class="modal-section-title">Контактная информация</div>
          <div class="modal-fields">
            <div class="modal-field">
              <span class="modal-field-label">Email</span>
              <span class="modal-field-value">${escHtml(app.email || '—')}</span>
            </div>
            <div class="modal-field">
              <span class="modal-field-label">Телефон</span>
              <span class="modal-field-value">${escHtml(app.phone || '—')}</span>
            </div>
            <div class="modal-field">
              <span class="modal-field-label">Telegram</span>
              <span class="modal-field-value" style="color:var(--gold);">${escHtml(app.telegram || '—')}</span>
            </div>
            <div class="modal-field">
              <span class="modal-field-label">Место учёбы / работы</span>
              <span class="modal-field-value">${escHtml(app.studyPlace || '—')}</span>
            </div>
          </div>
        </div>

        <div class="modal-section">
          <div class="modal-section-title">Конференционные данные</div>
          <div class="modal-fields">
            <div class="modal-field">
              <span class="modal-field-label">Предпочитаемая страна</span>
              <span class="modal-field-value ${!app.countryPref ? 'empty' : ''}">
                ${app.countryPref ? escHtml(app.countryPref) : 'Не указано'}
              </span>
            </div>
            <div class="modal-field">
              <span class="modal-field-label">Комитет</span>
              <span class="modal-field-value" style="color:var(--gold);">${escHtml(app.committee || '—')}</span>
            </div>
            <div class="modal-field">
              <span class="modal-field-label">Конференций MUN</span>
              <span class="modal-field-value highlight">${app.munCount ?? '—'}</span>
            </div>
            <div class="modal-field">
              <span class="modal-field-label">Рейтинг</span>
              <span class="modal-field-value"><span class="badge ${rating.cls}">${rating.label}</span></span>
            </div>
          </div>
        </div>

        <div class="modal-section">
          <div class="modal-section-title">Мотивационные ответы</div>
          <div class="modal-fields">
            <div class="modal-field full">
              <span class="modal-field-label">Почему вы станете отличным делегатом?</span>
              <span class="modal-field-value">${escHtml(app.whyDelegate || '—').replace(/\n/g, '<br>')}</span>
            </div>
            <div class="modal-field full">
              <span class="modal-field-label">Опыт и награды</span>
              <span class="modal-field-value ${!app.munExperience ? 'empty' : ''}">
                ${app.munExperience
                  ? escHtml(app.munExperience).replace(/\n/g, '<br>')
                  : 'Не заполнено'}
              </span>
            </div>
          </div>
        </div>

        <div class="modal-section">
          <div class="modal-section-title">Прочее</div>
          <div class="modal-fields">
            <div class="modal-field">
              <span class="modal-field-label">Согласие с условиями</span>
              <span class="modal-field-value">${consent}</span>
            </div>
            <div class="modal-field">
              <span class="modal-field-label">Дата подачи</span>
              <span class="modal-field-value">${date}</span>
            </div>
          </div>
        </div>

      </div>`;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  }

  function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  overlay.addEventListener('click', closeModal);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  /* ── Helpers ─────────────────────────────────────────────────────────────── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ru-RU', {
      day:   '2-digit',
      month: '2-digit',
      year:  'numeric',
      hour:  '2-digit',
      minute:'2-digit',
    });
  }

});
