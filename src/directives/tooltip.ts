import tippy, { type Props, type Placement, type Instance } from 'tippy.js'
import 'tippy.js/dist/tippy.css' // Standard Tippy CSS

interface TooltipBindingValue extends Partial<Props> {
  content?: string | number | HTMLElement; // Allow various content types
  // Add any other custom options you want to pass through
}

type TippyElement = HTMLElement & { _tippy?: Instance };

const defaultOptions: Partial<Props> = {
  animation: false,
  arrow: false,
  offset: [0, 8], // Adjusted offset slightly from original [5,5]
  // Default placement, can be overridden by binding
  placement: 'top', 
};

export const tooltipDirective = {
  mounted(el: TippyElement, binding: { value: string | TooltipBindingValue }) {
    let options: Partial<Props> = { ...defaultOptions };

    if (typeof binding.value === 'string') {
      options.content = binding.value;
    } else if (typeof binding.value === 'object' && binding.value !== null) {
      options = { ...options, ...binding.value };
    } else {
      // No content provided or invalid value, do not initialize
      return;
    }
    
    if (options.content === undefined || options.content === '' || options.content === null) {
        // Do not initialize if content is effectively empty
        return;
    }

    el._tippy = tippy(el, options);
  },

  updated(el: TippyElement, binding: { value: string | TooltipBindingValue }) {
    let newOptions: Partial<Props> = { ...defaultOptions };

    if (typeof binding.value === 'string') {
      newOptions.content = binding.value;
    } else if (typeof binding.value === 'object' && binding.value !== null) {
      newOptions = { ...newOptions, ...binding.value };
    } else {
      // If new value is invalid, destroy existing tooltip if any
      if (el._tippy) {
        el._tippy.destroy();
        el._tippy = undefined;
      }
      return;
    }
    
    if (newOptions.content === undefined || newOptions.content === '' || newOptions.content === null) {
        if (el._tippy) {
            el._tippy.destroy();
            el._tippy = undefined;
        }
        return;
    }

    if (el._tippy) {
      el._tippy.setProps(newOptions);
    } else {
      // If it didn't exist (e.g. content was initially empty), create it now
      el._tippy = tippy(el, newOptions);
    }
  },

  unmounted(el: TippyElement) {
    if (el._tippy) {
      el._tippy.destroy();
      el._tippy = undefined;
    }
  },
};

// Export the directive itself for registration
export default tooltipDirective;
