/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Update this to include the paths to all files that contain Nativewind classes.
    content: ["./App.{tsx,jsx}", "./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./.rnstorybook/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            // ── Colors ─────────────────────────────────────────────────────────
            colors: {
                // Background
                'bg-primary': '#1a1744',

                // Accent / Brand
                'accent': '#5248D4',
                'violet': '#5248D4',

                // Text colors
                'text-primary': '#FAFAFF',
                'text-secondary': 'rgba(255, 255, 255, 0.65)',
                'text-muted': 'rgba(255, 255, 255, 0.60)',
                'text-subtle': 'rgba(255, 255, 255, 0.30)',

                // Social / Links
                'social': '#8C92B5',

                // Borders / Dividers
                'divider': 'rgba(255, 255, 255, 0.20)',

                // Error
                'error': '#F87171',
                'error-bg': 'rgba(248, 113, 113, 0.15)',
                
                // Trip and City colors
                'trip': '#656E57',
                'city': '#336CA0',

                // Surfaces
                'surface-secondary': '#1e1a64',
            },

            // ── Font Families ──────────────────────────────────────────────────
            fontFamily: {
                // Main font - Righteous (for headings, buttons, emphasis)
                sans: ['DMSans'],
                righteous: ['Righteous'],
                // Secondary font - DM Sans (for body text)
                dmsans: ['DMSans'],
                'dmsans-medium': ['DMSans-Medium'],
                'dmsans-semibold': ['DMSans-SemiBold'],
                'dmsans-bold': ['DMSans-Bold'],
            },

            // ── Font Sizes ─────────────────────────────────────────────────────
            fontSize: {
                // Hero title (40px)
                'hero': ['40px', { lineHeight: '48px' }],
                // Section title (28px)
                'title': ['28px', { lineHeight: '34px' }],
                // Subtitle / body (16px)
                'body': ['16px', { lineHeight: '22px' }],
                // Small text (14px)
                'small': ['14px', { lineHeight: '20px' }],
                // Extra small (12px)
                'tiny': ['12px', { lineHeight: '16px' }],
                // Micro text (10px)
                'micro': ['10px', { lineHeight: '14px' }],
            },

            // ── Spacing ────────────────────────────────────────────────────────
            spacing: {
                '4.5': '18px',
                '15': '60px',
                '30': '120px',
            },

            // ── Border Radius ──────────────────────────────────────────────────
            borderRadius: {
                'card': '12px',
                'button': '14px',
                'input': '14px',
            },
        },
    },
    plugins: [],
}