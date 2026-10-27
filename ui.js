// Shared bits for the app preview: dropdowns, collections and the library filter.
// Collections live in this browser only (a preview, there is no real account behind it).
(() => {
  const KEY = "lum-collections";
  const state = { names: ["Science", "Work", "Health", "Tech"], items: {} };
  try { Object.assign(state, JSON.parse(localStorage.getItem(KEY)) || {}); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
  // topic sorting is on unless turned off in Settings; a collection you pick yourself always wins
  const PKEY = "lum-settings";
  const prefs = { autoSort: true };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(PKEY)) || {}); } catch {}
  const savePrefs = () => { try { localStorage.setItem(PKEY, JSON.stringify(prefs)); } catch {} };
  const picked = (card) => card.dataset.id in state.items;
  const collOf = (card) => (picked(card) ? state.items[card.dataset.id] : prefs.autoSort ? card.dataset.coll || "" : "");
  const isAuto = (card) => !picked(card) && prefs.autoSort && !!card.dataset.coll;
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ---------- toast ----------
  const toast = document.createElement("div");
  toast.className = "toast"; toast.setAttribute("role", "status");
  document.body.append(toast);
  let toastT;
  const say = (msg) => { toast.textContent = msg; toast.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove("on"), 1800); };

  // ---------- dropdowns ----------
  const closeAll = (except) => document.querySelectorAll(".dd.open").forEach((d) => d !== except && d.classList.remove("open"));
  const item = (v, label, on, extra = "") => `<button type="button" role="menuitemradio" aria-checked="${on}" data-v="${esc(v)}"${extra}>${esc(label)}</button>`;

  // menus that list the collections are drawn from the saved list every time they open
  const drawMenu = (dd) => {
    const src = dd.dataset.src;
    if (!src) return;
    const menu = dd.querySelector(".dd-menu");
    const cur = src === "coll-item" ? collOf(document.querySelector(`[data-id="${dd.dataset.id}"]`) || dd) : dd.dataset.value || "";
    let h = "";
    if (src === "coll-item") {
      const card = document.querySelector(`[data-id="${dd.dataset.id}"]`) || dd;
      h += `<p class="dd-head">${isAuto(card) ? "Sorted by topic. Pick another to move it." : "Add to collection"}</p>`;
    }
    if (src === "coll-pick" && prefs.autoSort) h += item("auto", "Auto, by topic", cur === "auto");
    if (src === "coll-filter") h += item("", "All", cur === "");
    if (src === "coll-pick") h += item("", "No collection", cur === "");
    h += state.names.map((n) => item(n, n, cur === n)).join("");
    if (src === "coll-item" && cur) h += `<hr>` + item("", "Remove from collection", false, ' class="dim"');
    h += `<hr><button type="button" class="new" data-new>+ New collection</button>`;
    menu.innerHTML = h;
  };

  const setLabel = (dd, v, label) => {
    dd.dataset.value = v;
    const b = dd.querySelector(".dd-btn b");
    if (b) b.textContent = label;
  };

  const choose = (dd, v, label) => {
    if (dd.dataset.src === "coll-item") {
      const id = dd.dataset.id;
      state.items[id] = v; save();
      document.querySelectorAll(`[data-id="${id}"]`).forEach(paintCard);
      document.querySelectorAll(`.dd[data-src="coll-item"][data-id="${id}"]`).forEach((d) => setLabel(d, v, v || "Add to collection"));
      say(v ? `Saved to ${v}` : "Removed from collection");
    } else {
      setLabel(dd, v, label);
    }
    dd.dispatchEvent(new CustomEvent("pick", { detail: v, bubbles: true }));
    dd.classList.remove("open");
  };

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".dd-btn");
    if (btn) {
      e.preventDefault(); e.stopPropagation();
      const dd = btn.closest(".dd");
      drawMenu(dd);
      closeAll(dd);
      dd.classList.toggle("open");
      return;
    }
    const opt = e.target.closest(".dd-menu [data-v]");
    if (opt) {
      e.preventDefault(); e.stopPropagation();
      choose(opt.closest(".dd"), opt.dataset.v, opt.textContent);
      return;
    }
    const nw = e.target.closest(".dd-menu [data-new]");
    if (nw) {
      e.preventDefault(); e.stopPropagation();
      const f = document.createElement("form");
      f.className = "dd-new";
      f.innerHTML = `<input type="text" placeholder="Collection name" maxlength="30" aria-label="New collection name"><button type="submit">Add</button>`;
      nw.replaceWith(f);
      f.querySelector("input").focus();
      return;
    }
    if (!e.target.closest(".dd-menu")) closeAll();
  });

  document.addEventListener("submit", (e) => {
    const f = e.target.closest(".dd-new");
    if (!f) return;
    e.preventDefault();
    const name = f.querySelector("input").value.trim();
    if (!name) return;
    if (!state.names.includes(name)) { state.names.push(name); save(); }
    choose(f.closest(".dd"), name, name);
  });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });

  // ---------- cards show their collection ----------
  function paintCard(card) {
    const tags = card.querySelector(".tags");
    if (!tags) return;
    let t = tags.querySelector(".c");
    const c = collOf(card);
    if (!c) { t?.remove(); return; }
    if (!t) { t = document.createElement("i"); t.className = "c"; tags.append(t); }
    t.textContent = c;
    t.classList.toggle("auto", isAuto(card));
    t.title = isAuto(card) ? "Sorted by topic automatically" : "";
  }
  document.querySelectorAll(".b-card[data-id]").forEach(paintCard);
  const pick = document.querySelector('.dd[data-src="coll-pick"]');
  if (pick && prefs.autoSort) setLabel(pick, "auto", "Auto");

  // settings: the topic sorting switch
  const sw = document.querySelector("#auto-sort");
  if (sw) {
    sw.checked = prefs.autoSort;
    sw.addEventListener("change", () => {
      prefs.autoSort = sw.checked; savePrefs();
      say(sw.checked ? "New summaries will be sorted by topic" : "Topic sorting is off");
    });
  }
  document.querySelectorAll(".auto-note").forEach((n) => { n.hidden = !prefs.autoSort; });

  document.querySelectorAll('.dd[data-src="coll-item"]').forEach((d) => {
    const c = collOf(document.querySelector(`[data-id="${d.dataset.id}"]`) || d);
    setLabel(d, c, c || "Add to collection");
  });

  // ---------- library filter: type buttons and the collection dropdown work together ----------
  const grid = document.querySelector(".grid-b[data-filter]");
  if (grid) {
    let kind = "All", coll = "";
    const empty = document.querySelector(".lib-empty");
    const apply = () => {
      let shown = 0;
      grid.querySelectorAll(".b-card").forEach((c) => {
        const ok = (kind === "All" || c.dataset.kind === kind) && (!coll || collOf(c) === coll);
        c.hidden = !ok; if (ok) shown++;
      });
      empty.hidden = shown > 0;
    };
    document.querySelectorAll(".toolbar .chip").forEach((b) => b.addEventListener("click", () => {
      document.querySelectorAll(".toolbar .chip").forEach((x) => x.classList.toggle("on", x === b));
      kind = b.textContent; apply();
    }));
    document.addEventListener("pick", (e) => {
      if (e.target.matches('.dd[data-src="coll-filter"]')) coll = e.detail;
      apply();
    });
  }
})();
