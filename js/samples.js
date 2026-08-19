export const SAMPLES = [
  {
    id: "payout-hold",
    title: "Payouts on hold",
    blurb: "Yellow Payments banner — forums + official holds doc",
    image: "./samples/payout-hold.svg",
    text: `Shopify admin
Home  Orders  Products  Customers  Analytics  Marketing  Discounts  Content  Markets  Finance
Settings  Payments
Shopify Payments
Your payouts are temporarily on hold
We need more information to verify your account. Check the store owner's email or finish identity verification.
View payouts    Complete account setup
Payout schedule  Daily
Bank account  •••• 4421  Needs attention
Next payout  $1,284.60  On hold
Recent payouts
Jul 30  $942.18  Paid
Jul 23  $1,104.02  Paid`
  },
  {
    id: "no-shipping",
    title: "No shipping methods",
    blurb: "Checkout empty rates — zones + carrier disconnect",
    image: "./samples/no-shipping.svg",
    text: `Shopify admin
Settings  Shipping and delivery
Shipping
General profile
Manage rates
There are no shipping rates available for this address
Checkout test  Toronto ON Canada
Zones
Domestic  Canada
United States  Not in any zone
Rest of world  No rates
Add rate
Carrier-calculated rates  Canada Post  Account disconnected
Local delivery  Off
Local pickup  Off`
  },
  {
    id: "no-provider",
    title: "Can't accept payments",
    blurb: "Official banner: no primary provider",
    image: "./samples/no-provider.svg",
    text: `Shopify admin
Settings  Payments
Payment providers
This store is currently unable to accept payments
Activate Shopify Payments or choose a third-party provider so customers can check out.
Shopify Payments  Available in Canada
Complete account setup
Third-party providers
Choose third-party provider
PayPal  Not connected
Manual payment methods  None
Test mode  Off`
  },
  {
    id: "theme-errors",
    title: "Theme has errors",
    blurb: "Liquid compile banner — duplicate first",
    image: "./samples/theme-errors.svg",
    text: `Shopify admin
Online Store  Themes
Current theme  Horizon
Theme has 3 errors
Liquid syntax error in sections/header.liquid
Failed to save theme  Unexpected character
Online store editor cannot preview this section
Customize    Edit code    Actions`
  },
  {
    id: "test-mode",
    title: "Test mode still on",
    blurb: "Forum classic: banner off, Manage still on",
    image: "./samples/test-mode.svg",
    text: `Shopify admin
Settings  Payments
Shopify Payments
Test mode is on
Customers cannot complete real checkouts. Manage → uncheck Test mode and save.
Your payment gateway was in test mode when this order was created
Manage
Test mode  On
Live API keys  Not saved`
  },
  {
    id: "toast-declined",
    title: "Card declined toast",
    blurb: "Red toast + timeline decline code",
    image: "./samples/toast-declined.svg",
    text: `Shopify admin
Orders  #1042
Payment pending
Timeline
Payment declined
Your card was declined. Your request was in test mode, but used a non test card
Capture payment
Toast  Card declined`
  },
  {
    id: "app-conflict",
    title: "App embed conflict",
    blurb: "Theme switch leftover + outdated checkout app",
    image: "./samples/app-conflict.svg",
    text: `Shopify admin
Online Store  Themes  Customize
App embeds
Checkout customization may conflict
Theme app extension failed
Outdated app  Update this app
App embed is causing errors in header
Doesn't support checkout extensibility`
  },
  {
    id: "inventory-toast",
    title: "Insufficient inventory",
    blurb: "Red fulfill toast — location available",
    image: "./samples/inventory-toast.svg",
    text: `Shopify admin
Orders  Fulfill items
Can't fulfill
Insufficient inventory at this location
Available  0   On hand  4   Committed  4
Warehouse  Toronto
Fulfill
Toast  Not enough inventory`
  }
];
