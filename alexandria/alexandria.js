/* Alexandria's Lost Geography: atlas, time slider and gazetteer.
   Site data lives in data/sites.geojson (it opens directly in QGIS).
   Historical maps are listed in maps/maps.json: each one is a scan warped to
   Web Mercator, so it can be laid over the modern map with its bounds. */

(function () {
  "use strict";

  var STATUS_LABEL = {
    standing: "Standing",
    altered: "Altered",
    threatened: "Threatened",
    lost: "Lost",
    removed: "Removed"
  };

  document.getElementById("year").textContent = new Date().getFullYear();

  var css = getComputedStyle(document.documentElement);
  function statusColour(s) { return css.getPropertyValue("--st-" + s).trim() || "#9a4a2f"; }

  // ---------- Map ----------
  // If Leaflet fails to load, the gazetteer still renders without the map.

  var hasMap = typeof L !== "undefined";
  if (!hasMap) {
    document.getElementById("map").innerHTML =
      '<p class="map-fallback">The map could not be loaded. The gazetteer below lists every site.</p>';
  }
  var map = hasMap && L.map("map", { scrollWheelZoom: false, zoomSnap: 0.5 }).setView([31.197, 29.902], 14);

  var base = hasMap && L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // ---------- Time slider ----------
  // Maps are stacked oldest to newest, with today's map as the final stop.
  // Between two stops the next map fades in over the current one, from
  // transparent to opaque, as the slider moves.

  var timeline = document.getElementById("timeline");
  var slider = document.getElementById("time");
  var stopsEl = document.getElementById("time-stops");
  var mapInfo = document.getElementById("map-info");
  var historic = [];   // { meta, layer }

  function setTime(v) {
    var n = historic.length;               // stops 0..n-1 are maps, stop n is today
    var i = Math.min(Math.floor(v), n), f = v - i;
    historic.forEach(function (h, k) {
      var o = 0;
      if (k === i) o = (i + 1 === n) ? 1 - f : 1;   // the last map fades out to reveal today
      else if (k === i + 1) o = f;                  // the next map fades in on top
      if (o > 0 && !map.hasLayer(h.layer)) h.layer.addTo(map);
      h.layer.setOpacity(o);
      h.layer.getElement() && (h.layer.getElement().style.zIndex = k);
    });
    var near = Math.round(v);
    stopsEl.querySelectorAll("button").forEach(function (b, k) {
      b.classList.toggle("is-on", k === near);
      b.setAttribute("aria-pressed", k === near ? "true" : "false");
    });
    slider.setAttribute("aria-valuetext", near < n ? historic[near].meta.year + ", " + historic[near].meta.title : "Today");
    showInfo(near);
  }

  function showInfo(k) {
    if (k >= historic.length) {
      mapInfo.innerHTML = "<strong>Today</strong> · OpenStreetMap. Move the slider back to lay the historical maps over the modern city.";
      return;
    }
    var m = historic[k].meta;
    mapInfo.innerHTML = "<strong>" + esc(m.year) + " · " + esc(m.title) + "</strong>" +
      (m.author ? ", " + esc(m.author) : "") + ". " + esc(m.note || "") +
      ' <span class="fit">Alignment: about ±' + esc(m.rms_m) + " m.</span>" +
      ' <a href="' + esc(m.source) + '" rel="noopener">Source</a> (' + esc(m.credit) + ", " + esc(m.licence) + ")";
  }

  var anim = null;
  function animateTo(target) {
    cancelAnimationFrame(anim);
    var from = parseFloat(slider.value), t0 = performance.now(), dur = 300 + 350 * Math.min(3, Math.abs(target - from));
    (function step(now) {
      var t = Math.min(1, (now - t0) / dur), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      slider.value = from + (target - from) * e; setTime(parseFloat(slider.value));
      if (t < 1) anim = requestAnimationFrame(step);
    })(t0);
  }

  function initTimeline(list) {
    if (!list.length) return;
    map.createPane("historic").style.zIndex = 350;   // above the tiles, below the site markers
    historic = list.map(function (m) {
      return { meta: m, layer: L.imageOverlay(m.image, m.bounds, { pane: "historic", opacity: 0, alt: m.title, interactive: false }) };
    });
    slider.max = historic.length;
    stopsEl.innerHTML = "";
    historic.map(function (h) { return h.meta.year; }).concat(["Today"]).forEach(function (label, k) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = label;
      b.style.left = (k / historic.length * 100) + "%";
      b.addEventListener("click", function () { animateTo(k); });
      stopsEl.appendChild(b);
    });
    slider.addEventListener("input", function () { cancelAnimationFrame(anim); setTime(parseFloat(slider.value)); });
    slider.addEventListener("change", function () {     // settle on the nearest stop when released
      var v = parseFloat(slider.value); if (Math.abs(v - Math.round(v)) < 0.08) animateTo(Math.round(v));
    });
    timeline.hidden = false;
    slider.value = 0; setTime(0);
  }

  if (hasMap) {
    fetch("maps/maps.json")
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(initTimeline)
      .catch(function () {});
  }

  // re-enable wheel zoom once the reader engages with the map
  if (hasMap) map.once("focus click", function () { map.scrollWheelZoom.enable(); });

  // ---------- Data ----------

  var listEl = document.getElementById("sites");
  var countEl = document.getElementById("count");
  var markers = {};
  var items = {};
  var features = [];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function popupHtml(p) {
    return "<h4>" + esc(p.name) + "</h4>" +
      (p.name_ar ? '<p class="ar" lang="ar" dir="rtl">' + esc(p.name_ar) + "</p>" : "") +
      "<p><i class=\"dot dot--" + esc(p.status) + "\"></i>" + esc(STATUS_LABEL[p.status] || p.status) +
      (p.lost ? " · " + esc(p.lost) : "") + "</p>" +
      '<p><a href="#site-' + esc(p.id) + '">Read entry ↓</a></p>';
  }

  function itemHtml(p, located) {
    var meta = [p.district, p.built ? "Built " + p.built : null, p.lost].filter(Boolean).map(esc).join(" · ");
    var sources = (p.sources && p.sources.length)
      ? "<p><small>Sources: " + p.sources.map(esc).join("; ") + "</small></p>" : "";
    return '<div class="site-head">' +
        "<h3>" + esc(p.name) + "</h3>" +
        (p.name_ar ? '<span class="ar" lang="ar" dir="rtl">' + esc(p.name_ar) + "</span>" : "") +
      "</div>" +
      '<p class="site-meta"><i class="dot dot--' + esc(p.status) + '"></i>' +
        esc(STATUS_LABEL[p.status] || p.status) + (meta ? " · " + meta : "") + "</p>" +
      "<p>" + esc(p.summary) + "</p>" +
      (p.story ? '<p class="story">' + esc(p.story) + "</p>" : "") +
      sources +
      '<div class="site-foot">' +
        (located ? '<button type="button" class="locate" data-id="' + esc(p.id) + '">Show on map</button>'
                 : '<span class="tag tag--warn">Not yet located</span>') +
        (p.precision === "approximate" ? '<span class="tag">Approximate position</span>' : "") +
        (p.verified ? '<span class="tag tag--done">Verified</span>' : '<span class="tag tag--warn">Unverified</span>') +
      "</div>";
  }

  function setActive(id) {
    Object.keys(items).forEach(function (k) { items[k].classList.toggle("is-active", k === id); });
  }

  function render(data) {
    features = data.features || [];
    listEl.innerHTML = "";

    features.forEach(function (f) {
      var p = f.properties;
      var located = hasMap && f.geometry && f.geometry.type === "Point";

      var li = document.createElement("li");
      li.className = "site";
      li.id = "site-" + p.id;
      li.dataset.status = p.status;
      li.innerHTML = itemHtml(p, located);
      listEl.appendChild(li);
      items[p.id] = li;

      if (located) {
        var c = f.geometry.coordinates;
        var m = L.circleMarker([c[1], c[0]], {
          radius: 8,
          weight: 2,
          color: css.getPropertyValue("--paper").trim(),
          fillColor: statusColour(p.status),
          fillOpacity: 0.95
        }).bindPopup(popupHtml(p)).bindTooltip(p.name, { direction: "top", offset: [0, -6] });
        m.on("click", function () { setActive(p.id); });
        m.addTo(map);
        markers[p.id] = m;
      }
    });

    listEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".locate");
      if (!btn) return;
      var id = btn.dataset.id, m = markers[id];
      if (!m) return;
      setActive(id);
      document.getElementById("atlas").scrollIntoView({ behavior: "smooth", block: "start" });
      map.flyTo(m.getLatLng(), 17, { duration: 0.8 });
      m.openPopup();
    });

    applyFilter("all");
  }

  // ---------- Filter ----------

  function applyFilter(status) {
    var shown = 0;
    features.forEach(function (f) {
      var p = f.properties;
      var on = status === "all" || p.status === status;
      items[p.id].hidden = !on;
      if (on) shown++;
      var m = markers[p.id];
      if (m) { if (on) m.addTo(map); else map.removeLayer(m); }
    });
    countEl.textContent = shown + (shown === 1 ? " site" : " sites") +
      (status === "all" ? " recorded so far." : " marked " + STATUS_LABEL[status].toLowerCase() + ".");
  }

  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll(".chip").forEach(function (c) {
        c.classList.toggle("is-on", c === chip);
        c.setAttribute("aria-pressed", c === chip ? "true" : "false");
      });
      applyFilter(chip.dataset.status);
    });
  });

  fetch("data/sites.geojson")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(function () {
      listEl.innerHTML = '<li class="loading">The site list could not be loaded. ' +
        "If you are viewing this file locally, serve the folder (e.g. <code>python3 -m http.server</code>).</li>";
    });
})();
