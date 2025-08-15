module.exports = {
    plugins: {
        '@tailwindcss/postcss': {
            base: false, // Disable base styles to avoid conflicts with Angular Material
        },
        autoprefixer: {},
    },
};