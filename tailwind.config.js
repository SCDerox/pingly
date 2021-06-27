module.exports = {
    purge: {
        enabled: false,
        content: ['./views/**/*.ejs'],
    },
    theme: {
        linearGradientColors: theme => theme('colors'),
        radialGradientColors: theme => theme('colors'),
        conicGradientColors: theme => theme('colors')
    },
    darkMode: 'class',
    variants: {
        animation: ['responsive', 'hover', 'focus'],
        borderRadius: ['responsive', 'hover', 'focus']
    },
    plugins: [
        require('tailwindcss-gradients'),
        require('@tailwindcss/forms'),
        require('tailwind-scrollbar-hide')
    ]
};