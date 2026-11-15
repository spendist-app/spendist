const fs = require('fs');

const daisyuiModule = require('daisyui');

const daisyuiPlugin = daisyuiModule?.default ?? daisyuiModule;

function readDaisyuiThemes() {
  try {
    const themesPath = require.resolve('daisyui/theme/object.js');

    const raw = fs
      .readFileSync(themesPath, 'utf8')
      .replace(/export default\s*/, '')
      .replace(/;?\s*$/, '');

    return JSON.parse(raw);
  } catch (error) {
    console.warn('Unable to load DaisyUI theme defaults:', error);

    return {};
  }
}

const daisyuiThemes = readDaisyuiThemes();

const lightDefaults = daisyuiThemes.light ?? {};

const darkDefaults = daisyuiThemes.dark ?? {};

/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{html,ts}', './src/**/*.css'],
  theme: {
    extend: {},
  },
  plugins: [daisyuiPlugin],
  daisyui: {
    themes: [
      {
        spendistLight: {
          ...lightDefaults,
          '--color-primary': '#0B7A7A',
          '--color-primary-content': '#FFFFFF',
          '--color-secondary': '#F59E0B',
          '--color-secondary-content': '#422100',
          '--color-accent': '#C2410C',
          '--color-accent-content': '#FFFFFF',
          '--color-neutral': '#1f2933',
          '--color-neutral-content': '#f9fafb',
          '--color-base-100': '#FFFFFF',
          '--color-base-200': '#FFFDFB',
          '--color-base-300': '#F3F4F6',
          '--color-base-content': '#111827',
          '--color-info': '#0B7A7A',
          '--color-info-content': '#FFFFFF',
          '--color-success': '#15803D',
          '--color-success-content': '#FFFFFF',
          '--color-warning': '#B45309',
          '--color-warning-content': '#FFFFFF',
          '--color-error': '#DC2626',
        },
      },
      {
        spendistDark: {
          ...darkDefaults,
          '--color-primary': '#2DD4BF',
          '--color-primary-content': '#062824',
          '--color-secondary': '#FBBF24',
          '--color-secondary-content': '#3f2a06',
          '--color-accent': '#FB923C',
          '--color-accent-content': '#3c1400',
          '--color-neutral': '#2b3036',
          '--color-neutral-content': '#E5E7EB',
          '--color-base-100': '#161A1D',
          '--color-base-200': '#111315',
          '--color-base-300': '#0B0D0F',
          '--color-base-content': '#E5E7EB',
          '--color-info': '#2DD4BF',
          '--color-success': '#4ADE80',
          '--color-success-content': '#052E16',
          '--color-warning': '#FBBF24',
          '--color-error': '#DC2626',
        },
      },
    ],
    darkTheme: 'spendistDark',
  },
};

module.exports = config;
