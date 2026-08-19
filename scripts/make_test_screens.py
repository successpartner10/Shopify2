#!/usr/bin/env python3
"""Rasterize 4 fake Shopify admin screenshots for Storescope upload tests."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path("/home/user/samples/screenshots")
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1440, 900
NAV = 240
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SANSB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size, bold=False):
    return ImageFont.truetype(SANSB if bold else SANS, size)


def rr(d, box, r, fill, outline=None):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline)


def chrome(kind, title):
    img = Image.new("RGB", (W, H), "#f1f1f1")
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, NAV, H), fill="#1a1a1a")
    d.text((28, 28), "S   mystore", font=font(20, True), fill="#95bf47")
    items = [
        ("Home", False),
        ("Orders", False),
        ("Products", False),
        ("Customers", False),
        ("Finance", kind == "payments"),
        ("Settings", kind in ("payments", "shipping")),
        ("Online Store", kind == "theme"),
    ]
    y = 88
    for label, on in items:
        if on:
            d.rectangle((12, y - 10, NAV - 12, y + 22), fill="#303030")
        d.text((28, y), label, font=font(16, on), fill="#ffffff" if on else "#d2d5d9")
        y += 36
    d.rectangle((NAV, 0, W, 64), fill="#ffffff")
    d.line((NAV, 64, W, 64), fill="#e1e3e5")
    d.text((NAV + 28, 20), title, font=font(20, True), fill="#202223")
    return img, d


def save(img, name):
    path = OUT / name
    img.save(path, "PNG", optimize=True)
    print(path, img.size)


def payout_hold():
    img, d = chrome("payments", "Settings  /  Payments")
    rr(d, (NAV + 24, 84, W - 24, 168), 10, "#fff5d7", "#e1b878")
    d.text((NAV + 44, 98), "Your payouts are temporarily on hold", font=font(20, True), fill="#5c4300")
    d.text((NAV + 44, 130), "We need more information to verify your account. Check the store owner's email.", font=font(15), fill="#5c4300")
    rr(d, (NAV + 24, 188, W - 24, H - 24), 12, "#ffffff")
    d.text((NAV + 48, 216), "Shopify Payments", font=font(24, True), fill="#202223")
    rr(d, (NAV + 48, 264, NAV + 280, 308), 8, "#008060")
    d.text((NAV + 68, 276), "Complete account setup", font=font(15, True), fill="#ffffff")
    d.text((NAV + 48, 340), "Bank account     •••• 4421     Needs attention", font=font(16), fill="#6d7175")
    d.text((NAV + 48, 380), "Next payout     $1,284.60     On hold", font=font(18, True), fill="#202223")
    d.text((NAV + 48, 430), "Recent payouts", font=font(15, True), fill="#202223")
    d.text((NAV + 48, 466), "Jul 30     $942.18     Paid", font=font(15), fill="#6d7175")
    d.text((NAV + 48, 498), "Jul 23     $1,104.02     Paid", font=font(15), fill="#6d7175")
    save(img, "01-payouts-on-hold.png")


def no_provider():
    img, d = chrome("payments", "Settings  /  Payments")
    rr(d, (NAV + 24, 84, W - 24, 176), 10, "#fbeae5", "#e0b3a3")
    d.text((NAV + 44, 100), "This store is currently unable to accept payments", font=font(20, True), fill="#7a1f12")
    d.text((NAV + 44, 134), "Activate Shopify Payments or choose a third-party provider so customers can check out.", font=font(15), fill="#7a1f12")
    rr(d, (NAV + 24, 196, W - 24, H - 24), 12, "#ffffff")
    d.text((NAV + 48, 224), "Payment providers", font=font(24, True), fill="#202223")
    d.text((NAV + 48, 280), "Shopify Payments     Available in Canada", font=font(16), fill="#202223")
    rr(d, (NAV + 48, 316, NAV + 280, 360), 8, "#008060")
    d.text((NAV + 68, 328), "Complete account setup", font=font(15, True), fill="#ffffff")
    d.text((NAV + 48, 400), "Third-party providers", font=font(16, True), fill="#202223")
    d.text((NAV + 48, 436), "Choose third-party provider", font=font(15), fill="#6d7175")
    d.text((NAV + 48, 476), "PayPal     Not connected", font=font(15), fill="#6d7175")
    d.text((NAV + 48, 516), "Test mode     Off", font=font(15), fill="#6d7175")
    save(img, "02-unable-to-accept-payments.png")


def no_shipping():
    img, d = chrome("shipping", "Settings  /  Shipping and delivery")
    rr(d, (NAV + 24, 84, W - 24, 168), 10, "#fbeae5", "#e0b3a3")
    d.text((NAV + 44, 98), "There are no shipping rates available for this address", font=font(20, True), fill="#7a1f12")
    d.text((NAV + 44, 132), "Checkout test     Toronto ON Canada", font=font(15), fill="#7a1f12")
    rr(d, (NAV + 24, 188, W - 24, H - 24), 12, "#ffffff")
    d.text((NAV + 48, 216), "General profile", font=font(24, True), fill="#202223")
    d.text((NAV + 48, 268), "Zones", font=font(16, True), fill="#202223")
    d.text((NAV + 48, 308), "Domestic     Canada", font=font(15), fill="#6d7175")
    d.text((NAV + 48, 344), "United States     Not in any zone", font=font(15), fill="#bf0711")
    d.text((NAV + 48, 380), "Rest of world     No rates", font=font(15), fill="#bf0711")
    rr(d, (NAV + 48, 420, NAV + 160, 460), 8, "#008060")
    d.text((NAV + 70, 432), "Add rate", font=font(15, True), fill="#ffffff")
    d.text((NAV + 48, 500), "Carrier-calculated rates     Canada Post     Account disconnected", font=font(15), fill="#916a00")
    d.text((NAV + 48, 540), "Local delivery     Off          Local pickup     Off", font=font(15), fill="#6d7175")
    save(img, "03-no-shipping-rates.png")


def theme_errors():
    img, d = chrome("theme", "Online Store  /  Themes")
    rr(d, (NAV + 24, 84, W - 24, 156), 10, "#fbeae5", "#e0b3a3")
    d.text((NAV + 44, 108), "Theme has 3 errors", font=font(20, True), fill="#7a1f12")
    rr(d, (NAV + 24, 176, W - 24, H - 24), 12, "#ffffff")
    d.text((NAV + 48, 208), "Current theme     Horizon", font=font(24, True), fill="#202223")
    d.text((NAV + 48, 268), "Liquid syntax error in sections/header.liquid", font=font(16), fill="#bf0711")
    d.text((NAV + 48, 308), "Failed to save theme     Unexpected character", font=font(16), fill="#bf0711")
    d.text((NAV + 48, 348), "Online store editor cannot preview this section", font=font(16), fill="#6d7175")
    rr(d, (NAV + 48, 400, NAV + 180, 444), 8, "#008060")
    d.text((NAV + 78, 412), "Edit code", font=font(15, True), fill="#ffffff")
    rr(d, (NAV + 196, 400, NAV + 340, 444), 8, "#202223")
    d.text((NAV + 220, 412), "Customize", font=font(15, True), fill="#ffffff")
    save(img, "04-theme-has-errors.png")


if __name__ == "__main__":
    payout_hold()
    no_provider()
    no_shipping()
    theme_errors()
