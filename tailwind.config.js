/** SINH TỰ ĐỘNG bởi scripts/gen-tailwind-config.cjs — theme "Linen & Earth Culinary Sanctuary".
 * Không sửa tay token; chạy lại script nếu Stitch đổi design system. */
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    "colors": {
      "surface": "#fdf9f4",
      "on-tertiary-fixed": "#1f221d",
      "surface-container": "#f1ede8",
      "surface-container-highest": "#e6e2dd",
      "primary-fixed-dim": "#bfd3c3",
      "on-tertiary-fixed-variant": "#4b463e",
      "on-background": "#1c1c19",
      "secondary-fixed-dim": "#ebc3ab",
      "tertiary-fixed-dim": "#ccc9c0",
      "surface-dim": "#ddd9d5",
      "surface-bright": "#fdf9f4",
      "on-primary-fixed": "#1e3326",
      "error-container": "#fde7e4",
      "on-secondary": "#ffffff",
      "inverse-on-surface": "#f2f0ea",
      "on-surface": "#2a2b27",
      "tertiary-container": "#454a43",
      "primary-container": "#4f6f58",
      "surface-container-low": "#f7f3ee",
      "inverse-surface": "#2f332d",
      "on-error": "#ffffff",
      "on-surface-variant": "#4b5048",
      "tertiary-fixed": "#e8e6df",
      "surface-tint": "#4a6a53",
      "outline": "#636a60",
      "secondary-fixed": "#f8e3d6",
      "outline-variant": "#cdd1c8",
      "surface-variant": "#e6e2dd",
      "on-error-container": "#8c1d18",
      "secondary": "#94532f",
      "on-tertiary": "#ffffff",
      "primary-fixed": "#dfeadf",
      "secondary-container": "#f2d2c0",
      "on-primary-container": "#f2f6f3",
      "primary": "#3d5c47",
      "on-tertiary-container": "#a7a096",
      "background": "#fdf9f4",
      "on-secondary-fixed": "#3f1f0f",
      "on-secondary-fixed-variant": "#7a4429",
      "on-primary-fixed-variant": "#3d5c47",
      "tertiary": "#2f342e",
      "surface-container-lowest": "#ffffff",
      "inverse-primary": "#bfd3c3",
      "on-primary": "#ffffff",
      "on-secondary-container": "#5c331c",
      "surface-container-high": "#ece7e3",
      "error": "#c62828",
      "success": "#2a7448",
      "success-container": "#e3f4ea",
      "warning": "#8a5a0b",
      "warning-container": "#fdf2d8",
      "info": "#245d9b",
      "info-container": "#e6f0fa"
    },
    "borderRadius": {
      "DEFAULT": "0.125rem",
      "lg": "0.25rem",
      "xl": "0.5rem",
      "full": "0.75rem"
    },
    "spacing": {
      "space-md": "1rem",
      "space-xl": "2.5rem",
      "space-sm": "0.5rem",
      "gutter-sm": "1rem",
      "space-xs": "0.25rem",
      "margin": "2rem",
      "gutter": "1.5rem",
      "margin-sm": "1rem",
      "space-lg": "1.5rem",
      "margin-mobile": "1.25rem",
      "space-2xl": "5rem",
      "gutter-mobile": "1rem"
    },
    "fontFamily": {
      "label-md": [
        "Work Sans",
        "sans-serif"
      ],
      "display": [
        "Merriweather",
        "serif"
      ],
      "headline-sm": [
        "Merriweather",
        "serif"
      ],
      "label-sm": [
        "Work Sans",
        "sans-serif"
      ],
      "headline-lg": [
        "Merriweather",
        "serif"
      ],
      "body-sm": [
        "Work Sans",
        "sans-serif"
      ],
      "body-lg": [
        "Work Sans",
        "sans-serif"
      ],
      "headline-lg-mobile": [
        "Merriweather",
        "serif"
      ],
      "headline-md": [
        "Merriweather",
        "serif"
      ],
      "body-md": [
        "Work Sans",
        "sans-serif"
      ],
      "label-lg": [
        "Work Sans",
        "sans-serif"
      ],
      "display-lg-mobile": [
        "Merriweather",
        "serif"
      ],
      "display-lg": [
        "Merriweather",
        "serif"
      ],
      "sans": [
        "Work Sans",
        "ui-sans-serif",
        "system-ui",
        "sans-serif"
      ],
      "serif": [
        "Merriweather",
        "ui-serif",
        "Georgia",
        "serif"
      ]
    },
    "fontSize": {
      "label-md": [
        "13px",
        {
          "lineHeight": "18px",
          "letterSpacing": "0.02em",
          "fontWeight": "600"
        }
      ],
      "display": [
        "40px",
        {
          "lineHeight": "52px",
          "letterSpacing": "-0.02em",
          "fontWeight": "400"
        }
      ],
      "headline-sm": [
        "18px",
        {
          "lineHeight": "26px",
          "fontWeight": "700"
        }
      ],
      "label-sm": [
        "12px",
        {
          "lineHeight": "16px",
          "letterSpacing": "0.04em",
          "fontWeight": "600"
        }
      ],
      "headline-lg": [
        "32px",
        {
          "lineHeight": "42px",
          "letterSpacing": "-0.015em",
          "fontWeight": "400"
        }
      ],
      "body-sm": [
        "13px",
        {
          "lineHeight": "20px",
          "fontWeight": "400"
        }
      ],
      "body-lg": [
        "18px",
        {
          "lineHeight": "28px",
          "fontWeight": "400"
        }
      ],
      "headline-lg-mobile": [
        "26px",
        {
          "lineHeight": "34px",
          "letterSpacing": "-0.01em",
          "fontWeight": "400"
        }
      ],
      "headline-md": [
        "22px",
        {
          "lineHeight": "30px",
          "letterSpacing": "-0.01em",
          "fontWeight": "400"
        }
      ],
      "body-md": [
        "15px",
        {
          "lineHeight": "24px",
          "fontWeight": "400"
        }
      ],
      "label-lg": [
        "14px",
        {
          "lineHeight": "18px",
          "letterSpacing": "0.06em",
          "fontWeight": "600"
        }
      ],
      "display-lg-mobile": [
        "38px",
        {
          "lineHeight": "44px",
          "letterSpacing": "-0.02em",
          "fontWeight": "700"
        }
      ],
      "display-lg": [
        "64px",
        {
          "lineHeight": "72px",
          "letterSpacing": "-0.03em",
          "fontWeight": "700"
        }
      ]
    }
  } },
  plugins: [],
};
