/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,md,mdx,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        fg: "hsl(var(--fg))",
        muted: "hsl(var(--muted))",
        surface: "hsl(var(--surface))",
        border: "hsl(var(--border))",
        accent: "hsl(var(--accent))",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,.06)",
        cardHover: "0 4px 12px rgba(0,0,0,.08)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        serif: ["Source Serif 4", "Newsreader", "ui-serif", "Georgia"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"]
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: "hsl(var(--fg))",
            '[class~="lead"]': { color: "hsl(var(--fg))" },
            a: { color: "hsl(var(--accent))" },
            strong: { color: "hsl(var(--fg))" },
            "ol > li::marker": { color: "hsl(var(--fg))" },
            "ul > li::marker": { color: "hsl(var(--muted))" },
            hr: { borderColor: "hsl(var(--border))" },
            blockquote: {
              borderLeftColor: "hsl(var(--accent))",
              color: "hsl(var(--fg))",
            },
            h1: { color: "hsl(var(--fg))" },
            h2: { color: "hsl(var(--fg))" },
            h3: { color: "hsl(var(--fg))" },
            h4: { color: "hsl(var(--fg))" },
            code: { color: "hsl(var(--fg))" },
            "a code": { color: "hsl(var(--accent))" },
            pre: {
              color: "hsl(var(--fg))",
              backgroundColor: "hsl(var(--surface))",
              border: "1px solid hsl(var(--border))",
            },
          },
        },
      }),
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
