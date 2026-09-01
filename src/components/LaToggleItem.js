/** checkbox + 文字标签(全局组件):v-model 布尔。 */
import { defineComponent } from '../lib/vue.esm-browser.prod.js';
export default defineComponent({
  props: { modelValue: Boolean, label: String },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return { onChange: (e) => emit('update:modelValue', e.target.checked) };
  },
  template: '<label class="la-set-toggle-item"><input type="checkbox" :checked="modelValue" @change="onChange" v-bind="$attrs"><span>{{ label }}</span></label>',
});
