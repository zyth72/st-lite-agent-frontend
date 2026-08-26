/**
 * VueUse 同名小实现(无构建、零额外依赖;API 与 @vueuse/core 一致,以后可无缝替换)。
 */
import { ref, watch, onMounted, onUnmounted } from './vue.esm-browser.prod.js';

export function useLocalStorage(key, def) {
  let init = def;
  try { const raw = localStorage.getItem(key); if (raw != null) init = JSON.parse(raw); } catch (e) {}
  const v = ref(init);
  watch(v, (val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }, { deep: true });
  return v;
}

export function useToggle(defaultValue) {
  const v = ref(!!defaultValue);
  const toggle = () => { v.value = !v.value; };
  return [v, toggle];
}

export function useEventListener(target, type, handler, opts) {
  let el = target;
  if (typeof el === 'string') el = document.querySelector(el);
  if (el && el.$el) el = el.$el;
  onMounted(() => el && el.addEventListener(type, handler, opts));
  onUnmounted(() => el && el.removeEventListener(type, handler, opts));
}
