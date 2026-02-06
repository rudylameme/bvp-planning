/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Couleurs Mousquetaires officielles
        'mousquetaires-rouge': '#ED1C24',
        'mousquetaires-bordeaux': '#8B1538',
        'mousquetaires-beige': '#F5F2ED',
        'mousquetaires-beige-dark': '#E8E1D5',
        'mousquetaires-gris': '#58595B',
        'mousquetaires-gris-clair': '#D1D3D4',
        // Alias courts (utilisés dans le code)
        'mousq-red': '#ED1C24',
        'mousq-red-dark': '#8B1538',
        'mousq-red-light': '#FF4D4D',
        'mousq-beige': '#E8E1D5',
        'mousq-beige-light': '#F5F2ED',
        'mousq-gray': '#D1D3D4',
        'mousq-gray-dark': '#58595B',
      },
    },
  },
  plugins: [],
}
