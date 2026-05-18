/* ============================================================
   AGENDA CHIARA — shared calendar
   Vanilla JS. State persists in Firebase Realtime Database.
   ============================================================ */

firebase.initializeApp({
  apiKey: "AIzaSyCoscMg-1FjkucmBq2Xv2N_TvA1SVFEpjw",
  authDomain: "agenda-36cf4.firebaseapp.com",
  databaseURL: "https://agenda-36cf4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "agenda-36cf4",
  storageBucket: "agenda-36cf4.firebasestorage.app",
  messagingSenderId: "215480654293",
  appId: "1:215480654293:web:fd4cb180b6616a3747455c"
});
const DB_REF = firebase.database().ref("agenda");

const NAV_KEY = "agenda-nav-v1";

const DEFAULT_COLORS = [
  "#f48fb1", "#f06292", "#ec407a", "#ba68c8",
  "#9575cd", "#7986cb", "#5b8ed8", "#4fc3f7",
  "#4dd0e1", "#4db6ac", "#81c784", "#aed581",
  "#ffd54f", "#ffb74d", "#ff8a65", "#a1887f",
  "#90a4ae", "#6b6b70"
];

const MONTHS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre"
];
const MONTHS_FR_SHORT = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
const DOW_FR = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const DOW_FR_SHORT = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const DOW_FR_MINI = ["L","M","M","J","V","S","D"];

/* ============================================================
   State
   ============================================================ */
function defaultState() {
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const mkDate = (offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return iso(d);
  };
  return {
    people: [
      { id: "p1", name: "Chiara", color: "#f48fb1", hidden: false },
      { id: "p2", name: "Matéo",  color: "#5b8ed8", hidden: false }
    ],
    events: [
      { id: uid(), title: "Brunch ensemble",         date: mkDate(0), allDay: false, start: "11:00", end: "13:00", personId: "p1", note: "Apporter le pain." },
      { id: uid(), title: "Réunion équipe design",    date: mkDate(1), allDay: false, start: "10:00", end: "11:30", personId: "p1", note: "" },
      { id: uid(), title: "Footing",                  date: mkDate(2), allDay: false, start: "07:00", end: "08:00", personId: "p2", note: "" },
      { id: uid(), title: "Anniversaire de Matéo",   date: mkDate(5), allDay: true,  start: "",      end: "",      personId: "p2", note: "Gâteau au chocolat ✓" },
      { id: uid(), title: "Yoga",                      date: mkDate(-1), allDay: false, start: "07:30", end: "08:30", personId: "p1", note: "" },
      { id: uid(), title: "Courses marché",            date: mkDate(3), allDay: false, start: "09:00", end: "10:00", personId: "p1", note: "Tomates, basilic, mozzarella." },
      { id: uid(), title: "Dîner avec Sofia",          date: mkDate(4), allDay: false, start: "20:00", end: "22:30", personId: "p1", note: "Réserver une table." },
      { id: uid(), title: "Match de foot",             date: mkDate(6), allDay: false, start: "15:00", end: "17:00", personId: "p2", note: "" }
    ],
    cursor: iso(today),     // anchor date
    selected: iso(today),
    view: "month"           // 'month' | 'week' | 'day'
  };
}

function loadNav() {
  try { return JSON.parse(localStorage.getItem(NAV_KEY) || "{}"); } catch(e) { return {}; }
}
function saveNav() {
  try { localStorage.setItem(NAV_KEY, JSON.stringify({ cursor: state.cursor, selected: state.selected, view: state.view })); } catch(e) {}
}
function saveState() {
  DB_REF.set({ people: state.people, events: state.events }).catch((err) => {
    console.error("Firebase write error:", err);
    showStatus("✗ Erreur sauvegarde : " + err.code, true);
  });
  saveNav();
}

function uid() { return Math.random().toString(36).slice(2, 10); }

const _nav = loadNav();
const _today = new Date().toISOString().slice(0, 10);
const state = {
  people: [],
  events: [],
  cursor:   _nav.cursor   || _today,
  selected: _nav.selected || _today,
  view:     _nav.view     || "month"
};

/* ============================================================
   Date helpers
   ============================================================ */
function parseISO(s) { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); }
function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
}
function isSameDay(a, b) { return toISO(a) === toISO(b); }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth()+n, 1); }
// Monday-first weekday index (0..6)
function dowMonFirst(d) { return (d.getDay() + 6) % 7; }

/* ============================================================
   Render: top bar (title changes with view)
   ============================================================ */
function renderTopbar() {
  const d = parseISO(state.cursor);
  const el = document.getElementById("title-month");
  if (state.view === "month") {
    el.innerHTML = `${MONTHS_FR[d.getMonth()]} <span class="year">${d.getFullYear()}</span>`;
  } else if (state.view === "week") {
    const start = startOfWeekMon(d);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    if (start.getMonth() === end.getMonth()) {
      el.innerHTML = `${start.getDate()}–${end.getDate()} ${MONTHS_FR[start.getMonth()]} <span class="year">${start.getFullYear()}</span>`;
    } else {
      el.innerHTML = `${start.getDate()} ${MONTHS_FR_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTHS_FR_SHORT[end.getMonth()]} <span class="year">${end.getFullYear()}</span>`;
    }
  } else {
    el.innerHTML = `${DOW_FR[dowMonFirst(d)]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} <span class="year">${d.getFullYear()}</span>`;
  }
  // update toggle
  document.querySelectorAll("#view-toggle button").forEach(b => {
    b.classList.toggle("active", b.dataset.view === state.view);
  });
}

function startOfWeekMon(d) {
  const x = new Date(d);
  x.setDate(x.getDate() - dowMonFirst(x));
  x.setHours(0,0,0,0);
  return x;
}

/* ============================================================
   Render: mini calendar (sidebar)
   ============================================================ */
function renderMiniCal() {
  const anchor = parseISO(state.cursor);
  const today = new Date();
  const selected = parseISO(state.selected);

  document.getElementById("mini-title").textContent =
    `${MONTHS_FR[anchor.getMonth()]} ${anchor.getFullYear()}`;

  const grid = document.getElementById("mini-grid");
  grid.innerHTML = "";

  // dow header
  DOW_FR_MINI.forEach((d, i) => {
    const el = document.createElement("div");
    el.className = "dow";
    el.textContent = d;
    grid.appendChild(el);
  });

  const first = startOfMonth(anchor);
  const startOffset = dowMonFirst(first);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startOffset);

  const eventDays = new Set(state.events.map(e => e.date));

  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const el = document.createElement("div");
    el.className = "day";
    if (d.getMonth() !== anchor.getMonth()) el.classList.add("other");
    if (isSameDay(d, today)) el.classList.add("today");
    if (isSameDay(d, selected) && !isSameDay(d, today)) el.classList.add("selected");
    if (eventDays.has(toISO(d))) el.classList.add("has-event");
    el.textContent = d.getDate();
    el.addEventListener("click", () => {
      state.selected = toISO(d);
      state.cursor = toISO(d);
      saveNav();
      renderAll();
    });
    grid.appendChild(el);
  }
}

/* ============================================================
   Render: people sidebar
   ============================================================ */
function renderPeople() {
  const list = document.getElementById("people-list");
  list.innerHTML = "";

  state.people.forEach(person => {
    const row = document.createElement("div");
    row.className = "person" + (person.hidden ? " muted" : "");

    // swatch
    const sw = document.createElement("div");
    sw.className = "swatch";
    sw.style.background = person.color;
    sw.title = "Changer la couleur";
    sw.addEventListener("click", (e) => { e.stopPropagation(); openColorPicker(person, sw); });

    // name (editable)
    const name = document.createElement("div");
    name.className = "person-name";
    name.contentEditable = "true";
    name.spellcheck = false;
    name.textContent = person.name;
    name.addEventListener("blur", () => {
      const v = name.textContent.trim() || "Sans nom";
      person.name = v;
      name.textContent = v;
      saveState();
      renderCalendar(); // chip labels
    });
    name.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); name.blur(); }
    });

    // event count
    const count = document.createElement("span");
    count.className = "count";
    const n = state.events.filter(e => e.personId === person.id).length;
    count.textContent = n;

    // toggle visibility on row click
    row.addEventListener("click", () => {
      person.hidden = !person.hidden;
      saveState();
      renderPeople();
      renderCalendar();
    });

    // delete
    const del = document.createElement("button");
    del.className = "del";
    del.title = "Supprimer";
    del.innerHTML = svgIcon("trash");
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      if (state.people.length <= 1) { alert("Garde au moins une personne."); return; }
      if (!confirm(`Supprimer "${person.name}" ? Ses événements seront réassignés.`)) return;
      // reassign events
      const fallback = state.people.find(p => p.id !== person.id);
      state.events.forEach(ev => { if (ev.personId === person.id) ev.personId = fallback.id; });
      state.people = state.people.filter(p => p.id !== person.id);
      saveState(); renderAll();
    });

    row.appendChild(sw);
    row.appendChild(name);
    row.appendChild(count);
    row.appendChild(del);
    list.appendChild(row);
  });

  // Add person button
  const add = document.createElement("button");
  add.className = "add-person";
  add.innerHTML = `<span class="plus">+</span><span>Ajouter une personne</span>`;
  add.addEventListener("click", () => {
    const usedColors = state.people.map(p => p.color);
    const color = DEFAULT_COLORS.find(c => !usedColors.includes(c)) || DEFAULT_COLORS[Math.floor(Math.random()*DEFAULT_COLORS.length)];
    const np = { id: uid(), name: "Nouveau", color, hidden: false };
    state.people.push(np);
    saveState();
    renderPeople();
    // focus name to edit
    setTimeout(() => {
      const rows = list.querySelectorAll(".person-name");
      const last = rows[rows.length - 1];
      if (last) {
        last.focus();
        const range = document.createRange();
        range.selectNodeContents(last);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, 20);
  });
  list.appendChild(add);
}

let openPopover = null;
function closePopover() { if (openPopover) { openPopover.remove(); openPopover = null; } }

function openColorPicker(person, anchorEl) {
  closePopover();
  const pop = document.createElement("div");
  pop.className = "color-pop";
  DEFAULT_COLORS.forEach(c => {
    const dot = document.createElement("div");
    dot.className = "c" + (c === person.color ? " active" : "");
    dot.style.background = c;
    dot.addEventListener("click", () => {
      person.color = c;
      saveState();
      closePopover();
      renderPeople();
      renderCalendar();
    });
    pop.appendChild(dot);
  });
  document.body.appendChild(pop);
  const r = anchorEl.getBoundingClientRect();
  pop.style.left = (r.right + 8) + "px";
  pop.style.top  = (r.top - 4) + "px";
  openPopover = pop;
  setTimeout(() => {
    const closer = (e) => {
      if (!pop.contains(e.target)) { closePopover(); document.removeEventListener("mousedown", closer); }
    };
    document.addEventListener("mousedown", closer);
  }, 0);
}

/* ============================================================
   Render: main month grid
   ============================================================ */
function renderCalendar() {
  const anchor = parseISO(state.cursor);
  const today = new Date();
  const grid = document.getElementById("month-grid");
  const dowRow = document.getElementById("dow-row");
  grid.innerHTML = "";
  dowRow.innerHTML = "";

  DOW_FR.forEach((d, i) => {
    const c = document.createElement("div");
    c.className = "dow-cell" + (i >= 5 ? " weekend" : "");
    c.textContent = d;
    dowRow.appendChild(c);
  });

  const first = startOfMonth(anchor);
  const startOffset = dowMonFirst(first);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startOffset);

  // Compute number of rows needed (5 or 6)
  const lastDay = new Date(anchor.getFullYear(), anchor.getMonth()+1, 0);
  const totalCells = startOffset + lastDay.getDate();
  const rows = Math.ceil(totalCells / 7);
  grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

  const peopleMap = new Map(state.people.map(p => [p.id, p]));
  const visiblePerson = (pid) => {
    const p = peopleMap.get(pid);
    return p && !p.hidden;
  };

  // Group events by date
  const byDate = new Map();
  state.events.forEach(ev => {
    if (!byDate.has(ev.date)) byDate.set(ev.date, []);
    byDate.get(ev.date).push(ev);
  });

  for (let i = 0; i < rows * 7; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const iso = toISO(d);

    const cell = document.createElement("div");
    cell.className = "day-cell";
    cell.dataset.date = iso;
    const dow = dowMonFirst(d);
    if (dow >= 5) cell.classList.add("weekend");
    if (d.getMonth() !== anchor.getMonth()) cell.classList.add("other-month");
    if (isSameDay(d, today)) cell.classList.add("today");
    if (d.getDate() === 1) {
      cell.classList.add("first-of-month");
    }

    // top row: day num + add btn
    const top = document.createElement("div");
    top.className = "day-num-wrap";
    const num = document.createElement("span");
    num.className = "day-num";
    if (d.getDate() === 1) {
      num.textContent = `1 ${MONTHS_FR_SHORT[d.getMonth()]}`;
    } else {
      num.textContent = d.getDate();
    }
    const add = document.createElement("button");
    add.className = "add-here";
    add.innerHTML = "+";
    add.title = "Ajouter un événement";
    add.addEventListener("click", (e) => { e.stopPropagation(); openEventModal(null, iso); });

    top.appendChild(num);
    top.appendChild(add);
    cell.appendChild(top);

    // events
    const evList = document.createElement("div");
    evList.className = "events";
    const events = (byDate.get(iso) || [])
      .filter(ev => visiblePerson(ev.personId))
      .sort((a,b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return (a.start || "").localeCompare(b.start || "");
      });

    // We show up to N events depending on row count
    const maxShown = rows === 6 ? 2 : 3;
    const shown = events.slice(0, maxShown);
    shown.forEach(ev => evList.appendChild(buildEventEl(ev, peopleMap)));

    if (events.length > maxShown) {
      const more = document.createElement("div");
      more.className = "more-link";
      more.textContent = `+ ${events.length - maxShown} de plus`;
      more.addEventListener("click", (e) => {
        e.stopPropagation();
        openDayPopover(iso, cell);
      });
      evList.appendChild(more);
    }
    cell.appendChild(evList);

    // cell click → show day popover with events
    cell.addEventListener("click", (e) => {
      if (e.target.closest(".event") || e.target.closest(".more-link") || e.target.closest(".add-here")) return;
      state.selected = iso;
      renderMiniCal();
      openDayPopover(iso, cell);
    });

    // drag/drop targets
    cell.addEventListener("dragover", (e) => {
      e.preventDefault();
      cell.classList.add("drop-target");
    });
    cell.addEventListener("dragleave", () => cell.classList.remove("drop-target"));
    cell.addEventListener("drop", (e) => {
      e.preventDefault();
      cell.classList.remove("drop-target");
      const id = e.dataTransfer.getData("text/event-id");
      if (!id) return;
      const ev = state.events.find(x => x.id === id);
      if (!ev) return;
      ev.date = iso;
      saveState();
      renderAll();
    });

    grid.appendChild(cell);
  }
}

function buildEventEl(ev, peopleMap) {
  const person = peopleMap.get(ev.personId);
  const color = person ? person.color : "#888";
  const el = document.createElement("div");
  el.className = "event" + (ev.allDay ? " all-day" : "");
  el.style.setProperty("--evt", color);
  el.draggable = true;
  el.title = (person ? person.name + " — " : "") + ev.title + (ev.note ? `\n${ev.note}` : "");

  if (!ev.allDay && ev.start) {
    const time = document.createElement("span");
    time.className = "evt-time";
    time.textContent = ev.start;
    el.appendChild(time);
  }
  const title = document.createElement("span");
  title.className = "evt-title";
  title.textContent = ev.title;
  el.appendChild(title);

  el.addEventListener("click", (e) => {
    e.stopPropagation();
    openEventModal(ev);
  });
  el.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/event-id", ev.id);
    e.dataTransfer.effectAllowed = "move";
    el.classList.add("dragging");
  });
  el.addEventListener("dragend", () => el.classList.remove("dragging"));
  return el;
}

/* ============================================================
   Render: Week view
   ============================================================ */
const WEEK_START_HOUR = 6;
const WEEK_END_HOUR   = 23; // exclusive (so rows = 17, 6..22)
const PX_PER_HOUR     = 52;

function renderWeek() {
  const anchor = parseISO(state.cursor);
  const start = startOfWeekMon(anchor);
  const today = new Date();

  const head = document.getElementById("week-head");
  const allDayRow = document.getElementById("week-allday");
  const body = document.getElementById("week-body");
  head.innerHTML = ""; allDayRow.innerHTML = ""; body.innerHTML = "";

  // ----- HEAD: time gutter + 7 day headers
  head.appendChild(spacerEl("time-gutter-head"));
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const cell = document.createElement("div");
    cell.className = "wk-day-head" + (isSameDay(d, today) ? " today" : "") + (dowMonFirst(d) >= 5 ? " weekend" : "");
    cell.innerHTML = `<div class="wk-dow">${DOW_FR_SHORT[dowMonFirst(d)]}</div><div class="wk-num">${d.getDate()}</div>`;
    cell.addEventListener("click", () => {
      state.cursor = toISO(d); state.selected = toISO(d); state.view = "day"; saveState(); renderAll();
    });
    head.appendChild(cell);
  }

  // ----- ALL-DAY ROW
  const adGutter = document.createElement("div");
  adGutter.className = "time-gutter-allday";
  adGutter.textContent = "jour entier";
  allDayRow.appendChild(adGutter);
  const peopleMap = new Map(state.people.map(p => [p.id, p]));
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const iso = toISO(d);
    const col = document.createElement("div");
    col.className = "wk-allday-col" + (dowMonFirst(d) >= 5 ? " weekend" : "");
    col.dataset.date = iso;
    const ev = state.events.filter(e => e.date === iso && e.allDay && !peopleMap.get(e.personId)?.hidden);
    ev.forEach(e => col.appendChild(buildEventEl(e, peopleMap)));
    attachDayDrop(col, iso);
    col.addEventListener("click", (e) => {
      if (e.target.closest(".event")) return;
      openEventModal(null, iso);
    });
    allDayRow.appendChild(col);
  }

  // ----- BODY: time gutter + 7 day cols with absolute-positioned events
  const gutter = document.createElement("div");
  gutter.className = "time-gutter";
  for (let h = WEEK_START_HOUR; h < WEEK_END_HOUR; h++) {
    const row = document.createElement("div");
    row.className = "hour-label";
    row.style.height = PX_PER_HOUR + "px";
    row.textContent = String(h).padStart(2, "0") + ":00";
    gutter.appendChild(row);
  }
  body.appendChild(gutter);

  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const iso = toISO(d);
    const col = document.createElement("div");
    col.className = "wk-day-col" + (dowMonFirst(d) >= 5 ? " weekend" : "") + (isSameDay(d, today) ? " today" : "");
    col.dataset.date = iso;
    col.style.height = ((WEEK_END_HOUR - WEEK_START_HOUR) * PX_PER_HOUR) + "px";

    // hour grid lines
    for (let h = WEEK_START_HOUR; h < WEEK_END_HOUR; h++) {
      const slot = document.createElement("div");
      slot.className = "hour-slot";
      slot.style.top = ((h - WEEK_START_HOUR) * PX_PER_HOUR) + "px";
      slot.style.height = PX_PER_HOUR + "px";
      slot.dataset.hour = h;
      slot.addEventListener("click", (e) => {
        if (e.target.closest(".timed-event")) return;
        const start = String(h).padStart(2,"0") + ":00";
        const end   = String(Math.min(h+1, 23)).padStart(2,"0") + ":00";
        openEventModal(null, iso, { start, end, allDay: false });
      });
      col.appendChild(slot);
    }

    // current-time indicator
    if (isSameDay(d, today)) {
      const now = new Date();
      const mins = now.getHours()*60 + now.getMinutes();
      const offset = (mins - WEEK_START_HOUR*60) * (PX_PER_HOUR / 60);
      if (offset >= 0 && offset <= (WEEK_END_HOUR-WEEK_START_HOUR)*PX_PER_HOUR) {
        const line = document.createElement("div");
        line.className = "now-line";
        line.style.top = offset + "px";
        col.appendChild(line);
      }
    }

    // events
    const events = state.events
      .filter(e => e.date === iso && !e.allDay && !peopleMap.get(e.personId)?.hidden)
      .sort((a,b) => (a.start || "").localeCompare(b.start || ""));
    layoutTimedEvents(events, peopleMap).forEach(({ev, top, height, left, width}) => {
      const el = buildTimedEventEl(ev, peopleMap);
      el.style.top = top + "px";
      el.style.height = Math.max(20, height) + "px";
      el.style.left = `calc(${left*100}% + 2px)`;
      el.style.width = `calc(${width*100}% - 4px)`;
      col.appendChild(el);
    });

    attachDayDrop(col, iso);
    body.appendChild(col);
  }

  // Scroll to ~7am on first render of week
  setTimeout(() => {
    const h = today.getHours();
    body.scrollTop = Math.max(0, ((isSameDay(parseISO(state.cursor), today) ? h : 7) - WEEK_START_HOUR - 1) * PX_PER_HOUR);
  }, 0);
}

function spacerEl(cls) { const s = document.createElement("div"); s.className = cls; return s; }

/* Convert "HH:MM" to minutes from midnight */
function timeToMin(t) {
  if (!t) return 0;
  const [h,m] = t.split(":").map(Number);
  return (h||0)*60 + (m||0);
}
/* Simple overlap layout: groups overlapping events and splits horizontal width */
function layoutTimedEvents(events, peopleMap) {
  const items = events.map(ev => ({
    ev,
    startMin: timeToMin(ev.start || "09:00"),
    endMin: Math.max(timeToMin(ev.end || ev.start || "10:00"), timeToMin(ev.start || "09:00") + 30)
  })).sort((a,b) => a.startMin - b.startMin);

  // Group overlapping
  const groups = [];
  items.forEach(it => {
    const last = groups[groups.length - 1];
    if (last && it.startMin < Math.max(...last.map(x => x.endMin))) last.push(it);
    else groups.push([it]);
  });
  const out = [];
  groups.forEach(grp => {
    // Assign columns within the group
    const cols = [];
    grp.forEach(it => {
      let placed = false;
      for (let i = 0; i < cols.length; i++) {
        if (cols[i].endMin <= it.startMin) { cols[i] = it; it.col = i; placed = true; break; }
      }
      if (!placed) { it.col = cols.length; cols.push(it); }
    });
    const total = cols.length;
    grp.forEach(it => {
      const top = (it.startMin - WEEK_START_HOUR*60) * (PX_PER_HOUR / 60);
      const height = (it.endMin - it.startMin) * (PX_PER_HOUR / 60);
      out.push({ ev: it.ev, top, height, left: it.col / total, width: 1 / total });
    });
  });
  return out;
}

function buildTimedEventEl(ev, peopleMap) {
  const person = peopleMap.get(ev.personId);
  const color = person ? person.color : "#888";
  const el = document.createElement("div");
  el.className = "timed-event";
  el.style.setProperty("--evt", color);
  el.draggable = true;
  el.title = (person ? person.name + " — " : "") + ev.title + (ev.note ? `\n${ev.note}` : "");
  el.innerHTML = `
    <div class="te-time">${ev.start || ""}${ev.end ? " – " + ev.end : ""}</div>
    <div class="te-title">${escapeHTML(ev.title)}</div>
    ${person ? `<div class="te-person">${escapeHTML(person.name)}</div>` : ""}
  `;
  el.addEventListener("click", (e) => { e.stopPropagation(); openEventModal(ev); });
  el.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/event-id", ev.id);
    e.dataTransfer.effectAllowed = "move";
    el.classList.add("dragging");
  });
  el.addEventListener("dragend", () => el.classList.remove("dragging"));
  return el;
}

function attachDayDrop(el, iso) {
  el.addEventListener("dragover", (e) => { e.preventDefault(); el.classList.add("drop-target"); });
  el.addEventListener("dragleave", () => el.classList.remove("drop-target"));
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    el.classList.remove("drop-target");
    const id = e.dataTransfer.getData("text/event-id");
    if (!id) return;
    const ev = state.events.find(x => x.id === id);
    if (!ev) return;
    ev.date = iso;
    saveState(); renderAll();
  });
}

/* ============================================================
   Render: Day view
   ============================================================ */
function renderDay() {
  const d = parseISO(state.cursor);
  const today = new Date();
  const head = document.getElementById("day-head");
  const allDayRow = document.getElementById("day-allday");
  const body = document.getElementById("day-body");
  head.innerHTML = ""; allDayRow.innerHTML = ""; body.innerHTML = "";

  const peopleMap = new Map(state.people.map(p => [p.id, p]));
  const iso = toISO(d);

  // Head
  const isToday = isSameDay(d, today);
  head.innerHTML = `
    <div class="time-gutter-head"></div>
    <div class="day-head-cell ${isToday ? "today" : ""}">
      <div class="dh-dow">${DOW_FR[dowMonFirst(d)]}</div>
      <div class="dh-num">${d.getDate()} <span class="dh-month">${MONTHS_FR[d.getMonth()]}</span></div>
    </div>
  `;

  // All-day row
  const adGutter = document.createElement("div");
  adGutter.className = "time-gutter-allday";
  adGutter.textContent = "jour entier";
  allDayRow.appendChild(adGutter);
  const adCol = document.createElement("div");
  adCol.className = "day-allday-col";
  adCol.dataset.date = iso;
  const allDay = state.events.filter(e => e.date === iso && e.allDay && !peopleMap.get(e.personId)?.hidden);
  allDay.forEach(e => adCol.appendChild(buildEventEl(e, peopleMap)));
  attachDayDrop(adCol, iso);
  adCol.addEventListener("click", (e) => { if (e.target.closest(".event")) return; openEventModal(null, iso, { allDay: true }); });
  allDayRow.appendChild(adCol);

  // Body
  const gutter = document.createElement("div");
  gutter.className = "time-gutter";
  for (let h = WEEK_START_HOUR; h < WEEK_END_HOUR; h++) {
    const row = document.createElement("div");
    row.className = "hour-label";
    row.style.height = PX_PER_HOUR + "px";
    row.textContent = String(h).padStart(2,"0") + ":00";
    gutter.appendChild(row);
  }
  body.appendChild(gutter);

  const col = document.createElement("div");
  col.className = "day-body-col" + (isToday ? " today" : "");
  col.style.height = ((WEEK_END_HOUR - WEEK_START_HOUR) * PX_PER_HOUR) + "px";
  col.dataset.date = iso;
  for (let h = WEEK_START_HOUR; h < WEEK_END_HOUR; h++) {
    const slot = document.createElement("div");
    slot.className = "hour-slot";
    slot.style.top = ((h - WEEK_START_HOUR) * PX_PER_HOUR) + "px";
    slot.style.height = PX_PER_HOUR + "px";
    slot.addEventListener("click", (e) => {
      if (e.target.closest(".timed-event")) return;
      const start = String(h).padStart(2,"0") + ":00";
      const end   = String(Math.min(h+1, 23)).padStart(2,"0") + ":00";
      openEventModal(null, iso, { start, end, allDay: false });
    });
    col.appendChild(slot);
  }

  if (isToday) {
    const now = new Date();
    const mins = now.getHours()*60 + now.getMinutes();
    const offset = (mins - WEEK_START_HOUR*60) * (PX_PER_HOUR / 60);
    if (offset >= 0 && offset <= (WEEK_END_HOUR-WEEK_START_HOUR)*PX_PER_HOUR) {
      const line = document.createElement("div");
      line.className = "now-line";
      line.style.top = offset + "px";
      col.appendChild(line);
    }
  }

  const events = state.events
    .filter(e => e.date === iso && !e.allDay && !peopleMap.get(e.personId)?.hidden)
    .sort((a,b) => (a.start || "").localeCompare(b.start || ""));
  layoutTimedEvents(events, peopleMap).forEach(({ev, top, height, left, width}) => {
    const el = buildTimedEventEl(ev, peopleMap);
    el.style.top = top + "px";
    el.style.height = Math.max(24, height) + "px";
    el.style.left = `calc(${left*100}% + 4px)`;
    el.style.width = `calc(${width*100}% - 8px)`;
    col.appendChild(el);
  });
  attachDayDrop(col, iso);
  body.appendChild(col);

  setTimeout(() => {
    const h = today.getHours();
    body.scrollTop = Math.max(0, ((isToday ? h : 8) - WEEK_START_HOUR - 1) * PX_PER_HOUR);
  }, 0);
}

/* Day popover (when there's overflow) */
function openDayPopover(iso, anchorCell) {
  closePopover();
  const pop = document.createElement("div");
  pop.className = "day-popover";
  const d = parseISO(iso);
  const peopleMap = new Map(state.people.map(p => [p.id, p]));

  pop.innerHTML = `
    <div class="pop-head">
      <div>
        <div class="pop-date">${DOW_FR[dowMonFirst(d)]} · ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}</div>
        <div class="pop-day">${d.getDate()}</div>
      </div>
      <button class="close icon" title="Fermer" style="width:24px;height:24px;border-radius:50%;color:var(--ink-soft);">${svgIcon("x")}</button>
    </div>
    <div class="pop-events"></div>
    <button class="add-person" style="margin-top:8px;"><span class="plus">+</span><span>Ajouter un événement</span></button>
  `;
  const evContainer = pop.querySelector(".pop-events");
  const events = state.events.filter(e => e.date === iso && !peopleMap.get(e.personId)?.hidden)
    .sort((a,b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return (a.start || "").localeCompare(b.start || "");
    });

  if (events.length === 0) {
    evContainer.innerHTML = `<div class="pop-empty">Rien de prévu.</div>`;
  } else {
    events.forEach(ev => evContainer.appendChild(buildEventEl(ev, peopleMap)));
  }

  pop.querySelector(".close").addEventListener("click", closePopover);
  pop.querySelector(".add-person").addEventListener("click", () => {
    closePopover();
    openEventModal(null, iso);
  });

  document.body.appendChild(pop);
  // Position near cell
  const r = anchorCell.getBoundingClientRect();
  const popW = 280;
  let left = r.left;
  if (left + popW > window.innerWidth - 12) left = window.innerWidth - popW - 12;
  let top = r.top;
  const popH = Math.min(420, evContainer.scrollHeight + 100);
  if (top + popH > window.innerHeight - 12) top = window.innerHeight - popH - 12;
  pop.style.left = Math.max(12, left) + "px";
  pop.style.top  = Math.max(12, top) + "px";
  openPopover = pop;

  setTimeout(() => {
    const closer = (e) => {
      if (!pop.contains(e.target)) { closePopover(); document.removeEventListener("mousedown", closer); }
    };
    document.addEventListener("mousedown", closer);
  }, 0);
}

/* ============================================================
   Event modal
   ============================================================ */
let modalCtx = null;
function openEventModal(eventOrNull, dateISO, overrides) {
  closePopover();
  const isNew = !eventOrNull;
  const ev = eventOrNull ? { ...eventOrNull } : {
    id: uid(),
    title: "",
    date: dateISO || state.selected,
    allDay: overrides?.allDay ?? false,
    start: overrides?.start ?? "09:00",
    end:   overrides?.end ?? "10:00",
    personId: state.people[0].id,
    note: ""
  };
  modalCtx = { ev, isNew };

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal" role="dialog">
      <div class="modal-head">
        <h2>${isNew ? "Nouvel événement" : "Modifier l'événement"}</h2>
        <button class="close" id="m-close" title="Fermer">${svgIcon("x")}</button>
      </div>
      <div class="modal-body">
        <div class="field">
          <input type="text" class="title-input" id="m-title" placeholder="Titre…" value="${escapeAttr(ev.title)}" autocomplete="off" />
        </div>

        <div class="field">
          <label>Date</label>
          <div class="row">
            <input type="date" id="m-date" value="${ev.date}" />
            <label class="toggle-row" style="justify-content:flex-start; padding-left:4px;">
              <input type="checkbox" id="m-allday" ${ev.allDay ? "checked" : ""} /> Toute la journée
            </label>
          </div>
        </div>

        <div class="field" id="m-time-field" style="${ev.allDay ? "display:none;" : ""}">
          <label>Heure</label>
          <div class="row">
            <input type="time" id="m-start" value="${ev.start || "09:00"}" />
            <input type="time" id="m-end" value="${ev.end || "10:00"}" />
          </div>
        </div>

        <div class="field">
          <label>Personne</label>
          <div class="people-picker" id="m-people"></div>
        </div>

        <div class="field">
          <label>Note</label>
          <textarea id="m-note" placeholder="Ajouter une note…">${escapeHTML(ev.note || "")}</textarea>
        </div>
      </div>
      <div class="modal-foot">
        <div class="left">
          ${isNew ? "" : `<button class="btn danger" id="m-delete">Supprimer</button>`}
        </div>
        <div class="right">
          <button class="btn ghost" id="m-cancel">Annuler</button>
          <button class="btn primary" id="m-save">${isNew ? "Créer" : "Enregistrer"}</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  // People chips
  const picker = backdrop.querySelector("#m-people");
  state.people.forEach(p => {
    const chip = document.createElement("button");
    chip.className = "chip" + (p.id === ev.personId ? " active" : "");
    chip.style.setProperty("--c", p.color);
    chip.innerHTML = `<span class="chip-dot"></span><span>${escapeHTML(p.name)}</span>`;
    chip.addEventListener("click", () => {
      ev.personId = p.id;
      picker.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
    });
    picker.appendChild(chip);
  });

  // All-day toggle
  backdrop.querySelector("#m-allday").addEventListener("change", (e) => {
    backdrop.querySelector("#m-time-field").style.display = e.target.checked ? "none" : "";
  });

  // Focus title
  setTimeout(() => backdrop.querySelector("#m-title").focus(), 30);

  // Close handlers
  const close = () => backdrop.remove();
  backdrop.querySelector("#m-close").addEventListener("click", close);
  backdrop.querySelector("#m-cancel").addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  const onEsc = (e) => { if (e.key === "Escape") { close(); document.removeEventListener("keydown", onEsc); } };
  document.addEventListener("keydown", onEsc);

  // Save
  const save = () => {
    const title = backdrop.querySelector("#m-title").value.trim();
    if (!title) { backdrop.querySelector("#m-title").focus(); return; }
    ev.title = title;
    ev.date = backdrop.querySelector("#m-date").value || ev.date;
    ev.allDay = backdrop.querySelector("#m-allday").checked;
    ev.start = backdrop.querySelector("#m-start").value;
    ev.end = backdrop.querySelector("#m-end").value;
    ev.note = backdrop.querySelector("#m-note").value;

    if (isNew) state.events.push(ev);
    else {
      const idx = state.events.findIndex(x => x.id === ev.id);
      if (idx >= 0) state.events[idx] = ev;
    }
    saveState();
    close();
    renderAll();
  };
  backdrop.querySelector("#m-save").addEventListener("click", save);
  // Enter key on title submits
  backdrop.querySelector("#m-title").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); save(); }
  });

  // Delete
  if (!isNew) {
    backdrop.querySelector("#m-delete").addEventListener("click", () => {
      if (!confirm(`Supprimer "${ev.title}" ?`)) return;
      state.events = state.events.filter(x => x.id !== ev.id);
      saveState();
      close();
      renderAll();
    });
  }
}

/* ============================================================
   SVG icons
   ============================================================ */
function svgIcon(name) {
  switch (name) {
    case "chev-left":  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
    case "chev-right": return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
    case "plus":       return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    case "x":          return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`;
    case "trash":      return `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`;
  }
  return "";
}

function escapeAttr(s) { return String(s ?? "").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
function escapeHTML(s) { return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

/* ============================================================
   Wire up topbar + keyboard
   ============================================================ */
function shiftCursor(dir) {
  const d = parseISO(state.cursor);
  if (state.view === "month") state.cursor = toISO(addMonths(d, dir));
  else if (state.view === "week") { const x = new Date(d); x.setDate(x.getDate() + dir*7); state.cursor = toISO(x); }
  else { const x = new Date(d); x.setDate(x.getDate() + dir); state.cursor = toISO(x); state.selected = state.cursor; }
  saveState(); renderAll();
}
function bindTopbar() {
  document.getElementById("nav-prev").addEventListener("click", () => shiftCursor(-1));
  document.getElementById("nav-next").addEventListener("click", () => shiftCursor(1));
  // View toggle
  document.querySelectorAll("#view-toggle button").forEach(b => {
    b.addEventListener("click", () => {
      state.view = b.dataset.view;
      saveState(); renderAll();
    });
  });
  // Mobile sidebar
  const sidebar = document.querySelector(".sidebar");
  const scrim = document.getElementById("sidebar-scrim");
  document.getElementById("menu-btn").addEventListener("click", () => {
    document.body.classList.toggle("sidebar-open");
  });
  scrim.addEventListener("click", () => document.body.classList.remove("sidebar-open"));
  document.getElementById("nav-today").addEventListener("click", () => {
    const t = new Date();
    state.cursor = toISO(t); state.selected = toISO(t);
    saveState(); renderAll();
  });
  document.getElementById("mini-prev").addEventListener("click", () => {
    state.cursor = toISO(addMonths(parseISO(state.cursor), -1));
    saveState(); renderAll();
  });
  document.getElementById("mini-next").addEventListener("click", () => {
    state.cursor = toISO(addMonths(parseISO(state.cursor),  1));
    saveState(); renderAll();
  });
  document.getElementById("new-event").addEventListener("click", () => openEventModal(null, state.selected));

  // Mobile view strip
  const mobileStrip = document.getElementById("mobile-view-strip");
  if (mobileStrip) {
    mobileStrip.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        state.view = btn.dataset.view;
        saveNav(); renderAll();
      });
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea, [contenteditable]")) return;
    if (e.key === "ArrowLeft") shiftCursor(-1);
    else if (e.key === "ArrowRight") shiftCursor(1);
    else if (e.key === "t" || e.key === "T") {
      const t = new Date();
      state.cursor = toISO(t); state.selected = toISO(t);
      saveState(); renderAll();
    } else if (e.key === "n" || e.key === "N") {
      e.preventDefault();
      openEventModal(null, state.selected);
    } else if (e.key === "1") { state.view = "month"; saveState(); renderAll(); }
    else if (e.key === "2") { state.view = "week";  saveState(); renderAll(); }
    else if (e.key === "3") { state.view = "day";   saveState(); renderAll(); }
  });
}

function renderMobileNav() {
  const strip = document.getElementById("mobile-view-strip");
  if (!strip) return;
  strip.querySelectorAll("button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === state.view);
  });
}

function renderAll() {
  renderTopbar();
  renderMiniCal();
  renderMobileNav();
  renderPeople();
  // show right view
  document.getElementById("view-month").style.display = state.view === "month" ? "" : "none";
  document.getElementById("view-week").style.display  = state.view === "week"  ? "" : "none";
  document.getElementById("view-day").style.display   = state.view === "day"   ? "" : "none";
  if (state.view === "month") renderCalendar();
  else if (state.view === "week") renderWeek();
  else renderDay();
}

function showStatus(msg, isError) {
  let el = document.getElementById("fb-status");
  if (!el) {
    el = document.createElement("div");
    el.id = "fb-status";
    el.style.cssText = "position:fixed;bottom:12px;left:50%;transform:translateX(-50%);padding:7px 16px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;transition:opacity 1s;";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.background = isError ? "#ef5350" : "#43a047";
  el.style.color = "#fff";
  el.style.opacity = "1";
  clearTimeout(el._t);
  if (!isError) el._t = setTimeout(() => { el.style.opacity = "0"; }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  bindTopbar();

  // Données par défaut visibles pendant le chargement Firebase
  const def = defaultState();
  state.people = def.people;
  state.events  = def.events;
  renderAll();

  let firstLoad = true;

  DB_REF.on("value", (snapshot) => {
    const data = snapshot.val();
    const toArr = (v) => v ? (Array.isArray(v) ? v : Object.values(v)) : [];
    if (data && (data.people || data.events)) {
      state.people = toArr(data.people);
      state.events  = toArr(data.events);
      if (firstLoad) { showStatus("✓ Synchronisé", false); firstLoad = false; }
    } else {
      // Première utilisation : écrire les données par défaut
      saveState();
    }
    renderAll();
  }, (error) => {
    console.error("Firebase error:", error);
    showStatus("✗ Erreur Firebase : " + error.code, true);
  });
});
