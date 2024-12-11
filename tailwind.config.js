/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}"],
  theme: {
    extend: {},
  },
  plugins: [  
     require('tailwindcss'),
    // require('autoprefixer'),
  ],
}


// npx tailwindcss -i ./public/styles.css -o ./public/output.css --watch
