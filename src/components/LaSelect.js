/** 下拉选择(全局组件):options + v-model,含 (继承外层) 空项。 */
import { defineComponent } from '../lib/vue.esm-browser.prod.js';
export default defineComponent({
  props: { modelValue: String, options: Array },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return { onChange: (e) => emit('update:modelValue', e.target.value) };
  },
  template: '<select :value="modelValue" @change="onChange" v-bind="$attrs"><option value="">(继承外层)</option><option v-for="o in options" :value="o" :key="o">{{ o }}</option></select>',
});
