(function () {
  "use strict";
  const data = window.TRIP_DATA;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const money = (n) => new Intl.NumberFormat("zh-CN", { style:"currency", currency:"CNY", maximumFractionDigits:2 }).format(n);
  const hotelById = (id) => data.hotels.find(h => h.id === id);
  let activeDayId = data.days[0].id;
  let map;
  let mapLayer;

  const fallbackSvg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dce8df"/><stop offset="1" stop-color="#8bb4ad"/></linearGradient></defs><rect width="900" height="520" fill="url(#g)"/><path d="M0 420L170 240l110 100 160-210 180 220 110-130 170 200v100H0z" fill="#284f47" opacity=".62"/><circle cx="710" cy="105" r="48" fill="#f1b85b"/><text x="40" y="475" fill="white" font-family="sans-serif" font-size="28">South Island · New Zealand</text></svg>`);
  const fallbackImage = `data:image/svg+xml;charset=utf-8,${fallbackSvg}`;

  function init() {
    renderHero();
    renderOverview();
    renderDayPicker();
    renderDay(activeDayId);
    renderLodging();
    renderBookings();
    renderBudget();
    renderPrep();
    renderSources();
    initMap();
    bindShell();
    document.addEventListener("error", (event) => {
      if (event.target?.tagName === "IMG" && event.target.src !== fallbackImage) event.target.src = fallbackImage;
    }, true);
  }

  function renderHero() {
    const total = data.hotels.reduce((s, h) => s + h.price, 0);
    $("#heroStats").innerHTML = [
      `<span class="stat-pill"><strong>${data.meta.nights}</strong> 晚</span>`,
      `<span class="stat-pill"><strong>${data.days.length}</strong> 天</span>`,
      `<span class="stat-pill">约 <strong>${data.meta.distanceKm.toLocaleString()}</strong> km</span>`,
      `<span class="stat-pill">住宿 <strong>${money(total)}</strong></span>`
    ].join("");
  }

  function renderOverview() {
    const longDays = data.days.filter(d => d.distanceKm >= 220).length;
    const cards = [
      ["🧭", "基督城环线", "无需异地还车，山湖、峡湾、西海岸都覆盖"],
      ["🚘", `${data.meta.distanceKm.toLocaleString()} km`, `${longDays}个驾驶较长日，10.4是唯一超6小时转场`],
      ["🏡", "15晚已订", "11处住宿，停车优先；多数满足2卧/2卫需求"],
      ["🎟️", "4项重点预约", "Milford、Tekapo星空、Skyline与可选萤火虫洞"]
    ];
    $("#overviewCards").innerHTML = cards.map(c => `<article class="overview-card"><div class="overview-card__icon">${c[0]}</div><strong>${c[1]}</strong><span>${c[2]}</span></article>`).join("");
    $("#routeRibbon").innerHTML = data.meta.routeBases.map(s => `<span class="route-ribbon__stop">${s.name}</span>`).join("");
  }

  function renderDayPicker() {
    const picker = $("#dayPicker");
    picker.innerHTML = data.days.map((d, i) => `<button class="day-tab ${d.id === activeDayId ? "is-active" : ""}" role="tab" aria-selected="${d.id === activeDayId}" data-day="${d.id}"><span>DAY ${String(i + 1).padStart(2,"0")} · ${d.weekday}</span><strong>${d.date}</strong></button>`).join("");
    picker.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-day]");
      if (!btn) return;
      activeDayId = btn.dataset.day;
      $$(".day-tab", picker).forEach(b => { const on = b.dataset.day === activeDayId; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
      renderDay(activeDayId);
      selectMapDay(activeDayId);
      if (window.innerWidth < 720) $("#dayDetail").scrollIntoView({ behavior:"smooth", block:"start" });
    });
    $("#mapDaySelect").innerHTML = `<option value="all">全程总路线</option>` + data.days.map((d,i) => `<option value="${d.id}">DAY ${i+1} · ${d.date} ${d.base}</option>`).join("");
    $("#mapDaySelect").addEventListener("change", e => selectMapDay(e.target.value));
  }

  function renderDay(dayId) {
    const day = data.days.find(d => d.id === dayId);
    const stay = day.stayId ? hotelById(day.stayId) : null;
    const schedule = day.schedule.map(item => `<li class="timeline__item"><div class="timeline__time">${item.time}</div><div class="timeline__content"><h4>${item.title}</h4><p>${item.notes}</p><div class="micro-links"><a class="micro-link" href="${data.helpers.q(item.query)}" target="_blank" rel="noreferrer">Google地址 ↗</a></div></div></li>`).join("");
    const highlights = day.highlights.map(item => `<article class="place-card"><img class="place-card__image" src="${item.image}" alt="${item.name}" loading="lazy"/><div class="place-card__body"><span class="card-kicker">${item.tag}</span><h5>${item.name}</h5><p>${item.notes}</p><p class="photo-tip">📷 ${item.photoTip}</p><a class="link-btn" href="${data.helpers.q(item.query)}" target="_blank" rel="noreferrer">Google地址</a></div></article>`).join("");
    const meals = day.meals.map(item => `<article class="meal-card"><img class="meal-card__image" src="${item.image}" alt="餐饮示意图：${item.name}" loading="lazy"/><div class="meal-card__body"><span class="card-kicker">${item.type}${item.booking ? ` · ${item.booking}` : ""}</span><h5>${item.name}</h5><p>${item.notes}</p><a class="link-btn" href="${item.url}" target="_blank" rel="noreferrer">餐厅地图 / 详情</a></div></article>`).join("");
    const tips = [
      ["⛽ 加油", day.fuel], ["🧥 穿着", day.clothing], ["⚠️ 行程把控", day.caution], ["🎟️ 预约", day.booking], ["🌧️ Plan B", day.planB]
    ].map(t => `<article class="tip-card"><strong>${t[0]}</strong><p>${t[1]}</p></article>`).join("");
    $("#dayDetail").innerHTML = `
      <div class="day-hero" style="background-image:url('${day.image}')">
        <a class="day-hero__credit" href="#sources">图片来源：${day.credit}</a>
        <div class="day-hero__content"><div class="day-hero__meta"><span class="meta-pill">${day.date} · ${day.weekday}</span><span class="meta-pill">${day.distanceKm} km</span><span class="meta-pill">${day.driveTime}</span><span class="meta-pill">住 ${day.base}</span></div><h3>${day.title}</h3><p>${day.summary}</p></div>
      </div>
      <div class="day-body">
        <div class="day-actions"><a class="link-btn link-btn--primary" href="${day.routeUrl}" target="_blank" rel="noreferrer">打开当天Google路线</a>${stay ? `<a class="link-btn" href="${stay.map}" target="_blank" rel="noreferrer">导航到今晚住宿</a>` : ""}<button class="link-btn" type="button" data-show-map="${day.id}">在下方地图查看</button></div>
        ${day.distanceKm >= 400 ? `<div class="alert-box"><strong>今天是全程驾驶压力最高的一天。</strong> “纯驾驶时间”不含加油、吃饭和景点；请按路书主动删点，确保天黑前抵达。</div>` : ""}
        <ol class="timeline">${schedule}</ol>
        <div class="subsection"><h4>今日精华与拍照点</h4><div class="highlight-grid">${highlights}</div></div>
        <div class="subsection"><h4>餐饮建议 <small style="color:var(--muted);font-weight:400">· 图片为餐食氛围示意，营业时间临行复核</small></h4><div class="meal-grid">${meals}</div></div>
        <div class="subsection"><h4>当天注意事项</h4><div class="tips-grid">${tips}</div></div>
      </div>`;
    $("[data-show-map]", $("#dayDetail")).addEventListener("click", () => { selectMapDay(day.id); $("#route-map").scrollIntoView({behavior:"smooth"}); });
  }

  function renderLodging() {
    $("#lodgingGrid").innerHTML = data.hotels.map(h => `<article class="stay-card"><img class="stay-card__image" src="${h.image}" alt="${h.city}住宿区域" loading="lazy"/><div class="stay-card__body"><div class="stay-card__date">${h.date} · ${h.nights}晚 · ${h.city}</div><h3>${h.name}</h3><div class="stay-card__address">${h.address}</div><div class="stay-card__facts">${h.facts.map(f => `<span>${f}</span>`).join("")}</div><p style="color:var(--muted);font-size:12px">${h.note}</p><div class="day-actions"><a class="link-btn link-btn--primary" href="${h.map}" target="_blank" rel="noreferrer">Google导航</a>${h.link ? `<a class="link-btn" href="${h.link}" target="_blank" rel="noreferrer">住宿页面</a>` : ""}</div><div class="stay-card__price"><strong>${money(h.price)}</strong><span>${h.nights > 1 ? `约${money(h.price/h.nights)}/晚` : "整晚总价"}<br/>两家合计</span></div></div></article>`).join("");
  }

  function renderBookings() {
    const saved = JSON.parse(localStorage.getItem("nz-guide-bookings") || "{}");
    const list = $("#bookingList");
    list.innerHTML = data.bookings.map(b => `<label class="booking-item ${saved[b.id] ? "is-done" : ""}" data-booking="${b.id}"><input type="checkbox" ${saved[b.id] ? "checked" : ""}/><div><h3>${b.title}</h3><p>${b.note}</p><a class="micro-link" href="${b.link}" target="_blank" rel="noreferrer">官方/查询链接 ↗</a></div><span class="booking-item__priority">${b.priority}</span></label>`).join("");
    list.addEventListener("change", e => {
      const item = e.target.closest("[data-booking]");
      if (!item) return;
      saved[item.dataset.booking] = e.target.checked;
      item.classList.toggle("is-done", e.target.checked);
      localStorage.setItem("nz-guide-bookings", JSON.stringify(saved));
    });
  }

  function renderBudget() {
    const total = data.hotels.reduce((s,h) => s+h.price,0);
    const user = data.hotels.reduce((s,h) => s+h.user,0);
    const shen = data.hotels.reduce((s,h) => s+h.shen,0);
    $("#costSummary").innerHTML = `<div class="cost-hero"><span>15晚住宿总计</span><strong>${money(total)}</strong><small>截图小计已核对</small></div><div class="family-cost"><span>你家承担</span><strong>${money(user)}</strong><small>9.25房费489元</small></div><div class="family-cost"><span>沈家承担</span><strong>${money(shen)}</strong><small>9.25房费727元</small></div>`;
    $("#costRows").innerHTML = data.hotels.map(h => `<tr><td>${h.date} · ${h.city}</td><td>${h.nights}</td><td>${money(h.price)}</td><td>${money(h.user)}</td><td>${money(h.shen)}</td></tr>`).join("") + `<tr style="font-weight:900"><td>合计</td><td>${data.meta.nights}</td><td>${money(total)}</td><td>${money(user)}</td><td>${money(shen)}</td></tr>`;
  }

  function renderPrep() {
    $("#prepGrid").innerHTML = data.prep.map(p => `<article class="prep-card"><div class="prep-card__icon">${p.icon}</div><h3>${p.title}</h3><p>${p.text}</p><a href="${p.link}" target="_blank" rel="noreferrer">${p.label} ↗</a></article>`).join("");
  }

  function renderSources() {
    $("#sourceList").innerHTML = data.sources.map(s => `<div class="source-item"><a href="${s.url}" target="_blank" rel="noreferrer">${s.label} ↗</a><span>${s.note}</span></div>`).join("");
  }

  function initMap() {
    if (!window.L) {
      $("#map").innerHTML = `<div style="padding:30px">地图组件未加载。请联网刷新，或使用每日Google路线按钮。</div>`;
      return;
    }
    map = L.map("map", { zoomControl:true, scrollWheelZoom:false }).setView([-44.4,170.1],6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom:18, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    mapLayer = L.layerGroup().addTo(map);
    selectMapDay("all");
  }

  function selectMapDay(dayId) {
    if ($("#mapDaySelect")) $("#mapDaySelect").value = dayId;
    if (!map || !mapLayer) return;
    mapLayer.clearLayers();
    if (dayId === "all") {
      const pts = data.meta.routeBases.map(p => [p.lat,p.lng]);
      L.polyline(pts, {color:"#c87251", weight:4, opacity:.82, dashArray:"8 8"}).addTo(mapLayer);
      data.meta.routeBases.forEach((p,i) => addMarker(p, i+1, "路线基地"));
      map.fitBounds(pts, {padding:[35,35]});
      $("#mapSide").innerHTML = `<h3>全程总路线</h3><p>约${data.meta.distanceKm.toLocaleString()}公里 · 15晚。虚线为方向示意，不替代实际道路导航。</p>` + data.meta.routeBases.map((p,i) => mapStop(p,i)).join("");
    } else {
      const day = data.days.find(d => d.id === dayId);
      const pts = day.stops.map(p => [p.lat,p.lng]);
      L.polyline(pts, {color:"#c87251", weight:5, opacity:.85}).addTo(mapLayer);
      day.stops.forEach((p,i) => addMarker(p, i+1, p.kind));
      map.fitBounds(pts, {padding:[35,35], maxZoom:10});
      $("#mapSide").innerHTML = `<h3>${day.date} · ${day.base}</h3><p>${day.distanceKm} km · ${day.driveTime}</p><a class="link-btn link-btn--primary" href="${day.routeUrl}" target="_blank" rel="noreferrer">Google实际导航</a>` + day.stops.map((p,i) => mapStop(p,i)).join("");
    }
    setTimeout(() => map.invalidateSize(),100);
  }

  function addMarker(p, n, kind) {
    const marker = L.marker([p.lat,p.lng], { icon:L.divIcon({ className:"", html:`<div style="width:30px;height:30px;display:grid;place-items:center;border:3px solid white;border-radius:50%;color:white;background:#15352f;box-shadow:0 3px 10px rgba(0,0,0,.28);font:800 11px system-ui">${n}</div>`, iconSize:[30,30], iconAnchor:[15,15] }) }).addTo(mapLayer);
    marker.bindPopup(`<strong>${p.name}</strong><br><small>${kind || ""}</small>${p.map ? `<br><a href="${p.map}" target="_blank">Google地图</a>` : ""}`);
  }

  function mapStop(p, i) {
    const link = p.map || data.helpers.q(p.name);
    return `<div class="map-stop"><span class="map-stop__num">${i+1}</span><div><strong>${p.name}</strong><a href="${link}" target="_blank" rel="noreferrer">打开Google地址</a></div></div>`;
  }

  function bindShell() {
    $("#printBtn").addEventListener("click", () => window.print());
    $("#menuBtn").addEventListener("click", () => { const nav=$("#topnav"); const on=nav.classList.toggle("is-open"); $("#menuBtn").setAttribute("aria-expanded",String(on)); });
    $$("#topnav a").forEach(a => a.addEventListener("click", () => $("#topnav").classList.remove("is-open")));
    $("#backTop").addEventListener("click", () => window.scrollTo({top:0,behavior:"smooth"}));
    window.addEventListener("scroll", () => $("#backTop").classList.toggle("is-visible", window.scrollY > 900), {passive:true});
    $("[data-map-day='all']").addEventListener("click", () => selectMapDay("all"));
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
