// Garments Showroom - GitHub Pages website.
// Software (PC) online thakle product / order live API theke; na thakle data/ er copy + WhatsApp e order.
(function () {
  "use strict";

  var S = {
    cfg: { apiBase: "", whatsapp: "", phone: "", shopName: "Garments Showroom", deliveryCharge: 0 },
    live: false,
    products: [],
    categories: [],
    localImages: {},
    cart: [],
    slider: null
  };

  var $app = document.getElementById("app");
  var CART_KEY = "gs.cart.v1";
  var LAST_KEY = "gs.lastOrder.v1";

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function tk(v) { return "৳ " + Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 }); }
  function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ } }
  function load(key, def) { try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? def : v; } catch (e) { return def; } }

  function fetchJson(url, ms, opts) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, ms || 8000) : null;
    var o = opts || {};
    if (ctrl) o.signal = ctrl.signal;
    return fetch(url, o).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) return r.text().then(function (t) { var e = new Error(t || ("HTTP " + r.status)); e.status = r.status; throw e; });
      return r.json();
    }, function (err) { if (timer) clearTimeout(timer); throw err; });
  }

  // 01XXXXXXXXX (11 digit) - +880 / 880 / space / dash chalbe
  function normPhone(p) {
    var d = String(p || "").replace(/[^\d]/g, "");
    if (d.indexOf("880") === 0) d = d.slice(2);
    if (d.length === 10 && d[0] === "1") d = "0" + d;
    return /^01[3-9]\d{8}$/.test(d) ? d : null;
  }

  // Export kora chobi local e thakle sheta (druto), na hole live API theke
  function img(url) {
    if (!url) return "";
    var name = url.split("/").pop();
    if (S.localImages[name]) return "img/" + name;
    return S.live ? S.cfg.apiBase.replace(/\/$/, "") + "/" + url.replace(/^\//, "") : "img/" + name;
  }

  function product(id) { for (var i = 0; i < S.products.length; i++) if (S.products[i].id === id) return S.products[i]; return null; }
  function variantOf(vid) {
    for (var i = 0; i < S.products.length; i++) {
      var p = S.products[i];
      for (var j = 0; j < p.variants.length; j++) if (p.variants[j].id === vid) return { p: p, v: p.variants[j] };
    }
    return null;
  }
  function label(v) { return v.color ? v.size + " / " + v.color : v.size; }
  function offPct(p) { return p.price > 0 && p.finalPrice < p.price ? Math.round((p.price - p.finalPrice) / p.price * 100) : 0; }

  function waLink(text) {
    var n = String(S.cfg.whatsapp || "").replace(/[^\d]/g, "");
    return "https://wa.me/" + n + (text ? "?text=" + encodeURIComponent(text) : "");
  }

  // ---------- cart ----------
  function saveCart() {
    store(CART_KEY, S.cart);
    var n = S.cart.reduce(function (a, l) { return a + l.qty; }, 0);
    document.getElementById("cartCount").textContent = n;
  }
  function addToCart(vid, qty) {
    var line = S.cart.filter(function (l) { return l.vid === vid; })[0];
    if (line) line.qty = Math.min(10, line.qty + qty);
    else S.cart.push({ vid: vid, qty: qty });
    saveCart();
  }
  function cartLines() {
    return S.cart.map(function (l) {
      var x = variantOf(l.vid);
      return x ? { vid: l.vid, qty: l.qty, p: x.p, v: x.v, total: x.v.finalPrice * l.qty } : null;
    }).filter(Boolean);
  }

  // ---------- data ----------
  function boot() {
    S.cart = load(CART_KEY, []);
    fetchJson("data/config.json?t=" + Date.now(), 6000, { cache: "no-store" })
      .catch(function () { return {}; })
      .then(function (cfg) {
        for (var k in cfg) S.cfg[k] = cfg[k];
        applyShopInfo();
        return fetchJson("data/images.json?t=" + Date.now(), 6000, { cache: "no-store" }).catch(function () { return []; });
      })
      .then(function (names) {
        (names || []).forEach(function (n) { S.localImages[n] = true; });
        return loadLive().catch(loadStatic);
      })
      .then(function () {
        saveCart();
        showStatus();
        renderCats();
        route();
      })
      .catch(function () {
        $app.innerHTML = '<div class="empty"><i class="bi bi-wifi-off"></i>Data load hoy nai. Page reload korun.</div>';
      });
  }

  function loadLive() {
    var base = (S.cfg.apiBase || "").replace(/\/$/, "");
    if (!base) return Promise.reject(new Error("no api"));
    return Promise.all([
      fetchJson(base + "/api/store/products", 7000),
      fetchJson(base + "/api/store/categories", 7000),
      fetchJson(base + "/api/store/info", 7000).catch(function () { return null; })
    ]).then(function (r) {
      S.products = r[0]; S.categories = r[1];
      if (r[2]) {
        S.cfg.deliveryCharge = r[2].deliveryCharge;
        if (r[2].payments) S.cfg.payments = r[2].payments;
      }
      S.live = true;
    });
  }

  function loadStatic() {
    S.live = false;
    return Promise.all([
      fetchJson("data/products.json?t=" + Date.now(), 10000, { cache: "no-store" }),
      fetchJson("data/categories.json?t=" + Date.now(), 10000, { cache: "no-store" })
    ]).then(function (r) { S.products = r[0]; S.categories = r[1]; });
  }

  function applyShopInfo() {
    var name = S.cfg.shopName || "Garments Showroom";
    document.getElementById("shopName").textContent = name;
    document.getElementById("ftName").textContent = name;
    var phone = normPhone(S.cfg.phone);
    var call = document.getElementById("hdCall");
    if (phone) {
      call.href = "tel:" + phone;
      document.getElementById("hdPhone").textContent = phone;
    } else call.hidden = true;
    var wa = document.getElementById("waFloat");
    if (S.cfg.whatsapp) { wa.href = waLink("আসসালামু আলাইকুম, আমি একটা শাড়ি অর্ডার করতে চাই।"); wa.hidden = false; }
    document.getElementById("ftContact").innerHTML =
      (phone ? '<a href="tel:' + phone + '"><i class="bi bi-telephone"></i> ' + phone + "</a>" : "") +
      (S.cfg.whatsapp ? '<a href="' + waLink("") + '" target="_blank" rel="noopener"><i class="bi bi-whatsapp"></i> WhatsApp</a>' : "");
  }

  function showStatus() {
    var bar = document.getElementById("statusBar");
    if (S.live) { bar.hidden = true; return; }
    bar.innerHTML = '<div class="wrap"><i class="bi bi-info-circle"></i><span>এখন সরাসরি অর্ডার সিস্টেম বন্ধ — অর্ডার ' +
      (S.cfg.whatsapp ? "WhatsApp-এ চলে যাবে, আমরা ফোন করে কনফার্ম করব।" : "করতে ফোন করুন।") + "</span></div>";
    bar.hidden = false;
  }

  // ---------- router ----------
  function route() {
    stopSlider();
    var h = location.hash.replace(/^#\/?/, "");
    var parts = h.split("?")[0].split("/");
    var query = new URLSearchParams(h.split("?")[1] || "");
    window.scrollTo(0, 0);
    if (parts[0] === "p") return renderProduct(+parts[1]);
    if (parts[0] === "checkout") return renderCheckout();
    if (parts[0] === "done") return renderDone(decodeURIComponent(parts[1] || ""));
    if (parts[0] === "c") return renderList(+parts[1], "");
    if (parts[0] === "search") return renderList(null, query.get("q") || "");
    return renderList(null, "");
  }
  window.addEventListener("hashchange", function () { renderCats(); route(); });

  function renderCats() {
    var cur = (location.hash.match(/^#\/c\/(\d+)/) || [])[1];
    var home = !location.hash || location.hash === "#/" || location.hash === "#";
    document.getElementById("catNav").innerHTML =
      '<a href="#/" class="' + (home ? "on" : "") + '">সব শাড়ি</a>' +
      S.categories.map(function (c) {
        return '<a href="#/c/' + c.id + '" class="' + (String(c.id) === cur ? "on" : "") + '">' + esc(c.name) + "</a>";
      }).join("");
  }

  // ---------- pages ----------
  function card(p) {
    var off = offPct(p);
    return '<article class="card pc">' +
      '<a class="pc-img" href="#/p/' + p.id + '">' +
      (p.images.length ? '<img src="' + esc(img(p.images[0])) + '" alt="' + esc(p.name) + '" loading="lazy" />' : '<i class="bi bi-image"></i>') +
      (off ? '<span class="off">-' + off + "%</span>" : "") + "</a>" +
      '<div class="pc-body"><a class="pc-name" href="#/p/' + p.id + '">' + esc(p.name) + "</a>" +
      '<div class="price"><strong>' + tk(p.finalPrice) + "</strong>" + (p.finalPrice < p.price ? "<del>" + tk(p.price) + "</del>" : "") + "</div>" +
      '<button class="btn full" data-order="' + p.id + '"><i class="bi bi-bag-plus"></i> অর্ডার করুন</button></div></article>';
  }

  function renderList(catId, q) {
    var list = S.products.slice();
    var cat = null;
    if (catId) {
      cat = S.categories.filter(function (c) { return c.id === catId; })[0];
      list = list.filter(function (p) { return p.categoryId === catId; });
    }
    if (q) {
      var words = q.toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter(function (p) {
        var t = (p.name + " " + (p.code || "") + " " + (p.categoryName || "")).toLowerCase();
        return words.every(function (w) { return t.indexOf(w) >= 0; });
      });
    }
    var heading = q ? '"' + esc(q) + '" খোঁজার ফলাফল' : cat ? esc(cat.name) : "সব শাড়ি";
    var home = !catId && !q;

    $app.innerHTML =
      (home ? '<section class="hero"><div class="hero-tag">নতুন কালেকশন</div><h1>ঐতিহ্য আর আধুনিকতার মেলবন্ধন</h1>' +
        "<p>জামদানি, এমব্রয়ডারি, ডিজিটাল প্রিন্ট — পছন্দের শাড়ি অর্ডার করুন, টাকা দিন হাতে পেয়ে।</p>" +
        '<div class="hero-badges"><span><i class="bi bi-truck"></i> হোম ডেলিভারি</span><span><i class="bi bi-cash-coin"></i> ক্যাশ অন ডেলিভারি</span><span><i class="bi bi-patch-check"></i> অরিজিনাল কোয়ালিটি</span></div></section>' +
        sliderHtml() : "") +
      '<div class="sec-head"><h2>' + heading + "</h2><span>" + list.length + " টি পণ্য</span></div>" +
      (list.length ? '<div class="grid">' + list.map(card).join("") + "</div>"
        : '<div class="empty"><i class="bi bi-search"></i>কোনো পণ্য পাওয়া যায়নি।<br><br><a class="btn" href="#/">সব শাড়ি দেখুন</a></div>');
    if (home) startSlider();
    document.title = (cat ? cat.name + " — " : "") + (S.cfg.shopName || "Garments Showroom");
  }

  // Bahari style gol chobir category slider, loop kore ghore
  function sliderHtml() {
    var all = { name: "সব শাড়ি", href: "#/", count: S.products.length, image: null };
    var used = {};
    S.categories.forEach(function (c) { if (c.image) used[c.image] = true; });
    for (var i = 0; i < S.products.length && !all.image; i++)
      if (S.products[i].images[0] && !used[S.products[i].images[0]]) all.image = S.products[i].images[0];
    var items = [all].concat(S.categories.map(function (c) { return { name: c.name, href: "#/c/" + c.id, count: c.productCount, image: c.image }; }));
    if (items.length < 2) return "";
    var reps = Math.max(2, Math.ceil((items.length + 6) / items.length));
    var html = "";
    for (var r = 0; r < reps; r++) {
      html += items.map(function (it) {
        return '<a class="cs-item" href="' + it.href + '"' + (r ? ' aria-hidden="true" tabindex="-1"' : "") + '><span class="cs-card"><span class="cs-img">' +
          (it.image ? '<img src="' + esc(img(it.image)) + '" alt="' + esc(it.name) + '" loading="lazy" />' : '<i class="bi bi-bag-heart"></i>') +
          '</span><span class="cs-name">' + esc(it.name) + '</span><span class="cs-count">' + it.count + " টি পণ্য</span></span></a>";
      }).join("");
    }
    S.slider = { n: items.length, i: 0, busy: false, paused: false };
    return '<section class="cs"><h2 class="cs-title">প্রোডাক্ট ক্যাটাগরী সমূহ</h2><div class="cs-frame" id="csFrame">' +
      '<button class="cs-arrow prev" id="csPrev" aria-label="আগের"><i class="bi bi-chevron-left"></i></button>' +
      '<div class="cs-viewport"><div class="cs-track" id="csTrack">' + html + "</div></div>" +
      '<button class="cs-arrow next" id="csNext" aria-label="পরের"><i class="bi bi-chevron-right"></i></button></div></section>';
  }

  function startSlider() {
    var sl = S.slider, track = document.getElementById("csTrack"), frame = document.getElementById("csFrame");
    if (!sl || !track) return;
    function set(i, anim) {
      track.classList.toggle("no-anim", !anim);
      track.style.transform = "translateX(calc(" + (-i) + " * 100% / var(--vis)))";
      sl.i = i;
    }
    function next() {
      if (sl.busy) return;
      sl.busy = true;
      set(sl.i + 1, true);
      setTimeout(function () {
        if (sl.i >= sl.n) { set(0, false); void track.offsetWidth; }
        sl.busy = false;
      }, 650);
    }
    function prev() {
      if (sl.busy) return;
      sl.busy = true;
      if (sl.i === 0) { set(sl.n, false); void track.offsetWidth; }
      set(sl.i - 1, true);
      setTimeout(function () { sl.busy = false; }, 650);
    }
    document.getElementById("csNext").onclick = next;
    document.getElementById("csPrev").onclick = prev;
    frame.onmouseenter = function () { sl.paused = true; };
    frame.onmouseleave = function () { sl.paused = false; };
    var x0 = 0;
    frame.addEventListener("touchstart", function (e) { sl.paused = true; x0 = e.changedTouches[0].clientX; }, { passive: true });
    frame.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - x0;
      if (dx < -40) next(); else if (dx > 40) prev();
      sl.paused = false;
    }, { passive: true });
    sl.timer = setInterval(function () { if (!sl.paused && !document.hidden) next(); }, 3000);
  }
  function stopSlider() { if (S.slider && S.slider.timer) clearInterval(S.slider.timer); S.slider = null; }

  function renderProduct(id) {
    var p = product(id);
    if (!p) {
      $app.innerHTML = '<div class="empty"><i class="bi bi-emoji-frown"></i>পণ্যটি পাওয়া যায়নি।<br><br><a class="btn" href="#/">সব শাড়ি দেখুন</a></div>';
      return;
    }
    var sel = p.variants[0] ? p.variants[0].id : 0, qty = 1, imgIdx = 0;
    document.title = p.name + " — " + (S.cfg.shopName || "Garments Showroom");

    function draw() {
      var v = p.variants.filter(function (x) { return x.id === sel; })[0] || p.variants[0];
      var off = v && v.price > 0 && v.finalPrice < v.price ? Math.round((v.price - v.finalPrice) / v.price * 100) : 0;
      $app.innerHTML =
        '<div class="crumb"><a href="#/">হোম</a>' + (p.categoryId ? ' / <a href="#/c/' + p.categoryId + '">' + esc(p.categoryName) + "</a>" : "") + " / " + esc(p.code || p.name) + "</div>" +
        '<div class="card pd"><div>' +
        '<div class="pd-main">' + (p.images.length ? '<img src="' + esc(img(p.images[imgIdx])) + '" alt="' + esc(p.name) + '" />' : "") + "</div>" +
        (p.images.length > 1 ? '<div class="thumbs">' + p.images.map(function (u, i) {
          return '<button data-img="' + i + '" class="' + (i === imgIdx ? "on" : "") + '" aria-label="ছবি ' + (i + 1) + '"><img src="' + esc(img(u)) + '" alt="" loading="lazy" /></button>';
        }).join("") + "</div>" : "") +
        "</div><div>" +
        "<h1>" + esc(p.name) + "</h1>" +
        '<div class="pd-meta">' + [p.code ? "কোড: " + esc(p.code) : "", p.fabric ? "ফেব্রিক: " + esc(p.fabric) : "", p.brandName ? esc(p.brandName) : ""].filter(Boolean).join(" · ") + "</div>" +
        (v ? '<div class="price"><strong>' + tk(v.finalPrice) + "</strong>" + (v.finalPrice < v.price ? "<del>" + tk(v.price) + "</del>" : "") +
          (off ? ' <span class="off" style="position:static">-' + off + "%</span>" : "") + "</div>" : "") +
        (p.variants.length > 1 ? '<div class="pd-label">সাইজ / কালার</div><div class="chips">' + p.variants.map(function (x) {
          return '<button class="chip ' + (x.id === sel ? "on" : "") + '" data-var="' + x.id + '">' + esc(label(x)) + "</button>";
        }).join("") + "</div>" : "") +
        '<div class="pd-label">পরিমাণ</div><div class="qty"><button data-q="-1" aria-label="কম">−</button><span>' + qty + '</span><button data-q="1" aria-label="বেশি">+</button></div>' +
        '<div class="pd-actions"><button class="btn lg" id="buyNow"><i class="bi bi-lightning-charge-fill"></i> এখনই অর্ডার করুন</button>' +
        '<button class="btn lg outline" id="addCart"><i class="bi bi-bag-plus"></i> কার্টে রাখুন</button></div>' +
        (S.cfg.whatsapp ? '<a class="btn wa full" style="margin-top:10px" target="_blank" rel="noopener" href="' + esc(waLink("আমি এই শাড়িটা নিতে চাই: " + p.name + (p.code ? " (" + p.code + ")" : "") + (v ? " — " + label(v) + ", " + tk(v.finalPrice) : ""))) + '"><i class="bi bi-whatsapp"></i> WhatsApp-এ জিজ্ঞেস করুন</a>' : "") +
        '<ul class="perks"><li><i class="bi bi-cash-coin"></i>ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দিন</li><li><i class="bi bi-truck"></i>সারা দেশে হোম ডেলিভারি</li><li><i class="bi bi-telephone"></i>অর্ডারের পর আমরা ফোনে কনফার্ম করব</li></ul>' +
        (p.description ? '<div class="pd-desc">' + esc(p.description) + "</div>" : "") +
        "</div></div>";

      $app.querySelectorAll("[data-img]").forEach(function (b) { b.onclick = function () { imgIdx = +b.dataset.img; draw(); }; });
      $app.querySelectorAll("[data-var]").forEach(function (b) { b.onclick = function () { sel = +b.dataset.var; draw(); }; });
      $app.querySelectorAll("[data-q]").forEach(function (b) { b.onclick = function () { qty = Math.max(1, Math.min(10, qty + +b.dataset.q)); draw(); }; });
      document.getElementById("buyNow").onclick = function () { if (sel) { addToCart(sel, qty); location.hash = "#/checkout"; } };
      document.getElementById("addCart").onclick = function () {
        if (!sel) return;
        addToCart(sel, qty);
        this.innerHTML = '<i class="bi bi-check2"></i> কার্টে রাখা হয়েছে';
      };
    }
    draw();
  }

  function renderCheckout() {
    document.title = "চেকআউট — " + (S.cfg.shopName || "Garments Showroom");
    var form = load("gs.form.v1", { name: "", phone: "", address: "", note: "" });
    // Payment: COD, ba bKash / Nagad e Send Money kore TrxID
    var pay = { method: "COD", amount: 0, from: "", trx: "" };
    var payments = (S.cfg.payments || []).filter(function (p) { return p.method === "bKash" || p.method === "Nagad"; });
    var errors = {}, msg = "", busy = false, copied = false;

    function payOption() { return payments.filter(function (p) { return p.method === pay.method; })[0] || null; }

    function paymentHtml(total) {
      if (!payments.length) {
        return '<div class="cod-note"><i class="bi bi-cash-coin"></i><span>ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দিন। অর্ডারের পর আমরা ফোন করে কনফার্ম করব।</span></div>';
      }
      var opt = payOption();
      var html = '<h2 style="margin-top:22px">পেমেন্ট</h2><div class="pay-options">' +
        '<button class="pay ' + (!opt ? "on" : "") + '" data-pay="COD"><span class="pay-logo cod"><i class="bi bi-cash-coin"></i></span>' +
        "<span><strong>ক্যাশ অন ডেলিভারি</strong><small>পণ্য হাতে পেয়ে টাকা দিন</small></span></button>" +
        payments.map(function (p) {
          return '<button class="pay ' + (pay.method === p.method ? "on" : "") + '" data-pay="' + esc(p.method) + '"><span class="pay-logo ' + p.method.toLowerCase() + '">' + esc(p.method) + "</span>" +
            "<span><strong>" + esc(p.method) + "</strong><small>অগ্রিম / পুরো টাকা পাঠান</small></span></button>";
        }).join("") + "</div>";
      if (!opt) {
        return html + '<div class="cod-note"><i class="bi bi-cash-coin"></i><span>ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দিন। অর্ডারের পর আমরা ফোন করে কনফার্ম করব।</span></div>';
      }
      var merchant = opt.type === "Merchant";
      return html + '<div class="pay-box ' + opt.method.toLowerCase() + '"><ol>' +
        "<li>" + esc(opt.method) + " অ্যাপ বা ডায়াল (" + (opt.method === "bKash" ? "*247#" : "*167#") + ") থেকে <strong>" + (merchant ? "Payment" : "Send Money") + "</strong> করুন</li>" +
        '<li>নাম্বার: <strong class="pay-no">' + esc(opt.number) + '</strong> <button class="copy" id="copyNo"><i class="bi ' + (copied ? "bi-check2" : "bi-copy") + '"></i> ' + (copied ? "কপি হয়েছে" : "কপি") + "</button>" +
        "<small> (" + (merchant ? "Merchant" : "Personal") + " নাম্বার)</small></li>" +
        "<li>যত টাকা পাঠাবেন লিখুন — পুরো " + tk(total) + " অথবা অগ্রিম (বাকি টাকা ক্যাশ অন ডেলিভারি)</li>" +
        "<li>SMS-এ পাওয়া <strong>Transaction ID (TrxID)</strong> নিচে লিখুন</li></ol>" +
        '<div class="pay-grid"><div class="field"><label for="p-amount">যত টাকা পাঠিয়েছেন</label><input id="p-amount" type="number" min="1" max="' + total + '" />' +
        '<div class="pay-quick"><button data-amt="' + total + '">পুরো ' + tk(total) + "</button><button data-amt=\"100\">৳100</button><button data-amt=\"200\">৳200</button><button data-amt=\"500\">৳500</button></div>" +
        (errors.amount ? '<div class="err">' + errors.amount + "</div>" : "") + "</div>" +
        '<div class="field"><label for="p-from">যে নাম্বার থেকে পাঠিয়েছেন</label><input id="p-from" type="tel" placeholder="01XXXXXXXXX" />' +
        (errors.from ? '<div class="err">' + errors.from + "</div>" : "") + "</div></div>" +
        '<div class="field"><label for="p-trx">Transaction ID (TrxID)</label><input id="p-trx" class="trx" maxlength="20" autocomplete="off" placeholder="যেমন: 9JK7ABCD12" />' +
        (errors.trx ? '<div class="err">' + errors.trx + "</div>" : "") + "</div>" +
        (pay.amount > 0 && pay.amount < total ? '<div class="pay-due">ডেলিভারির সময় দিবেন: <strong>' + tk(total - pay.amount) + "</strong></div>" : "") +
        '<div class="pay-note"><i class="bi bi-shield-check"></i> আমরা ' + esc(opt.method) + "-এ মিলিয়ে দেখে অর্ডার কনফার্ম করব।</div></div>";
    }

    function wirePayment(total) {
      $app.querySelectorAll("[data-pay]").forEach(function (b) {
        b.onclick = function () {
          pay.method = b.dataset.pay;
          if (pay.method !== "COD") {
            if (!pay.amount) pay.amount = total;
            if (!pay.from) pay.from = form.phone || "";
          }
          errors = {}; draw();
        };
      });
      $app.querySelectorAll("[data-amt]").forEach(function (b) { b.onclick = function () { pay.amount = +b.dataset.amt; draw(); }; });
      var bind = function (id, key, upper) {
        var el = document.getElementById(id);
        if (!el) return;
        el.value = pay[key] || "";
        el.oninput = function () { pay[key] = id === "p-amount" ? Number(el.value || 0) : (upper ? el.value.toUpperCase() : el.value); };
        if (id === "p-amount") el.onchange = function () { draw(); };
      };
      bind("p-amount", "amount"); bind("p-from", "from"); bind("p-trx", "trx", true);
      var copy = document.getElementById("copyNo");
      if (copy) copy.onclick = function () {
        var opt = payOption();
        if (navigator.clipboard && opt) navigator.clipboard.writeText(opt.number).then(function () { copied = true; draw(); }, function () { });
      };
    }

    function draw() {
      var lines = cartLines();
      if (!lines.length) {
        $app.innerHTML = '<div class="empty"><i class="bi bi-bag-x"></i>আপনার কার্ট খালি।<br><br><a class="btn" href="#/">শাড়ি দেখুন</a></div>';
        return;
      }
      var sub = lines.reduce(function (a, l) { return a + l.total; }, 0);
      var dc = Number(S.cfg.deliveryCharge || 0);
      $app.innerHTML =
        '<div class="co"><div class="card"><h2>ডেলিভারির তথ্য</h2>' +
        (msg ? '<div class="alert err"><i class="bi bi-exclamation-triangle-fill"></i><span>' + msg + "</span></div>" : "") +
        field("name", "আপনার নাম", "text", "name", "যেমন: রহিমা আক্তার") +
        field("phone", "মোবাইল নম্বর", "tel", "tel", "01XXXXXXXXX") +
        field("address", "সম্পূর্ণ ঠিকানা", "textarea", "street-address", "বাড়ি, রোড, এলাকা, জেলা") +
        field("note", "নোট <small>(ঐচ্ছিক)</small>", "textarea", "off", "") +
        paymentHtml(sub + dc) +
        (S.live
          ? '<button class="btn lg full" id="placeOrder"' + (busy ? " disabled" : "") + '><i class="bi bi-check2-circle"></i> ' + (busy ? "অর্ডার হচ্ছে…" : "অর্ডার কনফার্ম করুন (" + tk(sub + dc) + ")") + "</button>" +
            (S.cfg.whatsapp ? '<div class="or">অথবা</div><button class="btn wa full" id="waOrder"><i class="bi bi-whatsapp"></i> WhatsApp-এ অর্ডার পাঠান</button>' : "")
          : (S.cfg.whatsapp ? '<button class="btn wa lg full" id="waOrder"><i class="bi bi-whatsapp"></i> WhatsApp-এ অর্ডার পাঠান (' + tk(sub + dc) + ")</button>"
            : '<a class="btn lg full" href="tel:' + esc(normPhone(S.cfg.phone) || "") + '"><i class="bi bi-telephone"></i> ফোন করে অর্ডার করুন</a>')) +
        '</div><div class="card summary"><h2>আপনার অর্ডার (' + lines.length + ")</h2>" +
        lines.map(function (l) {
          return '<div class="line"><div class="line-img">' + (l.p.images.length ? '<img src="' + esc(img(l.p.images[0])) + '" alt="" />' : "") + "</div>" +
            '<div class="line-info"><div class="line-name">' + esc(l.p.name) + '</div><div class="line-var">' + esc(label(l.v)) + "</div>" +
            '<div class="line-row"><div class="qty"><button data-dec="' + l.vid + '" aria-label="কম">−</button><span>' + l.qty + '</span><button data-inc="' + l.vid + '" aria-label="বেশি">+</button></div>' +
            "<strong>" + tk(l.total) + '</strong><button class="rm" data-rm="' + l.vid + '" aria-label="বাদ দিন"><i class="bi bi-trash3"></i></button></div></div></div>';
        }).join("") +
        '<div class="totals"><div><span>সাবটোটাল</span><span>' + tk(sub) + "</span></div>" +
        "<div><span>ডেলিভারি চার্জ</span><span>" + (dc ? tk(dc) : "ফোনে জানানো হবে") + "</span></div>" +
        '<div class="grand"><span>মোট</span><span>' + tk(sub + dc) + "</span></div></div></div></div>";

      ["name", "phone", "address", "note"].forEach(function (k) {
        var el = document.getElementById("f-" + k);
        el.value = form[k] || "";
        el.oninput = function () { form[k] = el.value; store("gs.form.v1", form); };
      });
      $app.querySelectorAll("[data-inc]").forEach(function (b) { b.onclick = function () { bump(+b.dataset.inc, 1); }; });
      $app.querySelectorAll("[data-dec]").forEach(function (b) { b.onclick = function () { bump(+b.dataset.dec, -1); }; });
      $app.querySelectorAll("[data-rm]").forEach(function (b) {
        b.onclick = function () { S.cart = S.cart.filter(function (l) { return l.vid !== +b.dataset.rm; }); saveCart(); draw(); };
      });
      wirePayment(sub + dc);
      var po = document.getElementById("placeOrder");
      if (po) po.onclick = placeOrder;
      var wa = document.getElementById("waOrder");
      if (wa) wa.onclick = whatsappOrder;
    }

    function field(k, title, type, ac, ph) {
      var input = type === "textarea"
        ? '<textarea id="f-' + k + '" rows="' + (k === "note" ? 2 : 3) + '" autocomplete="' + ac + '" placeholder="' + ph + '"></textarea>'
        : '<input id="f-' + k + '" type="' + type + '" autocomplete="' + ac + '" placeholder="' + ph + '" />';
      return '<div class="field"><label for="f-' + k + '">' + title + "</label>" + input + (errors[k] ? '<div class="err">' + errors[k] + "</div>" : "") + "</div>";
    }

    function bump(vid, by) {
      var l = S.cart.filter(function (x) { return x.vid === vid; })[0];
      if (!l) return;
      l.qty = Math.max(1, Math.min(10, l.qty + by));
      saveCart();
      draw();
    }

    function validate() {
      errors = {};
      if ((form.name || "").trim().length < 2) errors.name = "আপনার নাম লিখুন";
      if (!normPhone(form.phone)) errors.phone = "১১ ডিজিটের সঠিক মোবাইল নম্বর লিখুন (01XXXXXXXXX)";
      if ((form.address || "").trim().length < 5) errors.address = "সম্পূর্ণ ঠিকানা লিখুন";
      if (payOption()) {
        var total = cartLines().reduce(function (a, l) { return a + l.total; }, 0) + Number(S.cfg.deliveryCharge || 0);
        if (!(pay.amount >= 1 && pay.amount <= total)) errors.amount = "৳১ থেকে " + tk(total) + " এর মধ্যে লিখুন";
        if (!normPhone(pay.from)) errors.from = "যে নাম্বার থেকে পাঠিয়েছেন সেটা লিখুন";
        if (!/^[A-Z0-9]{6,20}$/.test((pay.trx || "").trim().toUpperCase())) errors.trx = "SMS-এ পাওয়া TrxID লিখুন";
      }
      if (Object.keys(errors).length) msg = "লাল চিহ্নিত ঘরগুলো ঠিক করুন।";
      return Object.keys(errors).length === 0;
    }

    function payText() {
      var opt = payOption();
      return opt ? "\n\nপেমেন্ট: " + opt.method + " " + tk(pay.amount) + "\nপাঠিয়েছি: " + normPhone(pay.from) + "\nTrxID: " + pay.trx.trim().toUpperCase()
        : "\n\n(ক্যাশ অন ডেলিভারি)";
    }

    function placeOrder() {
      msg = "";
      if (!validate()) { draw(); return; }
      busy = true; draw();
      var body = {
        name: form.name.trim(), phone: normPhone(form.phone), address: form.address.trim(), note: (form.note || "").trim() || null,
        items: S.cart.map(function (l) { return { variantId: l.vid, quantity: l.qty }; })
      };
      var opt = payOption();
      if (opt) {
        body.paymentMethod = opt.method;
        body.paymentAmount = pay.amount;
        body.paymentFrom = normPhone(pay.from);
        body.paymentTrxId = pay.trx.trim().toUpperCase();
      }
      fetchJson(S.cfg.apiBase.replace(/\/$/, "") + "/api/store/orders", 15000, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      }).then(function (res) {
        store(LAST_KEY, { orderNo: res.orderNo, total: res.total, phone: body.phone, via: "web" });
        S.cart = []; saveCart();
        location.hash = "#/done/" + encodeURIComponent(res.orderNo);
      }).catch(function (err) {
        busy = false;
        if (err.status && err.status < 500) msg = esc(err.message.replace(/^"|"$/g, ""));
        else msg = "সার্ভারে পৌঁছানো যাচ্ছে না।" + (S.cfg.whatsapp ? " নিচের WhatsApp বাটনে অর্ডার পাঠান।" : " একটু পরে আবার চেষ্টা করুন।");
        if (!err.status) { S.live = false; showStatus(); }
        draw();
      });
    }

    function whatsappOrder() {
      msg = "";
      if (!validate()) { draw(); return; }
      var lines = cartLines();
      var sub = lines.reduce(function (a, l) { return a + l.total; }, 0);
      var text = "🛍️ নতুন অর্ডার — " + (S.cfg.shopName || "Garments Showroom") + "\n\n" +
        lines.map(function (l, i) {
          return (i + 1) + ". " + l.p.name + (l.p.code ? " (" + l.p.code + ")" : "") + "\n   " + label(l.v) + " × " + l.qty + " = " + tk(l.total);
        }).join("\n") +
        "\n\nমোট: " + tk(sub + Number(S.cfg.deliveryCharge || 0)) +
        "\n\nনাম: " + form.name.trim() + "\nমোবাইল: " + normPhone(form.phone) + "\nঠিকানা: " + form.address.trim() +
        (form.note && form.note.trim() ? "\nনোট: " + form.note.trim() : "") + payText();
      window.open(waLink(text), "_blank", "noopener");
      store(LAST_KEY, { orderNo: "", total: sub, phone: normPhone(form.phone), via: "whatsapp" });
      S.cart = []; saveCart();
      location.hash = "#/done/whatsapp";
    }

    draw();
  }

  function renderDone(no) {
    var last = load(LAST_KEY, {});
    var wa = no === "whatsapp";
    document.title = "অর্ডার সম্পন্ন — " + (S.cfg.shopName || "Garments Showroom");
    $app.innerHTML = '<div class="card done"><div class="done-icon"><i class="bi ' + (wa ? "bi-whatsapp" : "bi-check-lg") + '"></i></div>' +
      "<h1>" + (wa ? "WhatsApp-এ অর্ডার পাঠানো হয়েছে" : "ধন্যবাদ! অর্ডার হয়েছে") + "</h1>" +
      (wa ? "<p>WhatsApp-এ মেসেজটি <strong>Send</strong> করুন। আমরা দ্রুত ফোন করে কনফার্ম করব।</p>"
        : '<div class="no">' + esc(no) + "</div><p>মোট " + tk(last.total) + " · ক্যাশ অন ডেলিভারি<br>আমরা শীঘ্রই " + esc(last.phone || "আপনার নম্বরে") + " নম্বরে ফোন করে কনফার্ম করব।</p>") +
      '<div class="acts"><a class="btn" href="#/"><i class="bi bi-bag"></i> আরও শাড়ি দেখুন</a>' +
      (S.cfg.whatsapp && !wa ? '<a class="btn wa" target="_blank" rel="noopener" href="' + esc(waLink("আমার অর্ডার নম্বর " + no)) + '"><i class="bi bi-whatsapp"></i> WhatsApp</a>' : "") +
      "</div></div>";
  }

  // ---------- global events ----------
  $app.addEventListener("click", function (e) {
    var b = e.target.closest("[data-order]");
    if (!b) return;
    var p = product(+b.dataset.order);
    if (!p) return;
    if (p.variants.length === 1) { addToCart(p.variants[0].id, 1); location.hash = "#/checkout"; }
    else location.hash = "#/p/" + p.id;
  });

  document.getElementById("searchForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var q = document.getElementById("searchInput").value.trim();
    location.hash = q ? "#/search?q=" + encodeURIComponent(q) : "#/";
  });

  boot();
})();
