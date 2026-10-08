/* counter.js — 数字滚动（tabular-nums / 尊重减弱动态 / 视口内触发）
   用法：<span data-count="128" data-suffix="+"></span> */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var els = document.querySelectorAll('[data-count]');
  if (!els.length) return;

  function format(n, decimals) { return n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function run(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var decimals = (el.getAttribute('data-decimals') | 0) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduce.matches) { el.textContent = format(target, decimals) + suffix; return; }
    var start = performance.now(), dur = 900;
    function tick(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);                 // easeOutCubic
      el.textContent = format(target * eased, decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.4 });
  els.forEach(function (el) { io.observe(el); });
})();
