/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 亮色主题
        light: {
          bg: {
            primary: '#f8fafc',  // 浅灰背景
            secondary: '#ffffff' // 白色背景
          },
          text: {
            primary: '#1e293b',   // 深灰文本
            secondary: '#64748b'  // 中灰文本
          },
          border: '#e2e8f0',     // 浅灰边框
          hover: '#f1f5f9'       // 浅灰悬停
        },
        // 暗色主题
        dark: {
          bg: {
            primary: '#0f172a',   // 深蓝灰背景
            secondary: '#1e293b'  // 中蓝灰背景
          },
          text: {
            primary: '#f1f5f9',   // 浅灰文本
            secondary: '#94a3b8'  // 中灰文本
          },
          border: '#334155',      // 深灰边框
          hover: '#334155'        // 深灰悬停
        }
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      },
      animation: {
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        }
      }
    },
  },
  plugins: [],
} 