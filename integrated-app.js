(function () {
  "use strict";
  const API_BASE = String(window.ROUTEBOOK_API_BASE || "").replace(/\/$/, "");
  const apiUrl = (path) => `${API_BASE}${path}`;
  const data = window.TRIP_DATA;
  const baseExpenses = [];
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

  let activeDayId = localStorage.getItem("au-nz-active-day") || data.days[0].id;
  let activeJournalId = localStorage.getItem("au-nz-journal-day") || activeDayId;
  let journal = loadJournal();
  let pendingPhotos = [];
  let map;
  let mapLayer;
  let mapLoaded = false;
  let currentUser = null;
  let canEdit = false;

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

  function loadJournal() {
    try { return JSON.parse(localStorage.getItem("au-nz-journal-v1") || "{}"); } catch { return {}; }
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
      const response = await fetch(apiUrl("/api/routebook/auth"), { credentials: "include" });
      if (response.ok) { const payload = await response.json(); currentUser = payload.user || null; }
    } catch { currentUser = null; }
    canEdit = !!currentUser && !currentUser.mustChange;
    syncAuthState();
    await refreshTaskState();
    await refreshExpenseState();
  }

  async function refreshExpenseState() {
    try {
      const response = await fetch(apiUrl("/api/routebook/expenses"), { credentials: "include" });
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
    if (!currentUser) bar.innerHTML = `<span class="auth-welcome">游客 · 仅查看</span><button class="auth-button" id="loginBtn" type="button">参与者登录</button>`;
    else bar.innerHTML = `<span class="auth-welcome">${esc(currentUser.display_name || currentUser.username)} · ${canEdit ? "可编辑" : "请改密码"}</span><button class="auth-button" id="authActionBtn" type="button">${canEdit ? "退出" : "修改密码"}</button>`;
    $("#loginBtn")?.addEventListener("click", () => openLoginModal(false));
    $("#authActionBtn")?.addEventListener("click", () => canEdit ? logout() : openLoginModal(true));
  }

  function openLoginModal(forceChange) {
    const modal = $("#loginModal");
    modal.classList.remove("is-hidden"); modal.setAttribute("aria-hidden", "false");
    const title = forceChange ? "首次登录，请修改密码" : "旅行者登录";
    const fields = forceChange
      ? `<label>当前密码<input name="currentPassword" type="password" autocomplete="current-password" required></label><label>新密码<input name="newPassword" type="password" autocomplete="new-password" placeholder="至少6位" required></label>`
      : `<label>账号<select name="username"><option>LL</option><option>YM</option><option>QNL</option><option>SZ</option></select></label><label>密码<input name="password" type="password" autocomplete="current-password" required></label>`;
    modal.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-label="${title}"><button class="modal-close" id="modalClose" type="button" aria-label="关闭">×</button><p class="eyebrow">TRAVELER ACCESS</p><h2>${title}</h2><p class="modal-note">LL、YM、QNL、SZ 初始密码均为 000000；首次登录后必须设置新密码。</p><form id="authForm" class="modal-form">${fields}<button class="btn btn-accent" type="submit">${forceChange ? "保存新密码" : "登录"}</button><p id="authError" class="modal-error" role="alert"></p></form></div>`;

    $("#modalClose").addEventListener("click", closeLoginModal);
    $("#authForm").addEventListener("submit", async (event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget); const isChange = forceChange || !!currentUser;
      const body = isChange ? { action: "change-password", currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") } : { action: "login", username: form.get("username"), password: form.get("password") };
      try { const response = await fetch(apiUrl("/api/routebook/auth"), { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "操作失败"); if (body.action === "login") { currentUser = payload.user; if (payload.user.mustChange) { closeLoginModal(); openLoginModal(true); return; } } else { currentUser = { ...currentUser, mustChange: false }; } canEdit = true; syncAuthState(); closeLoginModal(); await refreshTaskState(); await refreshExpenseState(); renderAuthBar(); renderBookings(); renderBudget(); loadJournalForm(activeJournalId); } catch (error) { $("#authError").textContent = error.message || "操作失败，请稍后重试"; }
    });
  }

  function closeLoginModal() { const modal = $("#loginModal"); modal.classList.add("is-hidden"); modal.setAttribute("aria-hidden", "true"); modal.innerHTML = ""; }
  async function logout() { try { await fetch(apiUrl("/api/routebook/auth"), { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "logout" }) }); } catch { /* ignore */ } currentUser = null; canEdit = false; syncAuthState(); renderAuthBar(); renderBookings(); renderBudget(); loadJournalForm(activeJournalId); }

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
    return `<ol class="timeline ${compact ? "timeline-compact" : ""}">${items.map((item) => `<li class="timeline-item"><div class="timeline-time">${esc(item.time)}</div><div class="timeline-content"><h4>${esc(item.title)}</h4><p>${esc(item.notes)}</p><div class="micro-links"><a class="micro-link" href="${q(item.query)}" target="_blank" rel="noreferrer">Google地址 ↗</a></div></div></li>`).join("")}</ol>`;
  }

  function renderHighlights(items = []) {
    return `<div class="highlight-grid">${items.map((item) => `<article class="place-card"><img class="place-card-image" src="${item.image || fallbackImage}" alt="${esc(item.name)}" loading="lazy" decoding="async"><div class="place-card-body"><span class="card-kicker">${esc(item.tag || "拍照点")}</span><h5>${esc(item.name)}</h5><p>${esc(item.notes)}</p><p class="photo-tip">📷 ${esc(item.photoTip || "留意光线和人流")}</p><a class="link-btn" href="${q(item.query)}" target="_blank" rel="noreferrer">Google地址</a></div></article>`).join("")}</div>`;
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
    $("#lodgingGrid").innerHTML = data.hotels.map((hotel) => `<article class="stay-card"><img class="stay-image" src="${hotel.image || fallbackImage}" alt="${esc(hotel.city)}住宿实景" loading="lazy" decoding="async" style="object-position:${esc(hotel.imagePosition || "center center")}" onerror="this.onerror=null;this.src='${fallbackImage}'"><div class="stay-body"><div class="stay-date">${esc(hotel.date)} · ${hotel.nights}晚 · ${esc(hotel.city)}</div><h3>${esc(hotel.name)}</h3><div class="stay-address">${esc(hotel.address)}</div><div class="stay-facts">${hotel.facts.map((fact) => `<span>${esc(fact)}</span>`).join("")}</div><p class="micro">${esc(hotel.note || "")}</p><div class="day-actions"><a class="link-btn link-btn-primary" href="${hotel.map}" target="_blank" rel="noreferrer">Google导航</a>${hotel.link ? `<a class="link-btn" href="${hotel.link}" target="_blank" rel="noreferrer">住宿页面</a>` : ""}</div>${hotel.price != null ? `<div class="stay-price"><strong>${money(hotel.price)}</strong><span>两家合计<br>你家 ${money(hotel.user)}<br>沈家 ${money(hotel.shen)}</span></div>` : ""}</div></article>`).join("");
  }

  async function refreshTaskState() {
    try {
      const response = await fetch(apiUrl("/api/routebook/tasks"), { credentials: "include" });
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
      taskState[id] = { ...(taskState[id] || {}), id, completed, completed_by: completed ? currentUser?.username : "" };
      item.classList.toggle("is-done", completed);
      try {
        const response = await fetch(apiUrl("/api/routebook/tasks"), { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ taskId: id, completed }) });
        if (!response.ok) throw new Error("task save failed");
        const saved = await response.json();
        taskState[id] = saved.task || taskState[id];
      } catch {
        try { const local = JSON.parse(localStorage.getItem("au-nz-bookings-v1") || "{}"); local[id] = completed; localStorage.setItem("au-nz-bookings-v1", JSON.stringify(local)); } catch { /* ignore */ }
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
    const labels = { LL: "LL / 3_stones", YM: "YM / 杨眉", QNL: "QNL / 兰花", SZ: "SZ / 飞流" };
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
    const people = [{ id: "LL", name: "LL / 3_stones" }, { id: "YM", name: "YM / 杨眉" }, { id: "QNL", name: "QNL / 兰花" }, { id: "SZ", name: "SZ / 飞流" }];
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
    const body = { id, amount: Number(form.get("amount")), type: String(form.get("type") || "其他"), payer: String(form.get("payer") || ""), participants, date: String(form.get("date") || ""), note: String(form.get("note") || "").trim() };
    if (!(body.amount > 0) || !body.date || !body.note) { $("#expenseError").textContent = "请把金额、日期和备注填写完整"; return; }
    expenseSubmitting = true; const button = event.currentTarget.querySelector("button[type=submit]"); if (button) { button.disabled = true; button.textContent = "保存中…"; }
    try {
      const response = await fetch(apiUrl("/api/routebook/expenses"), { method: id ? "PATCH" : "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "保存失败");
      data.accounting.expenses = id ? (data.accounting.expenses || []).map((item) => item.id === id ? payload.expense : item) : [...(data.accounting.expenses || []), payload.expense];
      closeExpenseModal(); renderBudget();
    } catch (error) {
      const errorNode = $("#expenseError"); if (errorNode) errorNode.textContent = error.message || "保存失败，请稍后重试";
      if (button) { button.disabled = false; button.textContent = id ? "保存修改" : "保存这笔消费"; }
    } finally { expenseSubmitting = false; }
  }

  async function deleteExpense(id) {
    if (!canEdit || !id || !window.confirm("确认删除这笔账目吗？删除后四个人都会看到更新。")) return;
    try {
      const response = await fetch(apiUrl("/api/routebook/expenses"), { method: "DELETE", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "删除失败");
      data.accounting.expenses = (data.accounting.expenses || []).filter((item) => item.id !== id); renderBudget();
    } catch (error) { window.alert(error.message || "删除失败，请稍后重试"); }
  }
  function renderPrep() {
    $("#prepGrid").innerHTML = data.prep.map((item) => `<article class="prep-card"><div class="prep-icon">${esc(item.icon)}</div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><a href="${item.link}" target="_blank" rel="noreferrer">${esc(item.label)} ↗</a></article>`).join("");
  }

  function renderSources() {
    $("#sourceList").innerHTML = data.sources.map((source) => `<div class="source-item"><a href="${source.url}" target="_blank" rel="noreferrer">${esc(source.label)} ↗</a><span>${esc(source.note)}</span></div>`).join("");
  }

  function renderJournalPicker() {
    $("#journalPicker").innerHTML = data.days.map((day) => `<button class="journal-day ${day.id === activeJournalId ? "is-active" : ""}" data-journal-picker="${day.id}"><strong>${esc(day.date)}</strong><span>${esc(day.base)}</span></button>`).join("");
    $$("[data-journal-picker]", $("#journalPicker")).forEach((button) => button.addEventListener("click", () => { activeJournalId = button.dataset.journalPicker; localStorage.setItem("au-nz-journal-day", activeJournalId); renderJournalPicker(); loadJournalForm(activeJournalId); }));
  }

  function loadJournalForm(dayId) {
    const day = dayById(dayId) || data.days[0];
    activeJournalId = day.id;
    const entry = journal[day.id] || {};
    $("#journalPrompt").innerHTML = `<strong>${esc(day.date)} · ${esc(day.title)}</strong><br>${esc((day.journalPrompts || ["今天最想记住什么？", "有没有下次会改变的安排？"]).join(" · "))}`;
    $("#journalSummary").value = entry.summary || "";
    $("#journalFood").value = entry.food || "";
    $("#journalFeeling").value = entry.feeling || "";
    pendingPhotos = entry.photos || [];
    renderPhotoPreview();
    ["#journalSummary", "#journalFood", "#journalFeeling", "#journalPhotos", "#saveJournalBtn"].forEach((selector) => { const node = $(selector); if (node) node.disabled = !canEdit; });
    $("#journalSaved").textContent = canEdit ? (entry.savedAt ? `已保存 ${new Date(entry.savedAt).toLocaleString("zh-CN")}` : "尚未填写") : "游客只读：登录后可编辑";
  }
  function renderPhotoPreview() {
    $("#journalPhotoPreview").innerHTML = pendingPhotos.length ? pendingPhotos.map((photo) => `<img src="${photo}" alt="游记照片">`).join("") : `<span class="micro">还没有照片</span>`;
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

  function saveJournal() {
    if (!canEdit) { $("#journalSaved").textContent = "请先登录后再保存游记"; return; }
    journal[activeJournalId] = { summary: $("#journalSummary").value, food: $("#journalFood").value, feeling: $("#journalFeeling").value, photos: pendingPhotos, savedAt: new Date().toISOString() };
    try {
      localStorage.setItem("au-nz-journal-v1", JSON.stringify(journal));
      $("#journalSaved").textContent = `已保存 ${new Date().toLocaleString("zh-CN")}`;
      renderJournalPicker();
    } catch (error) {
      $("#journalSaved").textContent = "保存失败：照片过大，请减少照片数量或先导出";
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
      const entry = journal[day.id] || {};
      lines.push(`## ${day.date} · ${day.title}`, `住宿：${day.base}`, "", entry.summary || "（还没有填写当天纪要）", "", `**好吃的**：${entry.food || ""}`, `**好玩的 / 感受**：${entry.feeling || ""}`, entry.photos?.length ? `照片：${entry.photos.length}张（请同时保存JSON或页面截图）` : "", "");
    });
    download("澳新之春-每日游记.md", lines.join("\n"), "text/markdown;charset=utf-8");
  }

  function exportJson() {
    download("澳新之春-每日游记.json", JSON.stringify({ meta: data.meta, journal }, null, 2), "application/json;charset=utf-8");
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
    $("#topnav a").forEach((link) => link.addEventListener("click", () => $("#topnav")?.classList.remove("is-open")));
    $("#backTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    window.addEventListener("scroll", () => $("#backTop").classList.toggle("is-visible", window.scrollY > 900), { passive: true });
    $("#saveJournalBtn").addEventListener("click", saveJournal);
    $("#journalPhotos").addEventListener("change", async (event) => { if (!canEdit) return; const files = [...event.target.files].slice(0, 6); pendingPhotos = await Promise.all(files.map(compressImage)); renderPhotoPreview(); });
    renderAuthBar();
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
