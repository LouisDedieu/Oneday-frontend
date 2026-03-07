/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Update this to include the paths to all files that contain Nativewind classes.
    content: ["./App.{tsx,jsx}", "./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./.rnstorybook/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            fontFamily: {
                // Main font - Righteous (for headings, buttons, emphasis)
                sans: ['DMSans'],
                righteous: ['Righteous'],
                // Secondary font - DM Sans (for body text)
                'dm-sans': ['DMSans'],
                'dm-sans-medium': ['DMSans-Medium'],
                'dm-sans-semibold': ['DMSans-SemiBold'],
                'dm-sans-bold': ['DMSans-Bold'],
            },
        },
    },
    plugins: [],
}