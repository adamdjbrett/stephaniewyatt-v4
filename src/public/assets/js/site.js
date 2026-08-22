(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector("[data-theme-toggle]");
  const storedTheme = localStorage.getItem("theme");

  if (storedTheme === "light" || storedTheme === "dark") root.dataset.theme = storedTheme;

  themeButton?.addEventListener("click", () => {
    const systemDark = matchMedia("(prefers-color-scheme: dark)").matches;
    const current = root.dataset.theme || (systemDark ? "dark" : "light");
    root.dataset.theme = current === "dark" ? "light" : "dark";
    localStorage.setItem("theme", root.dataset.theme);
  });

  const dialog = document.querySelector("[data-search-dialog]");
  const input = dialog?.querySelector("input[type='search']");
  const status = dialog?.querySelector("[data-search-status]");
  const results = dialog?.querySelector("[data-search-results]");
  let pagefind;
  let searchTimer;

  const openSearch = () => {
    if (!dialog) return;
    dialog.showModal();
    requestAnimationFrame(() => input?.focus());
  };

  document.querySelector("[data-search-open]")?.addEventListener("click", openSearch);
  dialog?.querySelector("[data-search-close]")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openSearch();
    }
  });

  const escapeHtml = (value) => {
    const node = document.createElement("span");
    node.textContent = value;
    return node.innerHTML;
  };

  input?.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const query = input.value.trim();
    if (query.length < 2) {
      results.replaceChildren();
      status.textContent = "Type at least two characters.";
      return;
    }

    searchTimer = setTimeout(async () => {
      status.textContent = "Searching…";
      pagefind ||= await import("/pagefind/pagefind.js");
      const response = await pagefind.search(query);
      const entries = await Promise.all(response.results.slice(0, 8).map((result) => result.data()));
      results.innerHTML = entries.map((entry) => `<li><a href="${encodeURI(entry.url)}">${escapeHtml(entry.meta.title || entry.url)}</a><p>${entry.excerpt}</p></li>`).join("");
      status.textContent = `${response.results.length} result${response.results.length === 1 ? "" : "s"}.`;
    }, 140);
  });
})();
