// Brand. Change these in one place (or via env) when the brand changes.
export const site = {
  name: 'Stylzo',
  tagline: 'Type once, get 5,600+ styles you can paste anywhere',
  defaultDescription:
    'Turn plain text into bold, cursive, gothic, bubble, glitch and hundreds of other styles. Plus symbols, emoji, kaomoji and text tools. Free, no sign-up, everything runs in your browser.',
  twitter: '',
  themeColor: '#4b2fe0',
  nav: [
    { href: '/', label: 'Generator' },
    { href: '/fonts', label: 'Font styles' },
    { href: '/studio', label: 'Studio' },
    { href: '/tools', label: 'Tools' },
    {
      href: '/symbols', label: 'Libraries',
      children: [
        { href: '/symbols', label: 'Symbols' },
        { href: '/emoji', label: 'Emoji' },
        { href: '/kaomoji', label: 'Kaomoji' },
      ],
    },
    { href: '/community', label: 'Community' },
    { href: '/about', label: 'About' },
  ],
};
