/* dialog.js — 无障碍弹窗/抽屉（焦点锁 + Esc + aria + 焦点归还）
   用法：openDialog(triggerEl, dialogEl)；dialogEl 需有 role="dialog" aria-modal="true"。
   若项目已用原生 <dialog>，优先用原生实现。 */
function openDialog(trigger, dialog) {
  var focusables = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  var lastFocused = trigger || document.activeElement;

  dialog.hidden = false;
  dialog.setAttribute('aria-modal', 'true');
  var first = dialog.querySelector(focusables);
  (first || dialog).focus();

  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    var nodes = Array.prototype.filter.call(dialog.querySelectorAll(focusables), function (n) {
      return n.offsetParent !== null;
    });
    if (!nodes.length) return;
    var firstNode = nodes[0], lastNode = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === firstNode) { e.preventDefault(); lastNode.focus(); }
    else if (!e.shiftKey && document.activeElement === lastNode) { e.preventDefault(); firstNode.focus(); }
  }

  function close() {
    dialog.hidden = true;
    document.removeEventListener('keydown', onKey);
    if (lastFocused && lastFocused.focus) lastFocused.focus();   // 焦点归还
  }

  document.addEventListener('keydown', onKey);
  dialog.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', close); });
  return { close: close };
}
