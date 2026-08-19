/** Tiny “tap here” crops for the six most-asked paths. */

export const POLAROIDS = {
  "error-payout-hold-banner": {
    image: "./samples/polaroids/payout-hold.svg",
    caption: "Tap Complete account setup"
  },
  "payments-payout-hold-001": {
    image: "./samples/polaroids/payout-hold.svg",
    caption: "Tap Complete account setup"
  },
  "error-no-shipping-rates": {
    image: "./samples/polaroids/shipping.svg",
    caption: "Tap Add rate"
  },
  "shipping-no-methods-001": {
    image: "./samples/polaroids/shipping.svg",
    caption: "Tap Add rate"
  },
  "error-test-mode-banner": {
    image: "./samples/polaroids/test-mode.svg",
    caption: "Uncheck Test mode, then Save"
  },
  "payments-test-mode-003": {
    image: "./samples/polaroids/test-mode.svg",
    caption: "Uncheck Test mode, then Save"
  },
  "general-shop-collective-016": {
    image: "./samples/polaroids/collective.svg",
    caption: "Open Collective in Sales channels"
  },
  "general-custom-liquid-018": {
    image: "./samples/polaroids/liquid.svg",
    caption: "Add section → Custom Liquid"
  },
  "general-head-tag-019": {
    image: "./samples/polaroids/edit-code.svg",
    caption: "⋯ → Edit code → theme.liquid"
  },
  "general-edit-theme-vs-code-017": {
    image: "./samples/polaroids/edit-code.svg",
    caption: "Customize vs ⋯ Edit code"
  }
};

export function polaroidFor(entry) {
  if (!entry) return null;
  return POLAROIDS[entry.id] || null;
}
