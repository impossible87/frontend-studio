/* reveal.js — 滚动揭示（一次触发 / 内容默认可见 / 尊重减弱动态）
   用法：需要揭示的元素加 data-reveal，同组元素可用 --reveal-index 控制递增。
   初始化后添加 js 标记；CSS 默认可见，脚本失败或等待触发都不隐藏内容。 */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function show(el) { el.classList.add('is-in'); }

  function init() {
    var items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;

    if (reduce.matches || !('IntersectionObserver' in window)) {
      items.forEach(show);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (!el.style.getPropertyValue('--reveal-index')) {
          el.style.setProperty('--reveal-index', String(Math.min(i, 5)));
        }
        show(el);
        io.unobserve(el);           // once：不再触发，避免来回闪
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (el) { io.observe(el); });
    document.documentElement.classList.add('js');

    // 文档退出时释放观察器；bfcache 恢复保留观察关系。
    window.addEventListener('pagehide', function (event) {
      if (!event.persisted) io.disconnect();
    });

    // 打印/导出 PDF 时不再等滚动
    window.addEventListener('beforeprint', function () { items.forEach(show); });

    // 字体/图片加载导致布局变化时，未揭示的元素重新检查一次
    window.addEventListener('load', function () {
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) show(el);
      });
    }, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
