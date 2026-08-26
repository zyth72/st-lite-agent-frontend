/**
 * 轻量 DOM 构建工具:createElement + 属性 + 子节点。
 * 属性约定:html → innerHTML;text → textContent;on* → addEventListener;其余 → setAttribute。
 */
export function h(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
  }
  (children || []).forEach((c) => c && node.appendChild(c));
  return node;
}
