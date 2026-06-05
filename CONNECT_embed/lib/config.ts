// Central configuration for the Scout Intelligence platform

// ── Stripe / GHL Payment Links ──────────────────────────────────────
// These links are generated from GoHighLevel (BlueJax subaccount)
// and route through Stripe for payment processing.
export const STRIPE_LINKS = {
    // Monthly Pro plan ($49/mo) — unlocks all sectors + verified emails
    PRO_MONTHLY: 'https://bluejax.ai/payment-link/scout-pro-monthly',
    // If a customer portal link is available for managing subscriptions:
    CUSTOMER_PORTAL: 'https://bluejax.ai/payment-link/scout-manage',
} as const;

// ── Platform Metadata ───────────────────────────────────────────────
export const PLATFORM = {
    name: 'Scout',
    tagline: 'Intelligence',
    proPriceDisplay: '$49/mo',
    proPriceValue: 49,
} as const;
