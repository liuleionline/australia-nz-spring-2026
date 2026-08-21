(() => {
  "use strict";
  const pages = Array.from(document.querySelectorAll("[data-page]"));
  const pageNav = document.getElementById("pageNav");
  const pageButtons = Array.from(document.querySelectorAll("[data-page-target]"));
  const progress = document.getElementById("pageProgress");
  const currentLabel = document.getElementById("pageCurrentLabel");
  const previousButton = document.querySelector("[data-page-prev]");
  const nextButton = document.querySelector("[data-page-next]");
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const protectedIds = new Set(["lodging", "budget"]);
  const labels = Object.fromEntries(pages.map((page) => [page.dataset.page, page.dataset.pageLabel || page.id]));
  let authenticated = document.body.classList.contains("is-authenticated");
  let activeId = "overview";
  if (!pages.length || !pageNav) return;

  const availableIds = () => pages
    .filter((page) => authenticated || !protectedIds.has(page.dataset.page))
    .map((page) => page.dataset.page);

  const normalizedId = (id) => availableIds().includes(id) ? id : "overview";

  const applyAccess = () => {
    pages.forEach((page) => {
      const blocked = protectedIds.has(page.dataset.page) && !authenticated;
      page.dataset.authBlocked = String(blocked);
    });
    pageButtons.forEach((button) => {
      button.hidden = protectedIds.has(button.dataset.pageTarget) && !authenticated;
    });
  };

  const scrollToPager = () => {
    const top = Math.max(0, pageNav.getBoundingClientRect().top + window.scrollY - 10);
    window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
  };

  const updateControls = () => {
    const ids = availableIds();
    const index = ids.indexOf(activeId);
    const label = labels[activeId] || activeId;
    if (progress) progress.textContent = label;
    if (currentLabel) currentLabel.textContent = label;
    if (previousButton) {
      previousButton.disabled = index <= 0;
      previousButton.setAttribute("aria-disabled", String(index <= 0));
    }
    if (nextButton) {
      const atEnd = index < 0 || index >= ids.length - 1;
      nextButton.disabled = atEnd;
      nextButton.setAttribute("aria-disabled", String(atEnd));
    }
  };

  const showPage = (requestedId, options = {}) => {
    applyAccess();
    const id = normalizedId(requestedId);
    activeId = id;
    pages.forEach((page) => {
      const blocked = protectedIds.has(page.dataset.page) && !authenticated;
      const isActive = !blocked && page.dataset.page === id;
      page.hidden = blocked || !isActive;
      page.classList.toggle("is-active", isActive);
      page.setAttribute("aria-hidden", String(!isActive));
    });
    pageButtons.forEach((button) => {
      const blocked = protectedIds.has(button.dataset.pageTarget) && !authenticated;
      const isActive = !blocked && button.dataset.pageTarget === id;
      button.hidden = blocked;
      button.classList.toggle("is-active", isActive);
      if (isActive) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    document.body.classList.toggle("page-is-overview", id === "overview");
    document.documentElement.dataset.activePage = id;
    updateControls();
    if (options.push && window.location.hash !== "#" + id) {
      window.history.pushState({ page: id }, "", "#" + id);
    } else if (options.replace && window.location.hash !== "#" + id) {
      window.history.replaceState({ page: id }, "", "#" + id);
    }
    if (options.scroll) window.requestAnimationFrame(scrollToPager);
  };

  const goTo = (id) => showPage(id, { push: true, scroll: true });
  const move = (delta) => {
    const ids = availableIds();
    const target = ids[ids.indexOf(activeId) + delta];
    if (target) goTo(target);
  };

  pageButtons.forEach((button) => button.addEventListener("click", () => goTo(button.dataset.pageTarget)));
  previousButton?.addEventListener("click", () => move(-1));
  nextButton?.addEventListener("click", () => move(1));

  document.addEventListener("click", (event) => {
    const element = event.target instanceof Element ? event.target : null;
    const link = element?.closest("a[href^='#']");
    const target = (link?.getAttribute("href") || "").replace(/^#/, "");
    if (link && pages.some((page) => page.dataset.page === target)) {
      event.preventDefault();
      goTo(target);
      return;
    }
    if (element?.closest("[data-journal-day]")) showPage("journal", { push: true, scroll: true });
  });

  window.addEventListener("hashchange", () => showPage(window.location.hash.slice(1) || "overview", { scroll: true }));
  document.addEventListener("routebook:auth-changed", (event) => {
    authenticated = Boolean(event.detail?.authenticated);
    const target = normalizedId(activeId);
    showPage(target, { replace: target !== activeId, scroll: false });
  });

  window.routebookNavigate = (id) => goTo(id);
  const initial = window.location.hash.slice(1) || "overview";
  showPage(initial, { replace: normalizedId(initial) !== initial, scroll: Boolean(window.location.hash) });
})();