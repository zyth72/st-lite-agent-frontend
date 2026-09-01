/** 文本/密码/数字输入框(全局组件):v-model + class/事件透传。 */
import { defineComponent } from '../lib/vue.esm-browser.prod.js';
export default defineComponent({
  props: { modelValue: [String, Number], placeholder: String, type: { type: String, default: 'text' }, id: String },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return { onInput: (e) => emit('update:modelValue', e.target.value) };
  },
  template: `<input :type="type" :id="id" :value="modelValue" :placeholder="placeholder" @input="onInput" v-bind="$attrs">`,
});
