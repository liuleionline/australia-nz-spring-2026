(function () {
  "use strict";
  const API_BASE = String(window.ROUTEBOOK_API_BASE || "").replace(/\/$/, "");
  const apiUrl = (path) => `${API_BASE}${path}`;
  const data = window.TRIP_DATA;
  const baseExpenses = (data.accounting?.expenses || []).map((item) => ({ ...item, participants: [...(item.participants || [])] }));
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = (value) => {
    if (value === "" || value == null || Number.isNaN(Number(value))) return "待补";
    return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 2 }).format(Number(value));
  };
  const esc = (value = "") => String(value).replace(/[&<>"']/g, (m) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m]));
  const q = (value) => data.helpers.q(value);
  const hotelById = (id) => data.hotels.find((hotel) => hotel.id === id);
  const dayById = (id) => data.days.find((day) => day.id === id);
  const flightById = (id) => data.flights.find((flight) => flight.id === id);
  const fallbackImage = "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dce8df"/><stop offset="1" stop-color="#8bb4ad"/></linearGradient></defs><rect width="900" height="520" fill="url(#g)"/><path d="M0 420L170 240l110 100 160-210 180 220 110-130 170 200v100H0z" fill="#284f47" opacity=".62"/><circle cx="710" cy="105" r="48" fill="#f1b85b"/><text x="40" y="475" fill="white" font-family="sans-serif" font-size="28">Australia · New Zealand</text></svg>');
  const JOURNAL_USERS = ["LL", "YM", "QNL", "SZ"];
  const JOURNAL_LABELS = { LL: "LL / 旅伴L", YM: "YM / 旅伴M", QNL: "QNL / 旅伴Q", SZ: "SZ / 旅伴S" };

  let activeDayId = localStorage.getItem("au-nz-active-day") || data.days[0].id;
  let activeJournalId = localStorage.getItem("au-nz-journal-day") || activeDayId;
  let journals = Object.fromEntries(JOURNAL_USERS.map((username) => [username, {}]));
  let journal = {};
  let pendingPhotos = [];
  let map;
  let mapLayer;
  let mapLoaded = false;
  let currentUser = null;
  let canEdit = false;
  const AUTH_TOKEN_KEY = "au-nz-routebook-token-v2";
  let authToken = "";
  let backupRows = [];

  function readStoredAuthToken() {
    for (const storageName of ["sessionStorage", "localStorage"]) {
      try {
        const value = window[storageName]?.getItem(AUTH_TOKEN_KEY);
        if (value) return value;
      } catch { /* iOS private browsing and embedded browsers may block storage */ }
    }
    return "";
  }

  authToken = readStoredAuthToken();

  function rememberAuthToken(token) {
    authToken = String(token || "");
    for (const storageName of ["sessionStorage", "localStorage"]) {
      try {
        if (authToken) window[storageName]?.setItem(AUTH_TOKEN_KEY, authToken);
        else window[storageName]?.removeItem(AUTH_TOKEN_KEY);
      } catch { /* keep the in-memory token for this tab */ }
    }
  }

  async function apiFetch(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
    const response = await fetch(apiUrl(path), {
      ...options,
      headers,
      credentials: "include",
      cache: options.cache || "no-store"
    });
    return response;
  }

  async function apiFetchWithTimeout(path, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const upstreamSignal = options.signal;
    const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);
    if (upstreamSignal) {
      if (upstreamSignal.aborted) abortFromUpstream();
      else upstreamSignal.addEventListener("abort", abortFromUpstream, { once: true });
    }
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await apiFetch(path, { ...options, signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted && !upstreamSignal?.aborted) {
        const timeoutError = new Error("连接备份服务超时，请检查网络后重试");
        timeoutError.code = "REQUEST_TIMEOUT";
        throw timeoutError;
      }
      throw error;
    } finally {
      window.clearTimeout(timer);
      upstreamSignal?.removeEventListener?.("abort", abortFromUpstream);
    }
  }

  function recoverAuthFromResponse(response, payload = {}, options = {}) {
    const code = String(payload?.code || "");
    const passwordChangeRequired = code === "PASSWORD_CHANGE_REQUIRED";
    const authRequired = response?.status === 401 || code === "AUTH_REQUIRED" || code === "INVALID_SESSION";
    if (!passwordChangeRequired && !authRequired) return false;
    if (passwordChangeRequired && currentUser) {
      currentUser = { ...currentUser, mustChange: true };
      canEdit = false;
      syncAuthState();
      renderAuthBar();
      if (options.closeExpense) closeExpenseModal();
      closeAccountModal();
      openLoginModal(true);
      return true;
    }
    clearAuthState();
    renderAuthBar();
    if (options.closeExpense) closeExpenseModal();
    closeAccountModal();
    openLoginModal(false);
    return true;
  }

  async function confirmEditableSession(options = {}) {
    if (!currentUser || !canEdit || !authToken) {
      recoverAuthFromResponse({ status: 401 }, { code: "AUTH_REQUIRED" }, options);
      return false;
    }
    try {
      const response = await apiFetch("/api/routebook/auth");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.user) {
        recoverAuthFromResponse(response, payload, options);
        return false;
      }
      applyAuthPayload(payload);
      if (!canEdit) {
        recoverAuthFromResponse(response, { code: "PASSWORD_CHANGE_REQUIRED" }, options);
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  function applyAuthPayload(payload = {}) {
    if (payload.token) rememberAuthToken(payload.token);
    currentUser = payload.user || null;
    canEdit = !!currentUser && !currentUser.mustChange;
    const username = String(currentUser?.username || "").toUpperCase();
    journal = currentUser ? loadJournalForUser(username) : {};
    if (JOURNAL_USERS.includes(username)) journals[username] = journal;
    syncAuthState();
  }

  function clearAuthState() {
    rememberAuthToken("");
    currentUser = null;
    canEdit = false;
    journal = {};
    syncAuthState();
  }

  function syncAuthState() {
    const authenticated = Boolean(currentUser && canEdit);
    document.body.classList.toggle("is-authenticated", authenticated);
    document.body.classList.toggle("is-guest", !authenticated);
    document.dispatchEvent(new CustomEvent("routebook:auth-changed", {
      detail: { authenticated, canEdit }
    }));
  }

  let taskState = {};
  let ledgerFilter = "all";
  let expenseSubmitting = false;

  function journalStorageKey(username) {
    return `au-nz-journal-v2-${String(username || "").toUpperCase()}`;
  }

  function loadJournalForUser(username) {
    const normalized = String(username || "").toUpperCase();
    if (!JOURNAL_USERS.includes(normalized)) return {};
    try {
      const scoped = localStorage.getItem(journalStorageKey(normalized));
      if (scoped) return JSON.parse(scoped) || {};

      const legacy = localStorage.getItem("au-nz-journal-v1");
      const migratedTo = localStorage.getItem("au-nz-journal-v1-migrated-to");
      if (legacy && !migratedTo) {
        const parsed = JSON.parse(legacy) || {};
        localStorage.setItem(journalStorageKey(normalized), JSON.stringify(parsed));
        localStorage.setItem("au-nz-journal-v1-migrated-to", normalized);
        return parsed;
      }
    } catch { /* iOS private browsing may block local storage */ }
    return {};
  }

  function persistCurrentJournal() {
    const username = String(currentUser?.username || "").toUpperCase();
    if (!JOURNAL_USERS.includes(username)) return;
    journals[username] = journal;
    localStorage.setItem(journalStorageKey(username), JSON.stringify(journal));
  }

  async function init() {
    await initAuth();
    renderHero();
    renderOverview();
    renderFlights();
    renderRoute();
    renderDayPicker();
    renderDay(activeDayId);
    renderLodging();
    renderBookings();
    renderBudget();
    renderPrep();
    renderSources();
    renderJournalPicker();
    loadJournalForm(activeJournalId);
    bindShell();
    document.addEventListener("error", (event) => {
      if (event.target?.tagName === "IMG" && event.target.src !== fallbackImage) event.target.src = fallbackImage;
    }, true);
  }

  async function initAuth() {
    try {
      const response = await apiFetch("/api/routebook/auth");
      if (response.ok) applyAuthPayload(await response.json());
      else clearAuthState();
    } catch { clearAuthState(); }
    await refreshTaskState();
    await refreshExpenseState();
    await refreshJournalState();
  }

  async function refreshExpenseState() {
    try {
      const response = await apiFetch("/api/routebook/expenses", { credentials: "include" });
      if (!response.ok) return;
      const payload = await response.json();
      const remote = payload.expenses || [];
      const merged = new Map(baseExpenses.map((item) => [item.id, { ...item, participants: [...(item.participants || [])] }]));
      remote.forEach((item) => item.deleted ? merged.delete(item.id) : merged.set(item.id, item));
      data.accounting.expenses = [...merged.values()];
    } catch { /* public preview remains usable */ }
  }

  function renderAuthBar() {
    const bar = $("#authBar");
    if (!bar) return;
    if (!currentUser) {
      bar.innerHTML = `<span class="auth-welcome">游客 · 仅查看</span><button class="auth-button" id="loginBtn" type="button">参与者登录</button>`;
      $("#loginBtn")?.addEventListener("click", () => openLoginModal(false));
      return;
    }
    const status = canEdit ? "可编辑" : "须先改密";
    bar.innerHTML = `<span class="auth-welcome">${esc(currentUser.display_name || currentUser.username)} · ${status}</span><span class="auth-actions"><button class="auth-button" id="accountBtn" type="button">${canEdit ? "账户安全" : "修改密码"}</button><button class="auth-button auth-button-quiet" id="logoutBtn" type="button">退出</button></span>`;
    $("#accountBtn")?.addEventListener("click", () => canEdit ? openAccountModal() : openLoginModal(true));
    $("#logoutBtn")?.addEventListener("click", logout);
  }

  function openLoginModal(forceChange) {
    const modal = $("#loginModal");
    modal.classList.remove("is-hidden");
    modal.setAttribute("aria-hidden", "false");
    const title = forceChange ? "首次登录，请修改密码" : "旅行者登录";
    const fields = forceChange
      ? `<label>当前密码<input name="currentPassword" type="password" autocomplete="current-password" minlength="6" required></label><label>新密码<input name="newPassword" type="password" autocomplete="new-password" minlength="8" placeholder="至少8位，建议字母与数字组合" required></label><label>确认新密码<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></label>`
      : `<label>账号<select name="username"><option>LL</option><option>YM</option><option>QNL</option><option>SZ</option></select></label><label>密码<input name="password" type="password" autocomplete="current-password" required></label>`;
    modal.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-label="${title}"><button class="modal-close" id="modalClose" type="button" aria-label="关闭">×</button><p class="eyebrow">TRAVELER ACCESS</p><h2>${title}</h2><p class="modal-note">仅限四位同行者使用。首次登录会要求设置个人新密码。</p><form id="authForm" class="modal-form">${fields}<button class="btn btn-accent" type="submit">${forceChange ? "保存新密码" : "登录"}</button><p id="authError" class="modal-error" role="alert"></p></form></div>`;

    $("#modalClose").addEventListener("click", closeLoginModal);
    $("#authForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const isChange = forceChange || !!currentUser;
      if (isChange && form.get("newPassword") !== form.get("confirmPassword")) {
        $("#authError").textContent = "两次输入的新密码不一致";
        return;
      }
      const body = isChange
        ? { action: "change-password", currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") }
        : { action: "login", username: form.get("username"), password: form.get("password") };
      const submit = event.currentTarget.querySelector('button[type="submit"]');
      if (submit) { submit.disabled = true; submit.textContent = "处理中…"; }
      try {
        const response = await apiFetch("/api/routebook/auth", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "操作失败");
        applyAuthPayload(payload);
        if (!currentUser) throw new Error("服务器未返回登录身份，请重新登录");
        if (body.action === "login" && currentUser.mustChange) {
          closeLoginModal();
          openLoginModal(true);
          return;
        }
        if (currentUser.mustChange) throw new Error("服务器尚未确认改密，请重新尝试");
        closeLoginModal();
        await refreshTaskState();
        await refreshExpenseState();
        await refreshJournalState();
        renderAuthBar();
        renderBookings();
        renderBudget();
        renderPrep();
        loadJournalForm(activeJournalId);
      } catch (error) {
        $("#authError").textContent = error.message || "操作失败，请稍后重试";
      } finally {
        if (submit && document.body.contains(submit)) {
          submit.disabled = false;
          submit.textContent = forceChange ? "保存新密码" : "登录";
        }
      }
    });
  }

  function closeLoginModal() {
    const modal = $("#loginModal");
    modal.classList.add("is-hidden");
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = "";
  }

  function openAccountModal() {
    if (!currentUser || !canEdit) return;
    const modal = $("#accountModal");
    const isAdmin = String(currentUser.username || "").toUpperCase() === "LL";
    modal.classList.remove("is-hidden");
    modal.setAttribute("aria-hidden", "false");
    modal.innerHTML = `<div class="modal-card modal-card-wide" role="dialog" aria-modal="true" aria-label="账户安全">
      <button class="modal-close" data-account-close type="button" aria-label="关闭">×</button>
      <p class="eyebrow">ACCOUNT SECURITY</p><h2>账户安全</h2>
      <p class="modal-note">已登录为 ${esc(currentUser.username)} / ${esc(currentUser.display_name || "")}。密码只在服务器校验，网页不会显示或保存明文；本站不提供公开找回或匿名重置入口。</p>
      <section class="security-section">
        <h3>修改我的密码</h3>
        <form id="ownPasswordForm" class="modal-form">
          <label>当前密码<input name="currentPassword" type="password" autocomplete="current-password" required></label>
          <label>新密码<input name="newPassword" type="password" autocomplete="new-password" minlength="8" required></label>
          <label>确认新密码<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></label>
          <button class="btn btn-accent" type="submit">修改密码</button><p class="modal-error" id="ownPasswordStatus" role="status"></p>
        </form>
      </section>
      ${isAdmin ? `<section class="security-section security-section-admin">
        <div class="security-badge">LL 管理员专用</div><h3>重置同行者密码</h3>
        <p class="modal-note">只有 LL 登录后才能看到此入口；服务器仍会再次验证 LL 身份和当前密码。重置后，该成员的所有登录会话立即失效，密码回到初始值，并在下次登录时强制改密。</p>
        <form id="adminResetForm" class="modal-form">
          <label>成员<select name="targetUsername"><option>YM</option><option>QNL</option><option>SZ</option></select></label>
          <label>验证 LL 当前密码<input name="currentPassword" type="password" autocomplete="current-password" required></label>
          <label class="confirm-row"><input name="confirmReset" type="checkbox" required><span>我确认要重置此成员并撤销其全部会话</span></label>
          <button class="btn btn-danger" type="submit">验证并重置</button><p class="modal-error" id="adminResetStatus" role="status"></p>
        </form>
      </section>
      <section id="accountBackupPanel" class="security-section security-section-backup backup-panel" aria-live="polite"><div class="backup-loading">正在读取备份状态…</div></section>
      <div id="backupModal" class="modal is-hidden" aria-hidden="true"></div>` : ""}
    </div>`;
    $$("[data-account-close]", modal).forEach((node) => node.addEventListener("click", closeAccountModal));
    $("#ownPasswordForm")?.addEventListener("submit", submitOwnPasswordChange);
    $("#adminResetForm")?.addEventListener("submit", submitAdminReset);
    if (isAdmin) {
      renderBackupPanel({ loading: true });
      refreshBackupState();
    }
  }

  function closeAccountModal() {
    const modal = $("#accountModal");
    modal.classList.add("is-hidden");
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = "";
  }

  async function submitOwnPasswordChange(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const status = $("#ownPasswordStatus");
    if (form.get("newPassword") !== form.get("confirmPassword")) {
      status.textContent = "两次输入的新密码不一致";
      return;
    }
    try {
      const response = await apiFetch("/api/routebook/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "change-password", currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "修改失败");
      applyAuthPayload(payload);
      if (!currentUser || currentUser.mustChange) throw new Error("修改成功，但新会话未生效，请重新登录");
      status.classList.add("is-success");
      status.textContent = "密码已修改，其他旧会话将按服务器策略失效。";
      formElement.reset();
      renderAuthBar();
    } catch (error) {
      status.classList.remove("is-success");
      status.textContent = error.message || "修改失败";
    }
  }

  async function submitAdminReset(event) {
    event.preventDefault();
    if (String(currentUser?.username || "").toUpperCase() !== "LL") return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const targetUsername = String(form.get("targetUsername") || "");
    const status = $("#adminResetStatus");
    if (!window.confirm(`确认把 ${targetUsername} 重置为初始密码并撤销其全部登录会话吗？`)) return;
    try {
      const response = await apiFetch("/api/routebook/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "admin-reset-password",
          targetUsername,
          currentPassword: form.get("currentPassword"),
          revokeAllSessions: true
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (recoverAuthFromResponse(response, payload)) return;
        throw new Error(payload.error || "重置失败");
      }
      status.classList.add("is-success");
      const temporaryPassword = String(payload.temporaryPassword || "");
      status.textContent = temporaryPassword
        ? "重置成功：" + targetUsername + " 的旧会话已失效。一次性临时密码：" + temporaryPassword + "（请立即私下告知，对方下次登录必须修改）"
        : "重置成功：" + targetUsername + " 的旧会话已失效。请向管理员获取一次性临时密码。";
      formElement.reset();
    } catch (error) {
      status.classList.remove("is-success");
      status.textContent = error.message || "重置失败";
    }
  }

  async function logout() {
    try {
      await apiFetch("/api/routebook/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "logout" })
      });
    } catch { /* ignore */ }
    clearAuthState();
    renderAuthBar();
    renderBookings();
    renderBudget();
    renderPrep();
    loadJournalForm(activeJournalId);
  }

  function renderHero() {
    $("#heroStats").innerHTML = [
      `<span class="stat-pill"><strong>${data.meta.nights}</strong> 晚住宿</span>`,
      `<span class="stat-pill"><strong>${data.days.length}</strong> 日卡片</span>`,
      `<span class="stat-pill">南岛自驾 <strong>${Number(data.meta.distanceKm).toLocaleString()}</strong> km</span>`
    ].join("");
  }

  function renderOverview() {
    const cards = [
      ["✈️", "5段航班", "成都—悉尼—墨尔本—基督城—悉尼—成都"],
      ["🌊", "7天澳洲城市段", "悉尼海港 / 海岸，墨尔本巷弄 / 近郊"],
      ["🚘", "2,470 km", "新西兰15晚南岛自驾，10.4为最长转场"],
      ["📝", "每日游记", "文字、照片可在页面本地保存并导出"]
    ];
    $("#overviewCards").innerHTML = cards.map((card) => `<article class="overview-card"><div class="overview-card__icon">${card[0]}</div><strong>${card[1]}</strong><span>${card[2]}</span></article>`).join("");
  }

  function renderFlights() {
    $("#flightRows").innerHTML = data.flights.map((flight) => `<tr><td>${esc(flight.date)}</td><td><span class="flight-code">${esc(flight.airline)}</span></td><td>${esc(flight.route)}</td><td><strong>${esc(flight.depart)}</strong><br>→ ${esc(flight.arrive)}<br><span class="flight-note">${esc(flight.timeNote)}</span></td><td class="flight-note">${esc(flight.note)}</td></tr>`).join("");
  }

  function makeDirection(points, mode = "driving") {
    const encoded = points.map(encodeURIComponent);
    const origin = encoded.shift();
    const destination = encoded.pop();
    const waypoints = encoded.length ? `&waypoints=${encoded.join("%7C")}` : "";
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=${mode}`;
  }

  function renderRoute() {
    const auPoints = data.regions.australia;
    const nzPoints = data.regions.newZealand;
    const cards = [
      { title: "澳洲城市段", subtitle: "不租车 · 公共交通 / 步行", points: auPoints, link: makeDirection(["Sydney", "Melbourne"], "transit"), note: "9.18晚从成都出发；9.19–21悉尼，9.22下午飞墨尔本，9.25上午飞基督城。" },
      { title: "新西兰南岛环线", subtitle: "9.25取车 · 15晚", points: nzPoints, link: data.helpers.dir(["Christchurch Airport", "Lake Tekapo", "Twizel", "Wanaka", "Queenstown", "Te Anau", "Haast", "Franz Josef", "Hokitika", "Castle Hill", "Christchurch"]), note: "路线图只表示方向；每天实际驾驶以NZTA路况和当天Google Maps为准。" }
    ];
    $("#routeCards").innerHTML = cards.map((card) => `<article class="route-card"><p class="eyebrow">${card.subtitle}</p><h3>${card.title}</h3><div class="route-line">${card.points.map((point) => `<span>${esc(point.name)}</span>`).join("")}</div><p>${esc(card.note)}</p><a class="link-btn link-btn-primary" target="_blank" rel="noreferrer" href="${card.link}">打开分段Google路线 ↗</a></article>`).join("");
    const select = $("#mapDaySelect");
    select.innerHTML = `<option value="australia">澳洲城市段</option><option value="nz">新西兰自驾总线</option>` + data.days.map((day, index) => `<option value="${day.id}">DAY ${String(index + 1).padStart(2, "0")} · ${day.date} ${esc(day.base)}</option>`).join("");
    select.addEventListener("change", () => { if (mapLoaded) selectMap(select.value); });
  }

  function renderDayPicker() {
    const picker = $("#dayPicker");
    picker.innerHTML = data.days.map((day, index) => `<button class="day-tab ${day.id === activeDayId ? "is-active" : ""}" role="tab" aria-selected="${day.id === activeDayId}" data-day="${day.id}"><span>DAY ${String(index + 1).padStart(2, "0")} · ${esc(day.weekday)}</span><strong>${esc(day.date)}</strong></button>`).join("");
    picker.addEventListener("click", (event) => {
      const button = event.target.closest("[data-day]");
      if (!button) return;
      activeDayId = button.dataset.day;
      localStorage.setItem("au-nz-active-day", activeDayId);
      $$(".day-tab", picker).forEach((tab) => { const on = tab.dataset.day === activeDayId; tab.classList.toggle("is-active", on); tab.setAttribute("aria-selected", String(on)); });
      renderDay(activeDayId);
      if (mapLoaded) selectMap(activeDayId);
      if (window.innerWidth < 720) $("#dayDetail").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function flightStrip(day) {
    if (!day.flightIds?.length) return "";
    const flights = day.flightIds.map(flightById).filter(Boolean);
    return `<div class="flight-strip">${flights.map((flight) => `<div><strong>${esc(flight.airline)}</strong><span>${esc(flight.route)}</span><small>${esc(flight.depart)} → ${esc(flight.arrive)} · ${esc(flight.timeNote)}</small></div>`).join("")}</div>`;
  }

  function renderTimeline(items, compact = false) {
    if (!items?.length) return "";
    return `<ol class="timeline ${compact ? "timeline-compact" : ""}">${items.map((item) => `<li class="timeline-item"><div class="timeline-time">${esc(item.time)}</div><div class="timeline-content"><h4>${esc(item.title)}</h4><p>${esc(item.notes)}</p><div class="micro-links"><a class="micro-link" href="${item.url || q(item.query)}" target="_blank" rel="noreferrer">Google地址 ↗</a></div></div></li>`).join("")}</ol>`;
  }

  function renderHighlights(items = []) {
    return `<div class="highlight-grid">${items.map((item) => `<article class="place-card"><img class="place-card-image" src="${item.image || fallbackImage}" alt="${esc(item.name)}" loading="lazy" decoding="async"><div class="place-card-body"><span class="card-kicker">${esc(item.tag || "拍照点")}</span><h5>${esc(item.name)}</h5><p>${esc(item.notes)}</p><p class="photo-tip">📷 ${esc(item.photoTip || "留意光线和人流")}</p><a class="link-btn" href="${item.url || q(item.query)}" target="_blank" rel="noreferrer">Google地址</a></div></article>`).join("")}</div>`;
  }

  function renderMeals(items = []) {
    return `<div class="meal-grid">${items.map((item) => `<article class="meal-card"><img class="meal-card-image" src="${item.image || fallbackImage}" alt="${esc(item.name)}" loading="lazy" decoding="async"><div class="meal-card-body"><span class="card-kicker">${esc(item.type || "餐饮")}${item.booking ? ` · ${esc(item.booking)}` : ""}</span><h5>${esc(item.name)}</h5><p>${esc(item.notes)}</p><a class="link-btn" href="${item.url || q(item.query)}" target="_blank" rel="noreferrer">餐厅地图 / 详情</a></div></article>`).join("")}</div>`;
  }

  function renderChoice(choice) {
    return `<article class="choice-card"><h4>${esc(choice.label)}</h4><p>${esc(choice.summary)}</p><div class="day-actions"><a class="link-btn link-btn-primary" href="${choice.routeUrl}" target="_blank" rel="noreferrer">打开这套路线</a></div>${renderTimeline(choice.schedule, true)}<h5>拍照点</h5>${renderHighlights(choice.highlights)}<h5>餐饮</h5>${renderMeals(choice.meals)}</article>`;
  }

  function renderDay(dayId) {
    const day = dayById(dayId) || data.days[0];
    const stay = day.stayId ? hotelById(day.stayId) : null;
    const stayLink = stay ? `<a class="link-btn" href="${stay.map}" target="_blank" rel="noreferrer">导航到今晚住宿</a>` : "";
    const stops = (day.stops || []).map((stop) => `<a class="stop-chip" href="${stop.map || q(stop.name)}" target="_blank" rel="noreferrer">${esc(stop.name)}</a>`).join("");
    const tips = [["⛽ 加油 / 交通", day.fuel], ["🧥 穿着", day.clothing], ["⚠️ 行程把控", day.caution], ["🎟️ 预约", day.booking], ["🌧️ Plan B", day.planB]].map((tip) => `<article class="tip-card"><strong>${tip[0]}</strong><p>${esc(tip[1] || "")}</p></article>`).join("");
    const journalButton = `<button class="link-btn" type="button" data-journal-day="${day.id}">写今天游记</button>`;
    const choiceBlock = day.choices?.length ? `<div class="subsection"><h4>今天的两套选项</h4><div class="choice-grid">${day.choices.map(renderChoice).join("")}</div></div>` : "";
    const stayBlock = stay ? `<div class="stay-mini"><strong>今晚住：${esc(stay.name)}</strong><span>${esc(stay.address)}</span><span>${money(stay.price)} · ${esc(stay.facts.join(" / "))}</span></div>` : "";
    $("#dayDetail").innerHTML = `<div class="day-hero" style="background-image:url('${day.image || fallbackImage}')"><a class="day-credit" href="#sources">图片：${esc(day.credit || "页面来源见来源列表")}</a><div class="day-hero-content"><div class="day-meta"><span class="meta-pill">${esc(day.date)} · ${esc(day.weekday)}</span><span class="meta-pill">${day.distanceKm ? `${day.distanceKm} km` : "城市段"}</span><span class="meta-pill">${esc(day.driveTime || "")}</span><span class="meta-pill">住 ${esc(day.base)}</span></div><h3>${esc(day.title)}</h3><p>${esc(day.summary)}</p></div></div><div class="day-body">${flightStrip(day)}<div class="day-actions"><a class="link-btn link-btn-primary" href="${day.routeUrl || q(day.base)}" target="_blank" rel="noreferrer">打开当天Google路线</a>${stayLink}${journalButton}</div>${day.distanceKm >= 400 ? `<div class="alert-box"><strong>今天是驾驶压力较高的一天。</strong> 纯驾驶时间不含加油、吃饭和停车；优先保证白天抵达。</div>` : ""}${renderTimeline(day.schedule)}${choiceBlock}<div class="subsection"><h4>今日精华与拍照点</h4>${renderHighlights(day.highlights)}</div><div class="subsection"><h4>餐饮建议 <small class="micro">· 营业时间临行复核</small></h4>${renderMeals(day.meals)}</div><div class="subsection"><h4>当天注意事项</h4><div class="tips-grid">${tips}</div></div><div class="subsection"><h4>今日目的地清单</h4><div class="stops-row">${stops}</div></div>${stayBlock}</div>`;
    $$("[data-journal-day]", $("#dayDetail")).forEach((button) => button.addEventListener("click", () => { activeJournalId = button.dataset.journalDay; localStorage.setItem("au-nz-journal-day", activeJournalId); renderJournalPicker(); loadJournalForm(activeJournalId); $("#journal").scrollIntoView({ behavior: "smooth" }); }));
  }

  function renderLodging() {
    $("#lodgingGrid").innerHTML = data.hotels.map((hotel) => `<article class="stay-card"><img class="stay-image" src="${hotel.image || fallbackImage}" alt="${esc(hotel.city)}住宿实景" loading="lazy" decoding="async" style="object-position:${esc(hotel.imagePosition || "center center")}" onerror="this.onerror=null;this.src='${fallbackImage}'"><div class="stay-body"><div class="stay-date">${esc(hotel.date)} · ${hotel.nights}晚 · ${esc(hotel.city)}</div><h3>${esc(hotel.name)}</h3><div class="stay-address">${esc(hotel.address)}</div><div class="stay-facts">${hotel.facts.map((fact) => `<span>${esc(fact)}</span>`).join("")}</div><div class="day-actions"><a class="link-btn link-btn-primary" href="${hotel.map}" target="_blank" rel="noreferrer">Google导航</a>${hotel.link ? `<a class="link-btn" href="${hotel.link}" target="_blank" rel="noreferrer">住宿页面</a>` : ""}</div>${hotel.price != null ? `<div class="stay-price"><strong>${money(hotel.price)}</strong><span>两家合计<br>你家 ${money(hotel.user)}<br>沈家 ${money(hotel.shen)}</span></div>` : ""}</div></article>`).join("");
  }

  async function refreshTaskState() {
    try {
      const response = await apiFetch("/api/routebook/tasks", { credentials: "include" });
      if (!response.ok) return;
      const rows = await response.json();
      taskState = Object.fromEntries((rows.tasks || rows || []).map((row) => [row.id, row]));
    } catch { /* public preview remains read-only */ }
  }

  function taskDone(id) {
    return taskState[id]?.completed || false;
  }

  function renderBookings() {
    const list = $("#bookingList");
    const items = [...(data.bookings || []), ...(data.todos || [])];
    list.innerHTML = items.map((booking) => {
      const state = taskState[booking.id] || {};
      const done = !!state.completed;
      const isTodo = booking.kind === "todo";
      const link = booking.link ? `<a class="micro-link" href="${esc(booking.link)}" target="_blank" rel="noreferrer">官方 / 查询链接 ↗</a>` : "";
      const by = done && state.completed_by ? `<span class="task-completed-by">${esc(state.completed_by)} 已完成</span>` : "";
      return `<label class="booking-item ${done ? "is-done" : ""} ${isTodo ? "todo-item" : ""} ${canEdit ? "" : "is-readonly"}" data-booking="${esc(booking.id)}" data-kind="${esc(booking.kind || "booking")}"><input type="checkbox" ${done ? "checked" : ""} ${canEdit ? "" : "disabled"}><div><h3>${esc(booking.title)}</h3><p>${esc(booking.note)}</p>${link}${by}</div><span class="priority">${esc(booking.priority || "核对")}</span></label>`;
    }).join("");
    list.onchange = async (event) => {
      const item = event.target.closest("[data-booking]");
      if (!item || !canEdit) return;
      const id = item.dataset.booking;
      const completed = !!event.target.checked;
      const previous = taskState[id] ? { ...taskState[id] } : null;
      taskState[id] = { ...(taskState[id] || {}), id, completed, completed_by: completed ? currentUser?.username : "" };
      item.classList.toggle("is-done", completed);
      try {
        if (!await confirmEditableSession()) {
          if (previous) taskState[id] = previous; else delete taskState[id];
          renderBookings();
          return;
        }
        const response = await apiFetch("/api/routebook/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ taskId: id, completed }) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (recoverAuthFromResponse(response, payload)) {
            if (previous) taskState[id] = previous; else delete taskState[id];
            renderBookings();
            return;
          }
          throw new Error(payload.error || "待办保存失败");
        }
        taskState[id] = payload.task || taskState[id];
      } catch (error) {
        if (previous) taskState[id] = previous; else delete taskState[id];
        window.alert(error.message || "待办保存失败，请稍后重试");
      }
      renderBookings();
    };
  }

  function renderBudget() {
    const total = data.hotels.reduce((sum, hotel) => sum + Number(hotel.price || 0), 0);
    const user = data.hotels.reduce((sum, hotel) => sum + Number(hotel.user || 0), 0);
    const shen = data.hotels.reduce((sum, hotel) => sum + Number(hotel.shen || 0), 0);
    const ledger = data.accounting.tripLedger || {};
    const expenses = data.accounting.expenses || [];
    const people = ["LL", "YM", "QNL", "SZ"];
    const labels = { LL: "LL / 旅伴L", YM: "YM / 旅伴M", QNL: "QNL / 旅伴Q", SZ: "SZ / 旅伴S" };
    const typeClass = (type) => ({ 交通: "transport", 住宿: "lodging", 餐饮: "dining", 门票: "tickets", 购物: "shopping", 娱乐: "entertainment", 旅行用品: "supplies", 其他: "other" }[type] || "other");
    const filtered = ledgerFilter === "all" ? expenses : expenses.filter((item) => item.type === ledgerFilter);
    const byType = expenses.reduce((acc, item) => { acc[item.type] = (acc[item.type] || 0) + Number(item.amount || 0); return acc; }, {});
    const paid = Object.fromEntries(people.map((person) => [person, expenses.filter((item) => item.payer === person).reduce((sum, item) => sum + Number(item.amount || 0), 0)]));
    const owed = Object.fromEntries(people.map((person) => [person, 0]));
    expenses.forEach((item) => (item.participants || []).forEach((person) => { if (owed[person] != null) owed[person] += Number(item.amount || 0) / item.participants.length; }));
    const balances = people.map((person) => ({ person, value: paid[person] - owed[person] }));
    const percent = (amount) => expenses.length ? `${Math.round((amount / expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)) * 100)}%` : "0%";
    $("#budgetSummary").innerHTML = [
      ["旅行总花费", money(expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)), `${expenses.length}笔账目`],
      ["交通合计", money(byType["交通"] || 0), "机票 / 租车"],
      ["住宿合计", money(byType["住宿"] || 0), "16笔住宿记录"],
      ["LL已付款", money(paid.LL), "付款人汇总"],
      ["参与成员", "4人", "登录后由VPS实时同步"]
    ].map((item) => `<article class="budget-card"><span>${item[0]}</span><strong>${item[1]}</strong><small>${item[2]}</small></article>`).join("");
    $("#ledgerToolbar").innerHTML = `<div class="ledger-toolbar-inner"><strong>账单明细</strong><label>筛选 <select id="ledgerTypeFilter"><option value="all">全部类型</option><option value="交通" ${ledgerFilter === "交通" ? "selected" : ""}>交通</option><option value="住宿" ${ledgerFilter === "住宿" ? "selected" : ""}>住宿</option><option value="餐饮" ${ledgerFilter === "餐饮" ? "selected" : ""}>餐饮</option><option value="门票" ${ledgerFilter === "门票" ? "selected" : ""}>门票</option><option value="购物" ${ledgerFilter === "购物" ? "selected" : ""}>购物</option><option value="娱乐" ${ledgerFilter === "娱乐" ? "selected" : ""}>娱乐</option><option value="旅行用品" ${ledgerFilter === "旅行用品" ? "selected" : ""}>旅行用品</option><option value="其他" ${ledgerFilter === "其他" ? "selected" : ""}>其他</option></select></label><span class="ledger-legend"><span class="ledger-legend-item ledger-type-transport">交通</span><span class="ledger-legend-item ledger-type-lodging">住宿</span><span class="ledger-legend-item ledger-type-dining">餐饮</span><span class="ledger-legend-item ledger-type-tickets">门票</span><span class="ledger-legend-item ledger-type-other">其他</span></span>${canEdit ? `<button class="btn btn-accent ledger-add-btn" id="addExpenseBtn" type="button">＋ 新增记账</button>` : `<span class="ledger-readonly-note">登录后可新增记账</span>`}</div>`;
    $("#ledgerTypeFilter").onchange = (event) => { ledgerFilter = event.target.value; renderBudget(); };
    $("#addExpenseBtn")?.addEventListener("click", () => openExpenseModal());
    $("#ledgerAnalysis").innerHTML = Object.entries(byType).map(([type, amount]) => `<article class="ledger-analysis-card ledger-type-${typeClass(type)}"><div><strong>${esc(type)}</strong><span>${money(amount)} · ${percent(amount)}</span></div><div class="ledger-bar"><i style="width:${percent(amount)}"></i></div></article>`).join("");
    $("#ledgerSettlement").innerHTML = `<div class="ledger-settlement-head"><div><p class="eyebrow">SETTLEMENT</p><h3>当前结算快照</h3></div><span>按参与人平均分摊</span></div><div class="settlement-grid">${balances.map((item) => `<div class="settlement-card"><strong>${labels[item.person]}</strong><span class="${item.value >= 0 ? "balance-positive" : "balance-negative"}">${item.value >= 0 ? "应收 " : "应付 "}${money(Math.abs(item.value))}</span><small>已付 ${money(paid[item.person])} · 应承担 ${money(owed[item.person])}</small></div>`).join("")}</div><p class="micro">正数表示该成员已先付、最终应收；负数表示还需补付。最终转账可在旅途结束后再确认。</p>`;
    $("#ledgerRows").innerHTML = filtered.map((item) => `<tr class="ledger-row ledger-type-${typeClass(item.type)}"><td>${esc(item.date)}</td><td><span class="ledger-type-chip">${esc(item.type)}</span></td><td>${esc(item.note)}</td><td><strong>${money(item.amount)}</strong></td><td>${esc(labels[item.payer] || item.payer)}</td><td>${esc((item.participants || []).join("、"))}</td><td class="ledger-actions">${canEdit ? `<button class="ledger-icon-btn" data-edit-expense="${esc(item.id)}" type="button">编辑</button><button class="ledger-icon-btn ledger-icon-btn-danger" data-delete-expense="${esc(item.id)}" type="button">删除</button>` : "—"}</td></tr>`).join("");
    $$("[data-edit-expense]", $("#ledgerRows")).forEach((button) => button.addEventListener("click", () => openExpenseModal((data.accounting.expenses || []).find((item) => item.id === button.dataset.editExpense))));
    $$("[data-delete-expense]", $("#ledgerRows")).forEach((button) => button.addEventListener("click", () => deleteExpense(button.dataset.deleteExpense)));
    const lodgingRows = expenses.filter((item) => item.type === "住宿");
    $("#costRows").innerHTML = lodgingRows.length ? lodgingRows.map((item) => `<tr><td>${esc(item.date)} · ${esc(item.note)}</td><td>—</td><td>${money(item.amount)}</td><td colspan="2">${esc(labels[item.payer] || item.payer)} 付款</td></tr>`).join("") + `<tr><td><strong>住宿账目合计</strong></td><td>—</td><td><strong>${money(lodgingRows.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</strong></td><td colspan="2">VPS实时数据</td></tr>` : `<tr><td colspan="5">登录后从VPS加载住宿账目。</td></tr>`;
  }

  function openExpenseModal(expense = null) {
    if (!canEdit || expenseSubmitting) return;
    const modal = $("#expenseModal");
    const today = new Date().toISOString().slice(0, 10);
    const people = [{ id: "LL", name: "LL / 旅伴L" }, { id: "YM", name: "YM / 旅伴M" }, { id: "QNL", name: "QNL / 旅伴Q" }, { id: "SZ", name: "SZ / 旅伴S" }];
    const categories = ["餐饮", "交通", "住宿", "门票", "购物", "娱乐", "旅行用品", "其他"];
    const checked = (id) => expense ? (expense.participants || []).includes(id) : true;
    modal.innerHTML = `<div class="modal-card expense-card" role="dialog" aria-modal="true" aria-label="${expense ? "编辑账目" : "新增记账"}"><button class="modal-close" type="button" aria-label="关闭">×</button><p class="eyebrow">TRAVEL LEDGER</p><h2>${expense ? "编辑账目" : "新增记账"}</h2><p class="modal-note">保存后会同步到四个人的账本、分类分析和结算。</p><form id="expenseForm" class="modal-form expense-form"><input name="id" type="hidden" value="${esc(expense?.id || "")}"><label>金额（人民币）<input name="amount" type="number" min="0.01" step="0.01" placeholder="例如 128.50" value="${esc(expense?.amount ?? "")}" required></label><label>消费类型<select name="type">${categories.map((value) => `<option value="${value}" ${value === expense?.type ? "selected" : ""}>${value}</option>`).join("")}</select></label><div class="expense-two"><label>付款人<select name="payer">${people.map((person) => `<option value="${person.id}" ${person.id === (expense?.payer || currentUser.username) ? "selected" : ""}>${person.name}</option>`).join("")}</select></label><label>日期<input name="date" type="date" value="${esc(expense?.date || today)}" required></label></div><fieldset><legend>参与人</legend><div class="participant-grid">${people.map((person) => `<label class="participant-option"><input type="checkbox" name="participants" value="${person.id}" ${checked(person.id) ? "checked" : ""}><span>${person.name}</span></label>`).join("")}</div></fieldset><label>备注<input name="note" type="text" maxlength="120" placeholder="例如：皇后镇晚餐 / 机场停车" value="${esc(expense?.note || "")}" required></label><button class="btn btn-accent" type="submit">${expense ? "保存修改" : "保存这笔消费"}</button><p id="expenseError" class="modal-error" role="alert"></p></form></div>`;
    modal.classList.remove("is-hidden"); modal.setAttribute("aria-hidden", "false");
    $(".modal-close", modal).addEventListener("click", closeExpenseModal);
    $("#expenseForm", modal).addEventListener("submit", saveExpense);
    $("input[name=amount]", modal)?.focus();
  }

  function closeExpenseModal() { const modal = $("#expenseModal"); modal.classList.add("is-hidden"); modal.setAttribute("aria-hidden", "true"); modal.innerHTML = ""; }

  async function saveExpense(event) {
    event.preventDefault();
    if (!canEdit || expenseSubmitting) return;
    const form = new FormData(event.currentTarget);
    const participants = form.getAll("participants");
    if (!participants.length) { $("#expenseError").textContent = "请至少选择一位参与人"; return; }
    const id = String(form.get("id") || "");
    const body = { amount: Number(form.get("amount")), type: String(form.get("type") || "其他"), payer: String(form.get("payer") || ""), participants, date: String(form.get("date") || ""), note: String(form.get("note") || "").trim() };
    if (id) body.id = id;
    if (!(body.amount > 0) || !body.date || !body.note) { $("#expenseError").textContent = "请把金额、日期和备注填写完整"; return; }
    expenseSubmitting = true;
    const button = event.currentTarget.querySelector("button[type=submit]");
    if (button) { button.disabled = true; button.textContent = "保存中…"; }
    try {
      if (!await confirmEditableSession({ closeExpense: true })) return;
      const response = await apiFetch("/api/routebook/expenses", { method: id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (recoverAuthFromResponse(response, payload, { closeExpense: true })) return;
        throw new Error(payload.error || "保存失败");
      }
      data.accounting.expenses = id ? (data.accounting.expenses || []).map((item) => item.id === id ? payload.expense : item) : [...(data.accounting.expenses || []), payload.expense];
      closeExpenseModal(); renderBudget();
    } catch (error) {
      const errorNode = $("#expenseError"); if (errorNode) errorNode.textContent = error.message || "保存失败，请稍后重试";
    } finally {
      expenseSubmitting = false;
      if (button && document.body.contains(button)) { button.disabled = false; button.textContent = id ? "保存修改" : "保存这笔消费"; }
    }
  }

  async function deleteExpense(id) {
    if (!canEdit || !id || !window.confirm("确认删除这笔账目吗？删除后四个人都会看到更新。")) return;
    try {
      if (!await confirmEditableSession()) return;
      const response = await apiFetch("/api/routebook/expenses", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (recoverAuthFromResponse(response, payload)) return;
        throw new Error(payload.error || "删除失败");
      }
      data.accounting.expenses = (data.accounting.expenses || []).filter((item) => item.id !== id); renderBudget();
    } catch (error) { window.alert(error.message || "删除失败，请稍后重试"); }
  }
  async function refreshBackupState() {
    if (!currentUser || !canEdit || String(currentUser.username || "").toUpperCase() !== "LL") {
      backupRows = [];
      return;
    }
    renderBackupPanel({ loading: true });
    try {
      const response = await apiFetchWithTimeout("/api/routebook/backups", {}, 12000);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) throw new Error("登录状态已失效，请退出后重新登录");
        if (response.status === 403) throw new Error("当前账号没有查看备份的权限");
        throw new Error(payload.error || `备份服务返回异常（${response.status}）`);
      }
      backupRows = Array.isArray(payload.backups) ? payload.backups : [];
      renderBackupPanel(payload);
    } catch (error) {
      backupRows = [];
      const message = navigator.onLine === false
        ? "当前设备处于离线状态，请联网后重试"
        : (error.message || "备份服务暂不可用，请稍后重试");
      renderBackupPanel({ error: message });
    }
  }

  function renderBackupPanel(meta = {}) {
    const panel = $("#accountModal #accountBackupPanel");
    if (!panel) return;
    const visible = !!currentUser && canEdit && String(currentUser.username || "").toUpperCase() === "LL";
    panel.hidden = !visible;
    if (!visible) {
      panel.innerHTML = "";
      return;
    }

    const loading = Boolean(meta.loading);
    const hasError = Boolean(meta.error);
    let rows = "";
    if (loading) {
      rows = `<li class="backup-empty">正在读取服务器和阿里云盘备份记录…</li>`;
    } else if (backupRows.length) {
      rows = backupRows.slice(0, 8).map((row) => `<li><div><strong>${esc(row.label || row.id || "数据备份")}</strong><span>${esc(row.created_at ? new Date(row.created_at).toLocaleString("zh-CN") : "")} · ${esc(row.destination || "服务器")}</span></div><button class="backup-restore" type="button" data-restore-backup="${esc(row.id)}">恢复</button></li>`).join("");
    } else {
      rows = `<li class="backup-empty">${esc(hasError ? "暂时无法显示备份记录" : "还没有可显示的备份记录")}</li>`;
    }

    const statusText = loading
      ? "正在连接备份服务，通常几秒内完成。"
      : (hasError ? meta.error : "可手动创建快照；恢复操作仅 LL 可执行。");
    const action = hasError
      ? `<button class="btn btn-outline" id="backupRetryBtn" type="button">重新读取</button>`
      : `<button class="btn btn-accent" id="backupNowBtn" type="button"${loading ? " disabled" : ""}>${loading ? "正在读取…" : "立即备份"}</button>`;

    panel.innerHTML = `<div class="backup-heading"><div><h3>备份与恢复</h3><p>服务器每天北京时间 01:00 自动备份账户、账本与云端游记；阿里云盘凭证只保存在服务器。</p></div>${action}</div>
      <div class="backup-status${hasError ? " is-error" : ""}" id="backupStatus" role="status">${esc(statusText)}</div>
      <ul class="backup-list">${rows}</ul>
      <p class="micro">恢复前会自动创建保护快照，并要求再次验证 LL 密码。</p>`;
    $("#backupRetryBtn")?.addEventListener("click", refreshBackupState);
    $("#backupNowBtn")?.addEventListener("click", createManualBackup);
    $$('[data-restore-backup]', panel).forEach((button) => button.addEventListener("click", () => openRestoreModal(button.dataset.restoreBackup)));
  }
  async function createManualBackup() {
    const button = $("#backupNowBtn");
    const status = $("#backupStatus");
    if (button) { button.disabled = true; button.textContent = "备份中…"; }
    try {
      const response = await apiFetch("/api/routebook/backups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", source: "manual" })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (recoverAuthFromResponse(response, payload)) return;
        throw new Error(payload.error || "备份失败");
      }
      if (status) status.textContent = "备份已创建并进入云端同步队列。";
      await refreshBackupState();
    } catch (error) {
      if (status) status.textContent = error.message || "备份失败";
    } finally {
      if (button && document.body.contains(button)) { button.disabled = false; button.textContent = "立即备份"; }
    }
  }

  function openRestoreModal(backupId) {
    if (String(currentUser?.username || "").toUpperCase() !== "LL") return;
    const modal = $("#backupModal");
    modal.classList.remove("is-hidden");
    modal.setAttribute("aria-hidden", "false");
    modal.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-label="恢复备份">
      <button class="modal-close" data-backup-close type="button" aria-label="关闭">×</button>
      <p class="eyebrow">PROTECTED RESTORE</p><h2>恢复数据备份</h2>
      <div class="danger-note"><strong>这是高风险操作</strong><span>当前数据会先生成保护快照，然后恢复所选版本。其他登录会话会被撤销。</span></div>
      <form id="restoreForm" class="modal-form">
        <input type="hidden" name="backupId" value="${esc(backupId)}">
        <label>LL 当前密码<input type="password" name="currentPassword" autocomplete="current-password" required></label>
        <label>输入 RESTORE 确认<input type="text" name="confirmText" autocomplete="off" pattern="RESTORE" required></label>
        <button class="btn btn-danger" type="submit">恢复这个备份</button>
        <p id="restoreStatus" class="modal-error" role="status"></p>
      </form>
    </div>`;
    $$("[data-backup-close]", modal).forEach((node) => node.addEventListener("click", closeRestoreModal));
    $("#restoreForm")?.addEventListener("submit", submitRestore);
  }

  function closeRestoreModal() {
    const modal = $("#backupModal");
    modal.classList.add("is-hidden");
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = "";
  }

  async function submitRestore(event) {
    event.preventDefault();
    if (String(currentUser?.username || "").toUpperCase() !== "LL") return;
    const form = new FormData(event.currentTarget);
    const status = $("#restoreStatus");
    try {
      const response = await apiFetch("/api/routebook/backups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "restore",
          backupId: form.get("backupId"),
          currentPassword: form.get("currentPassword"),
          confirm: form.get("confirmText")
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (recoverAuthFromResponse(response, payload)) { closeRestoreModal(); return; }
        throw new Error(payload.error || "恢复失败");
      }
      status.classList.add("is-success");
      status.textContent = "恢复完成。为确保安全，请重新登录。";
      setTimeout(() => { closeRestoreModal(); logout(); }, 1200);
    } catch (error) {
      status.classList.remove("is-success");
      status.textContent = error.message || "恢复失败";
    }
  }

  function renderPrep() {
    $("#prepGrid").innerHTML = data.prep.map((item) => `<article class="prep-card"><div class="prep-icon">${esc(item.icon)}</div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><a href="${item.link}" target="_blank" rel="noreferrer">${esc(item.label)} ↗</a></article>`).join("");
  }

  function renderSources() {
    $("#sourceList").innerHTML = data.sources.map((source) => `<div class="source-item"><a href="${source.url}" target="_blank" rel="noreferrer">${esc(source.label)} ↗</a><span>${esc(source.note)}</span></div>`).join("");
  }

  function journalEntryHasContent(entry = {}) {
    return Boolean(
      String(entry.summary || "").trim() ||
      String(entry.food || "").trim() ||
      String(entry.feeling || "").trim() ||
      (Array.isArray(entry.photos) && entry.photos.length)
    );
  }

  function safeJournalPhoto(value) {
    const source = String(value || "");
    if (/^data:image\/(?:jpeg|png|webp);base64,/i.test(source)) return source;
    if (/^https:\/\//i.test(source)) return source;
    return "";
  }

  function journalText(value, emptyText) {
    const text = String(value || "").trim();
    return text ? esc(text).replace(/\n/g, "<br>") : `<span class="journal-empty">${emptyText}</span>`;
  }

  function renderJournalGallery(dayId) {
    const target = $("#journalEntries");
    if (!target) return;
    const currentUsername = String(currentUser?.username || "").toUpperCase();
    target.innerHTML = JOURNAL_USERS.map((username) => {
      const entry = journals[username]?.[dayId] || {};
      const photos = (Array.isArray(entry.photos) ? entry.photos : []).map(safeJournalPhoto).filter(Boolean);
      const hasContent = journalEntryHasContent(entry);
      const canManage = canEdit && username === currentUsername && hasContent;
      return `<article class="journal-entry-card ${hasContent ? "has-content" : "is-empty"}">
        <header><div class="journal-avatar">${esc(username.slice(0, 2))}</div><div><strong>${esc(JOURNAL_LABELS[username])}</strong><span>${hasContent && entry.savedAt ? "更新于 " + esc(new Date(entry.savedAt).toLocaleString("zh-CN")) : "尚未填写这一天"}</span></div></header>
        ${canManage ? `<div class="journal-entry-actions"><button class="journal-entry-action" type="button" data-edit-journal="${esc(dayId)}">编辑</button><button class="journal-entry-action journal-entry-action-danger" type="button" data-delete-journal="${esc(dayId)}">删除</button></div>` : ""}
        ${hasContent ? `<div class="journal-entry-copy"><section><h4>今天的纪要</h4><p>${journalText(entry.summary, "未填写")}</p></section><div class="journal-entry-pair"><section><h4>好吃的 / 餐厅</h4><p>${journalText(entry.food, "未填写")}</p></section><section><h4>好玩的 / 感受</h4><p>${journalText(entry.feeling, "未填写")}</p></section></div></div>${photos.length ? `<div class="journal-entry-photos">${photos.map((photo) => `<img src="${photo}" alt="${esc(JOURNAL_LABELS[username])}的游记照片" loading="lazy">`).join("")}</div>` : ""}` : `<p class="journal-empty-note">旅途中写下的文字和照片会显示在这里。</p>`}
      </article>`;
    }).join("");

    target.querySelectorAll("[data-edit-journal]").forEach((button) => button.addEventListener("click", () => {
      activeJournalId = button.dataset.editJournal;
      renderJournalPicker();
      loadJournalForm(activeJournalId);
      $(".journal-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => $("#journalSummary")?.focus(), 350);
    }));
    target.querySelectorAll("[data-delete-journal]").forEach((button) => button.addEventListener("click", () => deleteJournal(button.dataset.deleteJournal)));
  }

  function renderJournalPicker() {
    $("#journalPicker").innerHTML = data.days.map((day) => {
      const count = JOURNAL_USERS.filter((username) => journalEntryHasContent(journals[username]?.[day.id])).length;
      return `<button class="journal-day ${day.id === activeJournalId ? "is-active" : ""}" data-journal-picker="${day.id}"><strong>${esc(day.date)}</strong><span>${esc(day.base)} · ${count}人已写</span></button>`;
    }).join("");
    document.querySelectorAll("[data-journal-picker]").forEach((button) => button.addEventListener("click", () => { activeJournalId = button.dataset.journalPicker; localStorage.setItem("au-nz-journal-day", activeJournalId); renderJournalPicker(); loadJournalForm(activeJournalId); }));
  }

  function loadJournalForm(dayId) {
    const day = dayById(dayId) || data.days[0];
    activeJournalId = day.id;
    const entry = journal[day.id] || {};
    renderJournalGallery(day.id);
    const editorTitle = $("#journalEditorTitle");
    if (editorTitle) editorTitle.textContent = canEdit ? `编辑我的游记 · ${JOURNAL_LABELS[currentUser?.username] || currentUser?.username || ""}` : "登录后编辑自己的游记";
    $("#journalPrompt").innerHTML = `<strong>${esc(day.date)} · ${esc(day.title)}</strong><br>${esc((day.journalPrompts || ["今天最想记住什么？", "有没有下次会改变的安排？"]).join(" · "))}`;
    $("#journalSummary").value = entry.summary || "";
    $("#journalFood").value = entry.food || "";
    $("#journalFeeling").value = entry.feeling || "";
    pendingPhotos = Array.isArray(entry.photos) ? entry.photos : [];
    renderPhotoPreview();
    ["#journalSummary", "#journalFood", "#journalFeeling", "#journalPhotos", "#saveJournalBtn"].forEach((selector) => { const node = $(selector); if (node) node.disabled = !canEdit; });
    const saveButton = $("#saveJournalBtn");
    if (saveButton) saveButton.textContent = journalEntryHasContent(entry) ? "保存修改" : "保存我的当天游记";
    $("#journalSaved").textContent = canEdit ? (entry.savedAt ? `已保存 ${new Date(entry.savedAt).toLocaleString("zh-CN")}` : "尚未填写") : "游客只读：登录后可编辑";
  }
  function renderPhotoPreview() {
    const photos = pendingPhotos.map(safeJournalPhoto).filter(Boolean);
    $("#journalPhotoPreview").innerHTML = photos.length ? photos.map((photo) => `<img src="${photo}" alt="游记照片">`).join("") : `<span class="micro">还没有照片</span>`;
  }

  function compressImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 1200;
          const ratio = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * ratio));
          canvas.height = Math.max(1, Math.round(img.height * ratio));
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", .76));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function refreshJournalState() {
    try {
      const response = await apiFetch("/api/routebook/journal");
      if (!response.ok) return;
      const payload = await response.json();
      const remoteBooks = payload.journals && typeof payload.journals === "object" ? payload.journals : {};
      const remoteDeletions = payload.deletions && typeof payload.deletions === "object" ? payload.deletions : {};
      const currentUsername = String(currentUser?.username || "").toUpperCase();

      // Compatibility during a rolling deployment from the former shared API.
      if (payload.entries && JOURNAL_USERS.includes(currentUsername) && !remoteBooks[currentUsername]) {
        remoteBooks[currentUsername] = payload.entries;
      }

      for (const username of JOURNAL_USERS) {
        const remote = remoteBooks[username] && typeof remoteBooks[username] === "object" ? remoteBooks[username] : {};
        const local = username === currentUsername ? journal : {};
        const deletions = remoteDeletions[username] && typeof remoteDeletions[username] === "object" ? remoteDeletions[username] : {};
        const merged = { ...remote };
        Object.entries(local).forEach(([dayId, entry]) => {
          const remoteTime = Date.parse(remote[dayId]?.savedAt || 0) || 0;
          const localTime = Date.parse(entry?.savedAt || 0) || 0;
          const deletedTime = Date.parse(deletions[dayId] || 0) || 0;
          if (deletedTime >= localTime) {
            delete merged[dayId];
            return;
          }
          if (!remote[dayId] || localTime > remoteTime) merged[dayId] = entry;
        });
        journals[username] = merged;
      }

      if (JOURNAL_USERS.includes(currentUsername)) {
        journal = journals[currentUsername];
        try { persistCurrentJournal(); } catch { /* keep memory copy */ }
      }
      renderJournalPicker();
      renderJournalGallery(activeJournalId);
    } catch { /* cached journal remains available */ }
  }

  async function saveJournal() {
    if (!canEdit || !currentUser) { $("#journalSaved").textContent = "请先登录后再保存游记"; return; }
    const username = String(currentUser.username || "").toUpperCase();
    const entry = {
      summary: $("#journalSummary").value,
      food: $("#journalFood").value,
      feeling: $("#journalFeeling").value,
      photos: pendingPhotos.map(safeJournalPhoto).filter(Boolean),
      savedAt: new Date().toISOString(),
      updatedBy: username
    };
    journal[activeJournalId] = entry;
    journals[username] = journal;
    let localSaved = true;
    try {
      persistCurrentJournal();
      $("#journalSaved").textContent = "本机已保存，正在同步…";
    } catch {
      localSaved = false;
      $("#journalSaved").textContent = "本机缓存不可用，正在同步云端…";
    }
    renderJournalPicker();
    renderJournalGallery(activeJournalId);
    try {
      const response = await apiFetch("/api/routebook/journal", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dayId: activeJournalId, entry })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (recoverAuthFromResponse(response, payload)) return;
        throw new Error(payload.error || "云端同步失败");
      }
      journal[activeJournalId] = payload.entry || entry;
      journals[username] = journal;
      try { persistCurrentJournal(); } catch { /* cloud copy is authoritative */ }
      renderJournalGallery(activeJournalId);
      $("#journalSaved").textContent = `${localSaved ? "本机与云端均" : "云端"}已保存 ${new Date().toLocaleString("zh-CN")}`;
    } catch (error) {
      $("#journalSaved").textContent = localSaved
        ? `本机已保存；${error.message || "云端同步暂不可用"}`
        : `保存失败：${error.message || "本机缓存与云端均不可用"}`;
    }
  }

  async function deleteJournal(dayId) {
    if (!canEdit || !currentUser) {
      $("#journalSaved").textContent = "请先登录后再删除游记";
      return;
    }
    const day = dayById(dayId);
    if (!window.confirm(`确认删除你在 ${day?.date || dayId} 的游记吗？删除后可通过备份恢复，但网页中会立即移除。`)) return;
    const button = document.querySelector("[data-delete-journal]");
    if (button) {
      button.disabled = true;
      button.textContent = "删除中…";
    }
    try {
      const response = await apiFetch(`/api/routebook/journal/${encodeURIComponent(dayId)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (recoverAuthFromResponse(response, payload)) return;
        throw new Error(payload.error || "删除失败");
      }
      const username = String(currentUser.username || "").toUpperCase();
      delete journal[dayId];
      journals[username] = journal;
      try { persistCurrentJournal(); } catch { /* server deletion is authoritative */ }
      pendingPhotos = [];
      const photoInput = $("#journalPhotos");
      if (photoInput) photoInput.value = "";
      renderJournalPicker();
      loadJournalForm(dayId);
      $("#journalSaved").textContent = "已删除本人当天游记";
    } catch (error) {
      $("#journalSaved").textContent = error.message || "删除失败";
      renderJournalGallery(dayId);
    }
  }

  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportMarkdown() {
    const lines = [`# ${data.meta.title}`, `\n${data.meta.dates} · ${data.meta.travelers}`, ""];
    data.days.forEach((day) => {
      lines.push(`## ${day.date} · ${day.title}`, `住宿：${day.base}`, "");
      JOURNAL_USERS.forEach((username) => {
        const entry = journals[username]?.[day.id] || {};
        lines.push(
          `### ${JOURNAL_LABELS[username]}`,
          entry.summary || "（还没有填写当天纪要）",
          "",
          `**好吃的**：${entry.food || "未填写"}`,
          `**好玩的 / 感受**：${entry.feeling || "未填写"}`,
          entry.photos?.length ? `照片：${entry.photos.length}张（请同时保存JSON或页面截图）` : "",
          ""
        );
      });
    });
    download("澳新之春-四人每日游记.md", lines.join("\n"), "text/markdown;charset=utf-8");
  }

  function exportJson() {
    download("澳新之春-四人每日游记.json", JSON.stringify({ meta: data.meta, journals }, null, 2), "application/json;charset=utf-8");
  }

  function injectLeaflet() {
    if (window.L) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(css);
      const script = document.createElement("script"); script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
    });
  }

  async function loadMap() {
    $("#mapWrap").classList.remove("is-hidden");
    $("#loadMapBtn").disabled = true;
    $("#loadMapBtn").textContent = "地图加载中…";
    try {
      await injectLeaflet();
      mapLoaded = true;
      map = L.map("map", { zoomControl: true, scrollWheelZoom: false }).setView([-44.4, 170.1], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
      mapLayer = L.layerGroup().addTo(map);
      selectMap($("#mapDaySelect").value || "nz");
      $("#loadMapBtn").textContent = "刷新地图";
      setTimeout(() => map.invalidateSize(), 150);
    } catch {
      $("#map").innerHTML = `<p style="padding:20px">地图底图加载失败。请使用路线卡片和每日Google导航，文字内容不受影响。</p>`;
      $("#loadMapBtn").disabled = false;
      $("#loadMapBtn").textContent = "重试地图";
    }
  }

  function addMarker(point, number, kind) {
    const marker = L.marker([point.lat, point.lng], { icon: L.divIcon({ className: "", html: `<div style="width:30px;height:30px;display:grid;place-items:center;border:3px solid white;border-radius:50%;color:white;background:#183a35;box-shadow:0 3px 10px rgba(0,0,0,.28);font:800 11px system-ui">${number}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(mapLayer);
    marker.bindPopup(`<strong>${esc(point.name)}</strong><br><small>${esc(kind || "")}</small><br><a href="${q(point.name)}" target="_blank">Google地图</a>`);
  }

  function selectMap(selection) {
    if (!map || !mapLayer) return;
    $("#mapDaySelect").value = selection;
    mapLayer.clearLayers();
    let points;
    let title;
    let note;
    if (selection === "australia") { points = data.regions.australia; title = "澳洲城市段"; note = "城市段以航班连接，线条只表示方向。"; }
    else if (selection === "nz") { points = data.regions.newZealand; title = "新西兰南岛自驾总线"; note = `${data.meta.distanceKm.toLocaleString()} km，自驾方向示意。`; }
    else { const day = dayById(selection); points = day.stops || []; title = `${day.date} · ${day.base}`; note = `${day.distanceKm || 0} km · ${day.driveTime || ""}`; }
    const latLngs = points.map((point) => [point.lat, point.lng]);
    if (latLngs.length > 1) L.polyline(latLngs, { color: "#c86f4d", weight: 4, opacity: .86, dashArray: selection === "australia" ? "8 8" : undefined }).addTo(mapLayer);
    points.forEach((point, index) => addMarker(point, index + 1, point.kind || "路线点"));
    if (latLngs.length) map.fitBounds(latLngs, { padding: [35, 35], maxZoom: selection === "australia" ? 5 : 11 });
    $("#mapSide").innerHTML = `<h3>${esc(title)}</h3><p>${esc(note)}</p>${selection !== "australia" && selection !== "nz" ? `<a class="link-btn link-btn-primary" href="${dayById(selection).routeUrl}" target="_blank" rel="noreferrer">打开当天Google路线</a>` : ""}${points.map((point, index) => `<div class="map-stop"><span class="map-stop__num">${index + 1}</span><div><strong>${esc(point.name)}</strong><a href="${q(point.name)}" target="_blank" rel="noreferrer">打开Google地址</a></div></div>`).join("")}`;
    setTimeout(() => map.invalidateSize(), 100);
  }

  function bindShell() {
    $("#printBtn").addEventListener("click", () => window.print());
    $("#journalPrintBtn").addEventListener("click", () => window.print());
    $("#exportMdBtn").addEventListener("click", exportMarkdown);
    $("#exportJsonBtn").addEventListener("click", exportJson);
    $("#loadMapBtn").addEventListener("click", loadMap);
    $("#menuBtn")?.addEventListener("click", () => { const nav = $("#topnav"); if (!nav) return; const on = nav.classList.toggle("is-open"); $("#menuBtn")?.setAttribute("aria-expanded", String(on)); });
    $$("#topnav a").forEach((link) => link.addEventListener("click", () => $("#topnav")?.classList.remove("is-open")));
    $("#backTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    window.addEventListener("scroll", () => $("#backTop").classList.toggle("is-visible", window.scrollY > 900), { passive: true });
    $("#saveJournalBtn").addEventListener("click", saveJournal);
    $("#journalPhotos").addEventListener("change", async (event) => { if (!canEdit) return; const files = [...event.target.files].slice(0, 6); pendingPhotos = await Promise.all(files.map(compressImage)); renderPhotoPreview(); });
    renderAuthBar();
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
