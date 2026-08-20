(() => {
  const pages = Array.from(document.querySelectorAll("[data-page]"));
  const pageNav = document.getElementById("pageNav");
  const pageButtons = Array.from(document.querySelectorAll("[data-page-target]"));
  const progress = document.getElementById("pageProgress");
  const currentLabel = document.getElementById("pageCurrentLabel");
  const previousButton = document.querySelector("[data-page-prev]");
  const nextButton = document.querySelector("[data-page-next]");
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!pages.length || !pageNav) return;

  const pageIds = pages.map((page) => page.dataset.page);
  const labels = Object.fromEntries(pages.map((page) => [page.dataset.page, page.dataset.pageLabel || page.id]));
  let activeId = pageIds[0];

  const getHashPage = () => {
    const id = window.location.hash.replace(/^#/, "");
    return pageIds.includes(id) ? id : null;
  };

  const scrollToPager = () => {
    const top = Math.max(0, pageNav.getBoundingClientRect().top + window.scrollY - 10);
    window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
  };

  const updateControls = (index) => {
    const total = pages.length;
    const label = labels[activeId];
    if (progress) progress.textContent = (index + 1) + " / " + total + " · " + label;
    if (currentLabel) currentLabel.textContent = label;
    if (previousButton) {
      previousButton.disabled = index === 0;
      previousButton.setAttribute("aria-disabled", String(index === 0));
    }
    if (nextButton) {
      nextButton.disabled = index === total - 1;
      nextButton.setAttribute("aria-disabled", String(index === total - 1));
    }
  };

  const showPage = (id, options = {}) => {
    const index = pageIds.indexOf(id);
    if (index < 0) return;
    activeId = id;
    pages.forEach((page, pageIndex) => {
      const isActive = pageIndex === index;
      page.classList.toggle("is-active", isActive);
      page.setAttribute("aria-hidden", String(!isActive));
    });
    pageButtons.forEach((button) => {
      const isActive = button.dataset.pageTarget === id;
      button.classList.toggle("is-active", isActive);
      if (isActive) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    document.querySelectorAll("#topnav a").forEach((link) => {
      const target = (link.getAttribute("href") || "").replace(/^#/, "");
      if (target === id) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.body.classList.toggle("page-is-overview", id === "overview");
    document.documentElement.dataset.activePage = id;
    updateControls(index);
    if (options.push && window.location.hash !== "#" + id) {
      window.history.pushState({ page: id }, "", "#" + id);
    }
    if (options.scroll) window.requestAnimationFrame(scrollToPager);
  };

  const goTo = (id) => showPage(id, { push: true, scroll: true });

  pageButtons.forEach((button) => {
    button.addEventListener("click", () => goTo(button.dataset.pageTarget));
  });
  previousButton?.addEventListener("click", () => {
    const index = pageIds.indexOf(activeId);
    if (index > 0) goTo(pageIds[index - 1]);
  });
  nextButton?.addEventListener("click", () => {
    const index = pageIds.indexOf(activeId);
    if (index < pageIds.length - 1) goTo(pageIds[index + 1]);
  });

  document.addEventListener("click", (event) => {
    const element = event.target instanceof Element ? event.target : null;
    const link = element?.closest("a[href^='#']");
    const href = link?.getAttribute("href") || "";
    const target = href.replace(/^#/, "");
    if (link && pageIds.includes(target)) {
      event.preventDefault();
      goTo(target);
      document.getElementById("topnav")?.classList.remove("is-open");
      document.getElementById("menuBtn")?.setAttribute("aria-expanded", "false");
      return;
    }
    if (element?.closest("[data-journal-day]")) {
      showPage("journal", { push: true, scroll: true });
    }
  });

  window.addEventListener("hashchange", () => {
    const id = getHashPage();
    if (id) showPage(id, { scroll: true });
  });
  window.addEventListener("popstate", () => {
    const id = getHashPage();
    if (id) showPage(id, { scroll: true });
    else showPage("overview", { scroll: true });
  });

  const initial = getHashPage();
  showPage(initial || "overview", { scroll: Boolean(initial) });
  window.routebookNavigate = (id) => goTo(id);
})();
