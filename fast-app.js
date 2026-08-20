(() => {
  const data = window.TRIP_DATA || {};
  const days = Array.isArray(data.days) ? data.days : [];
  const hotels = Array.isArray(data.hotels) ? data.hotels : [];
  const $ = (id) => document.getElementById(id);
  const esc = (v = "") => String(v).replace(/[&<>\"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const first = (obj, keys, fallback = "") => keys.find(k => obj && obj[k] != null) ? obj[keys.find(k => obj && obj[k] != null)] : fallback;
  const arr = (v) => Array.isArray(v) ? v : v ? [v] : [];
  const search = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || "New Zealand")}`;
  const imageFallback = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><rect width='800' height='500' fill='#dfe8e2'/><path d='M0 380 210 170l120 125 130-170 340 255v120H0z' fill='#789b8b'/><text x='400' y='445' text-anchor='middle' font-family='sans-serif' font-size='24' fill='#18342e'>New Zealand South Island</text></svg>`);
  const img = (src, alt) => `<img loading="lazy" decoding="async" src="${esc(src || imageFallback)}" alt="${esc(alt)}" onerror="this.onerror=null;this.src='${imageFallback}'">`;
  const textOf = (v) => typeof v === "string" ? v : v && typeof v === "object" ? first(v,["desc","text","note","tip","title","name"],"") : String(v || "");
  const list = (v) => arr(v).filter(Boolean).map(x => `<li>${esc(textOf(x))}</li>`).join("");

  const fixedRoute = [
    ["09.25","基督城机场"],["09.26","特卡波"],["09.27","库克山／特威泽尔"],["09.28–29","瓦纳卡"],
    ["09.30–10.01","皇后镇"],["10.02–03","蒂阿瑙／米尔福德"],["10.04","哈斯特"],["10.05","弗朗兹约瑟夫"],
    ["10.06","霍基蒂卡"],["10.07","Arthur's Pass／Castle Hill"],["10.08–09","基督城"],["10.10","返程"]
  ];
  $("route-strip").innerHTML = fixedRoute.map(([date,name]) => `<div class="route-stop"><strong>${date}</strong><span>${name}</span></div>`).join("");

  function dayLabel(d, i){ return first(d,["date"],`D${i+1}`); }
  $("day-tabs").innerHTML = days.map((d,i) => `<button class="day-tab ${i===0?"is-active":""}" data-day="${i}"><strong>${esc(dayLabel(d,i))}</strong><span>Day ${i+1}</span></button>`).join("");

  function routeLink(d){
    const direct = first(d,["mapUrl","routeUrl","googleMap","googleMaps"],"");
    if (direct) return direct;
    const route = first(d,["route","title","summary"],"New Zealand");
    return search(typeof route === "string" ? route : textOf(route));
  }
  function renderCards(items, type){
    return arr(items).map((x) => {
      if (typeof x === "string") return `<article class="mini-card"><div class="mini-card__body"><h5>${esc(x)}</h5></div></article>`;
      const name = first(x,["name","title","place"], type==="meal"?"餐饮建议":"精华景点");
      const desc = first(x,["desc","note","tip","text"],"");
      const photo = first(x,["image","photo","img"],"");
      const link = first(x,["link","url","map"], search(name));
      return `<article class="mini-card">${photo?img(photo,name):""}<div class="mini-card__body"><h5>${esc(name)}</h5><p>${esc(desc)}</p><a class="text-link" target="_blank" rel="noopener" href="${esc(link)}">${type==="meal"?"查看餐厅 / 导航":"地图定位"} →</a></div></article>`;
    }).join("");
  }
  function renderDay(i){
    const d = days[i] || {};
    document.querySelectorAll(".day-tab").forEach((b,n)=>b.classList.toggle("is-active",n===i));
    const title = first(d,["title","name"],`Day ${i+1}`);
    const summary = first(d,["summary","intro","description"],"");
    const hero = first(d,["image","photo","hero"],"");
    const schedule = first(d,["schedule","timeline","plan"],[]);
    const highlights = first(d,["highlights","spots","places"],[]);
    const meals = first(d,["meals","food","restaurants"],[]);
    const notes = [
      ["加油",first(d,["fuel","gas"],"")],["穿着",first(d,["wear","clothing","dress"],"")],
      ["行程把控",first(d,["caution","attention","notes"],"")],["预约",first(d,["booking","reserve"],"")],
      ["天气备选",first(d,["planB","backup"],"")]
    ].filter(([,v])=>arr(v).length || typeof v === "string" && v);
    $("day-detail").innerHTML = `
      <div class="day-hero" style="--day-image:url('${esc(hero || imageFallback)}')"><div><p>${esc(dayLabel(d,i))} · Day ${i+1}</p><h3>${esc(title)}</h3></div></div>
      <div class="day-body">
        <div class="day-meta"><span class="pill">${esc(first(d,["route"],"南岛自驾"))}</span><span class="pill">${esc(first(d,["drive","driving"],"按当天路况调整"))}</span></div>
        ${summary?`<p class="lead">${esc(summary)}</p>`:""}
        <div class="map-actions"><a class="button button--primary" target="_blank" rel="noopener" href="${esc(routeLink(d))}">Google Maps 当天导航</a></div>
        <div class="grid-2">
          <section class="panel"><h4>时间安排</h4><ol class="timeline">${arr(schedule).map(x=>`<li><strong>${esc(first(x,["time"],""))}</strong> ${esc(textOf(x))}</li>`).join("") || "<li>详细安排见正式版。</li>"}</ol></section>
          <section class="panel"><h4>当天注意事项</h4>${notes.map(([k,v])=>`<p><strong>${k}：</strong>${esc(arr(v).map(textOf).join("；"))}</p>`).join("") || "<p>以当天天气与道路公告为准。</p>"}</section>
        </div>
        ${arr(highlights).length?`<h4>精华景点与拍照点</h4><div class="highlight-grid">${renderCards(highlights,"spot")}</div>`:""}
        ${arr(meals).length?`<h4>餐饮建议</h4><div class="meal-grid">${renderCards(meals,"meal")}</div>`:""}
      </div>`;
    $("day-detail").scrollIntoView({behavior:"smooth",block:"start"});
  }
  $("day-tabs").addEventListener("click",(e)=>{ const b=e.target.closest("[data-day]"); if(b) renderDay(Number(b.dataset.day)); });

  $("hotel-grid").innerHTML = hotels.map((h) => {
    const city=first(h,["city","location"],"新西兰"); const name=first(h,["name","title"],city+"住宿");
    const address=first(h,["address"],""); const photo=first(h,["image","photo","img"],""); const cost=first(h,["cost","price","total"],"");
    const detail=[first(h,["rooms","bedrooms"],""),first(h,["baths","bathrooms"],""),first(h,["parking"],"")].filter(Boolean).join(" · ");
    return `<article class="hotel-card">${img(photo,name)}<div class="hotel-card__body"><p>${esc(first(h,["date","dates"],""))} · ${esc(city)}</p><h3>${esc(name)}</h3><p>${esc(address)}</p><p>${esc(detail)}</p>${cost!==""?`<strong>¥${Number(cost).toLocaleString("zh-CN",{minimumFractionDigits:2})}</strong>`:""}<br><a class="text-link" target="_blank" rel="noopener" href="${search(address||name)}">Google 导航 →</a></div></article>`;
  }).join("");

  const booking = first(data,["bookingChecklist","bookings","booking"],[]);
  $("booking-list").innerHTML = arr(booking).map((x,i)=>`<article class="check-card"><h3>${esc(first(x,["title","name"],`预约项目 ${i+1}`))}</h3><p>${esc(first(x,["desc","note","deadline","text"],textOf(x)))}</p>${first(x,["link","url"],"")?`<a class="text-link" target="_blank" rel="noopener" href="${esc(first(x,["link","url"],""))}">官方页面 →</a>`:""}</article>`).join("") || `<article class="check-card"><h3>重点预约</h3><p>Dark Sky、Skyline、Te Anau Glowworm、Milford Sound Cruise 建议提前预订。</p></article>`;
  renderDay(0);
})();
