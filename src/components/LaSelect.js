/** 下拉选择(全局组件):options + v-model,含空项(默认「继承外层」,可自定义文案)。 */
import { defineComponent } from '../lib/vue.esm-browser.prod.js';
export default defineComponent({
  props: { modelValue: String, options: Array, emptyLabel: { type: String, default: '(继承外层)' } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return { onChange: (e) => emit('update:modelValue', e.target.value) };
  },
  template: '<select :value="modelValue" @change="onChange" v-bind="$attrs"><option value="">{{ emptyLabel }}</option><option v-for="o in options" :value="o" :key="o">{{ o }}</option></select>',
});
