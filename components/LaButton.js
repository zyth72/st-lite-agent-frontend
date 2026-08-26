/** 按钮(全局组件):text + class/事件透传。 */
import { defineComponent } from '../lib/vue.esm-browser.prod.js';
export default defineComponent({
  props: { text: String },
  template: `<button v-bind="$attrs">{{ text }}</button>`,
});
