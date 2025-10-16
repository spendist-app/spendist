const daisyui = require('daisyui');
const daisyuiThemes = require('daisyui/src/colors/themes');

module.exports = {
  content: [
    './apps/web/src/**/*.{html,ts}',
    './apps/web/src/**/*.css',
  ],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        spendistLight: {
          ...daisyuiThemes['[data-theme=light]'],
          primary: '#0EA5A5',
          'primary-content': '#042f31',
          secondary: '#F59E0B',
          'secondary-content': '#422100',
          accent: '#EA580C',
          'accent-content': '#2a0a00',
          neutral: '#1f2933',
          'neutral-content': '#f9fafb',
          'base-100': '#FFFFFF',
          'base-200': '#FFFDFB',
          'base-300': '#F3F4F6',
          'base-content': '#111827',
          info: '#0EA5A5',
          success: '#16A34A',
          warning: '#D97706',
          error: '#DC2626',
        },
      },
      {
        spendistDark: {
          ...daisyuiThemes['[data-theme=dark]'],
          primary: '#2DD4BF',
          'primary-content': '#062824',
          secondary: '#FBBF24',
          'secondary-content': '#3f2a06',
          accent: '#FB923C',
          'accent-content': '#3c1400',
          neutral: '#2b3036',
          'neutral-content': '#E5E7EB',
          'base-100': '#161A1D',
          'base-200': '#111315',
          'base-300': '#0B0D0F',
          'base-content': '#E5E7EB',
          info: '#2DD4BF',
          success: '#16A34A',
          warning: '#FBBF24',
          error: '#DC2626',
        },
      },
    ],
    darkTheme: 'spendistDark',
  },
};
