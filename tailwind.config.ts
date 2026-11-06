import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        axons: {
          blue: '#0052CC', blueDark: '#003A99', green: '#00A859', greenLight: '#E6F6EC',
          red: '#E53E3E', redLight: '#FED7D7', yellow: '#D69E2E', yellowLight: '#FEFCBF',
          grayBg: '#F8FAFC', slate: '#1E293B', slateMuted: '#64748B',
        },
      },
      fontFamily: { sans: ['Prompt', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
export default config;
