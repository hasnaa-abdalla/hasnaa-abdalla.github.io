/* Alexandria's Lost Geography: atlas and gazetteer.
   Site data lives in data/sites.geojson (it opens directly in QGIS).
   Historical overlays: add georeferenced tile layers to OVERLAYS below. */

(function () {
  "use strict";

  // Georeferenced historical maps, e.g. exported from QGIS or MapWarper as XYZ tiles.
  // { name: "el-Falaki, 1866", url: "maps/falaki-1866/{z}/{x}/{y}.png", attribution: "…", maxNativeZoom: 18 }
  var OVERLAYS = [];

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

  if (hasMap && OVERLAYS.length) {
    var overlayLayers = {};
    OVERLAYS.forEach(function (o) {
      overlayLayers[o.name] = L.tileLayer(o.url, {
        opacity: 0.75,
        attribution: o.attribution || "",
        maxNativeZoom: o.maxNativeZoom || 18,
        maxZoom: 19
      });
    });
    L.control.layers({ "Today": base }, overlayLayers, { collapsed: false }).addTo(map);
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
