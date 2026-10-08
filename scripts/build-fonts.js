// Generates data/fonts.json: hand-curated presets + composed styles (alphabet x effect, alphabet x frame, ...).
// Every record stores a resolved pipeline and an `example` produced by the real engine (verified by tests).
// Target: 5000+ distinct, usable styles across every category.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { applyStyle } from '../services/unicode/engine.js';

const SAMPLE = 'Stylzo';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Curated base alphabets: slug, display name, category, extra tags, what it is / caveat (unique copy per page).
const BASES = [
  ['bold', 'Bold', 'bold', ['math', 'strong'], 'Heavy Mathematical Bold letters and digits. One of the most widely supported styles.', 'safe'],
  ['italic', 'Italic', 'italic', ['math', 'slanted'], 'Slanted Mathematical Italic letters. Digits are left unchanged because Unicode has no italic digits.', 'safe'],
  ['bold-italic', 'Bold Italic', 'italic', ['math', 'strong', 'slanted'], 'Bold and slanted at once, using Mathematical Bold Italic letters.', 'safe'],
  ['script', 'Cursive Script', 'cursive', ['cursive', 'handwriting'], 'Flowing script capitals and lowercase from the Mathematical Script block, with a few Letterlike Symbols filling its gaps.', 'good'],
  ['bold-script', 'Bold Cursive', 'cursive', ['cursive', 'bold'], 'A heavier cursive alphabet that stays readable at small sizes.', 'good'],
  ['fraktur', 'Old English', 'gothic', ['gothic', 'blackletter', 'fraktur'], 'Blackletter lettering in the style of medieval manuscripts and newspaper mastheads.', 'good'],
  ['bold-fraktur', 'Bold Gothic', 'gothic', ['gothic', 'blackletter', 'bold'], 'A bold blackletter alphabet with thicker strokes than classic Old English.', 'good'],
  ['double-struck', 'Double-Struck', 'outline', ['outline', 'hollow', 'blackboard'], 'Hollow, outlined letters used for number sets in mathematics, now popular for bios and names.', 'good'],
  ['sans', 'Sans-Serif', 'clean', ['sans', 'clean'], 'Clean sans-serif letters in the Mathematical block. Useful when you want a different weight of "plain".', 'safe'],
  ['sans-bold', 'Sans Bold', 'bold', ['sans', 'bold'], 'Bold sans-serif letters and digits; reads clearly on small screens.', 'safe'],
  ['sans-italic', 'Sans Italic', 'italic', ['sans', 'italic'], 'Slanted sans-serif letters with no digit substitutions.', 'safe'],
  ['sans-bold-italic', 'Sans Bold Italic', 'italic', ['sans', 'bold', 'italic'], 'Bold, slanted, sans-serif letters in one alphabet.', 'safe'],
  ['monospace', 'Monospace', 'clean', ['typewriter', 'code', 'mono'], 'Typewriter-style letters of equal width, in the Mathematical Monospace block.', 'safe'],
  ['fullwidth', 'Wide (Fullwidth)', 'wide', ['wide', 'vaporwave', 'aesthetic'], 'Fullwidth Latin letters, the same forms used in East Asian typesetting and vaporwave text.', 'safe'],
  ['circled', 'Bubble (Circled)', 'bubble', ['bubble', 'circle'], 'Letters inside circles. Digits 0 to 9 are circled as well.', 'good'],
  ['negative-circled', 'Filled Bubble', 'bubble', ['bubble', 'filled', 'circle'], 'Letters on filled black circles. Some systems draw these as emoji, so appearance varies.', 'limited'],
  ['squared', 'Squared', 'bubble', ['square', 'boxed'], 'Letters inside outlined squares. Support is patchy on older Android and Windows.', 'limited'],
  ['negative-squared', 'Filled Squared', 'bubble', ['square', 'filled'], 'Letters on filled black squares. May render as emoji-style tiles on some phones.', 'limited'],
  ['parenthesized', 'Parenthesized', 'bubble', ['parentheses', 'bracketed'], 'Letters wrapped in parentheses as single characters.', 'limited'],
  ['small-caps', 'Small Caps', 'small', ['small', 'caps', 'tiny'], 'Small capital letters. Looks the same for upper and lower case input.', 'good'],
  ['superscript', 'Superscript', 'small', ['tiny', 'superscript', 'raised'], 'Raised mini letters and digits. A few letters share a glyph across cases.', 'good'],
  ['subscript', 'Subscript', 'small', ['tiny', 'subscript', 'lowered'], 'Lowered mini characters. Unicode only covers some letters; the rest stay normal.', 'limited'],
];

// Line effects: slug, display name, what it does, marks (string or array), support.
const LINES = [
  ['underline', 'Underline', 'a single line under every letter', 'underline', 'safe'],
  ['double-underline', 'Double Underline', 'two lines under every letter', 'double-underline', 'safe'],
  ['overline', 'Overline', 'a line above every letter', 'overline', 'good'],
  ['strike', 'Strikethrough', 'a line through every letter', 'strike', 'good'],
  ['slash', 'Slash', 'a diagonal slash across every letter', 'slash', 'good'],
  ['wavy', 'Wavy', 'a tilde mark above every letter', 'wavy', 'good'],
  ['dotted', 'Dotted', 'a dot below every letter', 'dotted', 'good'],
  ['short-strike', 'Short Strikethrough', 'a short dash through the middle of every letter', 'short-strike', 'good'],
  ['short-slash', 'Short Slash', 'a short diagonal tick across every letter', 'short-slash', 'good'],
  ['tilde-under', 'Tilde Underline', 'a small wave below every letter', 'tilde-under', 'good'],
  ['tilde-strike', 'Tilde Strikethrough', 'a wavy line through every letter', 'tilde-strike', 'good'],
  ['bar-under', 'Bar Underline', 'a short bar below every letter', 'bar-under', 'good'],
  ['dot-above', 'Dot Above', 'a dot above every letter', 'dot-above', 'good'],
  ['double-dot-under', 'Double Dot Underline', 'two dots below every letter', 'double-dot-under', 'good'],
  ['arrow-under', 'Arrow Underline', 'a tiny arrow below every letter', 'arrow-under', 'limited'],
  ['triple-underline', 'Triple Underline', 'three stacked lines under every letter', ['double-underline', 'underline'], 'good'],
  ['strike-underline', 'Underlined Strikethrough', 'a line through and a line under every letter', ['strike', 'underline'], 'good'],
  ['overline-underline', 'Over and Underline', 'a line above and a line under every letter', ['overline', 'underline'], 'good'],
  ['overline-strike', 'Overlined Strikethrough', 'a line above and a line through every letter', ['overline', 'strike'], 'good'],
  ['wavy-under', 'Wavy Underline', 'a tilde above and a line under every letter', ['wavy', 'underline'], 'good'],
  ['dotted-underline', 'Dotted Underline', 'a dot below and a line under every letter', ['dotted', 'underline'], 'good'],
  ['slash-under', 'Slashed Underline', 'a diagonal slash and a line under every letter', ['slash', 'underline'], 'good'],
  ['bar-underline', 'Bar and Line Underline', 'a bar and a line under every letter', ['bar-under', 'underline'], 'good'],
  ['wavy-strike', 'Wavy Strikethrough', 'a tilde above and a line through every letter', ['wavy', 'strike'], 'good'],
  ['dotted-strike', 'Dotted Strikethrough', 'a dot below and a line through every letter', ['dotted', 'strike'], 'good'],
  ['crossed-out', 'Crossed Out', 'two crossing lines over every letter', ['strike', 'slash'], 'good'],
];

// Frames: slug, display name. Keys must exist in decorators.FRAMES.
const FRAME_LIST = [
  ['brackets', 'Brackets'], ['ornate', 'Ornate'], ['stars', 'Stars'], ['hearts', 'Hearts'],
  ['sparkles', 'Sparkles'], ['wings', 'Wings'], ['crown', 'Crown'], ['parens', 'Parentheses'],
  ['diamonds', 'Diamonds'], ['square', 'Square Brackets'], ['music', 'Music Notes'],
  ['flower', 'Flowers'], ['arrow', 'Arrows'], ['quotes', 'Quote Marks'],
];

// Letter separators: slug, display name, separator string (applied inside words).
const SEPS = [
  ['spaced', 'Spaced Out', ' '],
  ['dot-sep', 'Dot Joined', '\u00b7'],
  ['star-sep', 'Star Joined', '\u2606'],
  ['dash-sep', 'Dash Joined', '\u2013'],
  ['arrow-sep', 'Arrow Joined', '\u2192'],
  ['pipe-sep', 'Pipe Joined', '\u2758'],
  ['wave-sep', 'Wave Joined', '\u301c'],
  ['slash-sep', 'Slash Joined', '\u2044'],
];

const CAVEAT = {
  safe: 'Works in most apps, browsers and phones.',
  good: 'Works in most modern apps; very old fonts may show boxes.',
  limited: 'Support varies. Check your target app before relying on it.',
};

const styles = [];
const seenIds = new Set();
const add = (s) => {
  const rec = { isPopular: false, isActive: true, indexable: false, ...s };
  if (seenIds.has(rec.slug)) throw new Error(`Duplicate style slug: ${rec.slug}`);
  seenIds.add(rec.slug);
  rec.example = applyStyle(SAMPLE, rec);
  styles.push(rec);
};

// ---------------------------------------------------------------- base alphabets
BASES.forEach(([slug, name, category, tags, about, support], i) => {
  add({
    id: slug, slug, name, category, type: 'unicode-map', mapping: slug, tags,
    pipeline: [{ type: 'map', name: slug }], support, indexable: true, isPopular: i < 8,
    description: `${about} ${CAVEAT[support]}`,
  });
});

// ---------------------------------------------------------------- lines category (standalone line effects)
LINES.forEach(([key, name, what, marks, support], i) => {
  add({
    id: key, slug: key, name: `${name} Text`, category: 'lines', type: 'combine', marks, tags: ['lines', key],
    pipeline: [{ type: 'combine', marks }], support, indexable: true, isPopular: i === 0,
    description: `Adds ${what} using Unicode combining marks. Works on plain text, so it needs no special alphabet. ${CAVEAT[support]}`,
  });
});

// ---------------------------------------------------------------- flip and reverse
add({
  id: 'upside-down', slug: 'upside-down', name: 'Upside Down Text', category: 'flip', type: 'transform', tags: ['flip', 'upside-down'],
  pipeline: [{ type: 'map', name: 'upside-down' }, { type: 'fn', name: 'reverse' }], support: 'good', indexable: true, isPopular: true,
  description: 'Rotates each letter and reverses the order so the line reads upside down. Letters without a flipped form stay unchanged.',
});
add({
  id: 'backwards', slug: 'backwards', name: 'Backwards Text', category: 'flip', type: 'transform', tags: ['flip', 'reverse'],
  pipeline: [{ type: 'fn', name: 'reverse' }], support: 'safe', indexable: true,
  description: 'Reverses the order of characters while keeping emoji and accented letters intact.',
});
add({
  id: 'flipped-letters', slug: 'flipped-letters', name: 'Flipped Letters', category: 'flip', type: 'transform', tags: ['flip', 'upside-down'],
  pipeline: [{ type: 'map', name: 'upside-down' }], support: 'good', indexable: true,
  description: 'Turns every letter upside down without reordering the line, so it still reads left to right.',
});
add({
  id: 'backwards-words', slug: 'backwards-words', name: 'Backwards Words', category: 'flip', type: 'transform', tags: ['flip', 'reverse', 'words'],
  pipeline: [{ type: 'fn', name: 'reverse-words' }], support: 'safe', indexable: true,
  description: 'Reverses the letters inside every word while the words themselves stay in place, so the sentence keeps its shape.',
});
add({
  id: 'upside-down-words', slug: 'upside-down-words', name: 'Upside Down Words', category: 'flip', type: 'transform', tags: ['flip', 'upside-down', 'words'],
  pipeline: [{ type: 'map', name: 'upside-down' }, { type: 'fn', name: 'reverse-words' }], support: 'good', indexable: true,
  description: 'Flips each letter upside down and reverses every word in place: upside down text that still looks like separate words.',
});
for (const [slug, name] of BASES) {
  add({
    id: `${slug}-backwards`, slug: `${slug}-backwards`, name: `${name} Backwards`, category: 'flip', type: 'pipeline',
    tags: ['flip', 'reverse', slug], pipeline: [{ type: 'map', name: slug }, { type: 'fn', name: 'reverse' }],
    support: 'good', parent: slug, description: `${name} letters reversed so the whole line reads backwards.`,
  });
  add({
    id: `${slug}-reversed-words`, slug: `${slug}-reversed-words`, name: `${name} Reversed Words`, category: 'flip', type: 'pipeline',
    tags: ['flip', 'reverse', 'words', slug], pipeline: [{ type: 'map', name: slug }, { type: 'fn', name: 'reverse-words' }],
    support: 'good', parent: slug, description: `${name} letters with every word spelled backwards in place.`,
  });
}

// ---------------------------------------------------------------- glitch category (zalgo matrix + variants)
const ZALGO_LEVELS = [['low', 'Light'], ['medium', 'Medium'], ['high', 'Heavy'], ['extreme', 'Extreme']];
const ZALGO_POSITIONS = [
  ['', 'Full', { up: true, mid: true, down: true }],
  ['-up', 'Up Only', { up: true, mid: false, down: false }],
  ['-down', 'Down Only', { up: false, mid: false, down: true }],
  ['-sides', 'Top and Bottom', { up: true, mid: false, down: true }],
];
for (const [level, levelName] of ZALGO_LEVELS) {
  for (const [suffix, posName, positions] of ZALGO_POSITIONS) {
    const id = `zalgo-${level}${suffix}`;
    // medium/full and extreme/full are covered by the curated presets below.
    if (id === 'zalgo-medium' || id === 'zalgo-extreme') continue;
    add({
      id, slug: id, name: `${levelName} Zalgo ${posName}`.trim(), category: 'glitch', type: 'transform',
      tags: ['zalgo', 'glitch', 'creepy', level], pipeline: [{ type: 'zalgo', level, seed: id, positions }],
      support: 'limited', description: `${levelName} intensity stacked marks (${posName.toLowerCase()}) per letter for a predictable glitch effect.`,
    });
  }
}
add({
  id: 'zalgo-light', slug: 'zalgo-light', name: 'Light Zalgo', category: 'glitch', type: 'transform', tags: ['zalgo', 'glitch', 'creepy'],
  pipeline: [{ type: 'zalgo', level: 'low', seed: 'light' }], support: 'good', indexable: true, isPopular: true,
  description: 'A few stacked marks per letter for a gentle glitch effect. The result is the same every time for the same text.',
});
add({
  id: 'zalgo-heavy', slug: 'zalgo-heavy', name: 'Heavy Zalgo', category: 'glitch', type: 'transform', tags: ['zalgo', 'glitch', 'creepy'],
  pipeline: [{ type: 'zalgo', level: 'high', seed: 'heavy' }], support: 'limited', indexable: true,
  description: 'Many stacked marks per letter. It can overflow lines and is blocked by some sites; use it sparingly.',
});
add({
  id: 'zalgo-medium', slug: 'zalgo-medium', name: 'Medium Zalgo', category: 'glitch', type: 'transform', tags: ['zalgo', 'glitch', 'creepy'],
  pipeline: [{ type: 'zalgo', level: 'medium', seed: 'medium' }], support: 'limited', indexable: true,
  description: 'A middle-weight stack of marks: clearly corrupted, but still readable in short phrases.',
});
add({
  id: 'zalgo-extreme', slug: 'zalgo-extreme', name: 'Extreme Zalgo', category: 'glitch', type: 'transform', tags: ['zalgo', 'glitch', 'creepy', 'cursed'],
  pipeline: [{ type: 'zalgo', level: 'extreme', seed: 'extreme' }], support: 'limited', indexable: true,
  description: 'The maximum stack per letter. Output is tall, wide and deliberately hard to read.',
});
add({
  id: 'glitch-alternate', slug: 'glitch-alternate', name: 'Glitch Alternate', category: 'glitch', type: 'pipeline', tags: ['glitch', 'alternate', 'case'],
  pipeline: [{ type: 'fn', name: 'alternate' }, { type: 'combine', marks: 'strike' }], support: 'good', indexable: true,
  description: 'Alternates upper and lower case and strikes every letter through for a broken-terminal look.',
});
for (const [slug, name] of BASES.slice(0, 12)) {
  const id = `${slug}-zalgo`;
  add({
    id, slug: id, name: `${name} Zalgo`, category: 'glitch', type: 'pipeline', tags: ['zalgo', 'glitch', slug],
    pipeline: [{ type: 'map', name: slug }, { type: 'zalgo', level: 'medium', seed: id }],
    support: 'limited', parent: slug, description: `${name} letters with medium stacked glitch marks on top.`,
  });
}

// ---------------------------------------------------------------- decorated category
const FLAIR_SETS = [
  ['sparkle', 'Sparkle Sprinkle', ['\u2728', '\u2727', '\u22c6'], ['sparkle', 'cute', 'flair']],
  ['stars', 'Star Shower', ['\u2606', '\u2605', '\u2726'], ['stars', 'shine']],
  ['hearts', 'Heart Drops', ['\u2661', '\u2665', '\u2764'], ['hearts', 'love']],
  ['flowers', 'Flower Field', ['\u2740', '\u273f', '\u2741'], ['flowers', 'nature']],
  ['arrows', 'Arrow Accent', ['\u279c', '\u2192', '\u27a4'], ['arrows', 'point']],
  ['dots', 'Dot Trail', ['\u00b7', '\u2022', '\u25e6'], ['dots', 'minimal']],
  ['waves', 'Wave Drift', ['\u301c', '\u2248', '\u3030'], ['waves', 'water']],
  ['music', 'Music Notes', ['\u266a', '\u266b', '\u2669'], ['music', 'song']],
  ['math', 'Math Marks', ['\u00b1', '\u00d7', '\u221e'], ['math', 'geek']],
  ['weather', 'Weather Touch', ['\u2600', '\u2602', '\u2601'], ['weather', 'sky']],
  ['celestial', 'Celestial Dust', ['\u263d', '\u263e', '\u272a'], ['moon', 'night']],
  ['ocean', 'Ocean Ripple', ['\u224b', '\u2248', '\u224f'], ['ocean', 'calm']],
  ['magic', 'Magic Dust', ['\u272a', '\u2733', '\u2734'], ['magic', 'star']],
  ['blocks', 'Block Accents', ['\u25a0', '\u25a1', '\u25aa'], ['blocks', 'geometric']],
  ['currency', 'Money Marks', ['\u00a2', '\u00a3', '\u00a5'], ['money', 'price']],
  ['marks', 'Proof Marks', ['\u2020', '\u2021', '\u00b6'], ['marks', 'editorial']],
];
const DENSITIES = [['light', 'Light'], ['balanced', 'Balanced'], ['heavy', 'Heavy']];
for (const [key, setName, symbols, tags] of FLAIR_SETS) {
  add({
    id: `sparkle-${key}`, slug: `sparkle-${key}`, name: setName, category: 'decorated', type: 'pipeline',
    tags: [...tags, 'flair'], pipeline: [{ type: 'flair', symbols: symbols.join(''), density: 'balanced', seed: `flair-${key}` }],
    support: 'good', indexable: key === 'sparkle',
    description: `Scatters ${setName.toLowerCase()} symbols between words. The same input always gives the same layout.`,
  });
  for (const [density, densityName] of DENSITIES) {
    if (density === 'balanced') continue;
    const id = `sparkle-${key}-${density}`;
    add({
      id, slug: id, name: `${setName} (${densityName})`, category: 'decorated', type: 'pipeline',
      tags: [...tags, 'flair', density], pipeline: [{ type: 'flair', symbols: symbols.join(''), density, seed: `flair-${key}-${density}` }],
      support: 'good', parent: `sparkle-${key}`, description: `${densityName} density of ${setName.toLowerCase()} symbols between words.`,
    });
  }
}
for (const [key, fName] of FRAME_LIST) {
  const id = `${key}-frame`;
  add({
    id, slug: id, name: `${fName} Frame`, category: 'decorated', type: 'wrap', tags: ['frame', key, 'decorated'],
    pipeline: [{ type: 'frame', frame: key }], support: 'good', indexable: key === 'stars',
    description: `Wraps the whole line in a ${fName.toLowerCase()} frame made of Unicode symbols.`,
  });
}
add({
  id: 'alternating-case', slug: 'alternating-case', name: 'Alternating Case', category: 'decorated', type: 'transform',
  tags: ['case', 'alternate', 'silly'], pipeline: [{ type: 'fn', name: 'alternate' }], support: 'safe', indexable: true,
  description: 'Switches between upper and lower case letter by letter, the wRiTaLiKeLoOk popular in captions.',
});
add({
  id: 'all-caps', slug: 'all-caps', name: 'All Caps', category: 'decorated', type: 'transform',
  tags: ['case', 'upper', 'shout'], pipeline: [{ type: 'case', mode: 'upper' }], support: 'safe', indexable: true,
  description: 'Upper cases the whole line before anything else, for shouted headings and taglines.',
});
add({
  id: 'all-lowercase', slug: 'all-lowercase', name: 'All Lowercase', category: 'decorated', type: 'transform',
  tags: ['case', 'lower', 'soft'], pipeline: [{ type: 'case', mode: 'lower' }], support: 'safe', indexable: true,
  description: 'Lower cases everything for the quiet, all-lowercase aesthetic.',
});

// ---------------------------------------------------------------- symbols category (M3)
const SYMBOL_WRAPS = [
  ['star', 'Star Wrap', '\u2606 ', ' \u2606', ['stars', 'wrap']],
  ['heart', 'Heart Wrap', '\u2661 ', ' \u2661', ['hearts', 'wrap']],
  ['bullet', 'Bullet Wrap', '\u2022 ', ' \u2022', ['bullet', 'wrap']],
  ['sparkle', 'Sparkle Wrap', '\u2726 ', ' \u2726', ['sparkle', 'wrap']],
  ['arrow', 'Arrow Wrap', '\u279c ', '', ['arrow', 'wrap']],
  ['guillemet', 'Guillemet Wrap', '\u00bb ', ' \u00ab', ['quote', 'wrap']],
  ['music', 'Music Wrap', '\u266a ', ' \u266a', ['music', 'wrap']],
  ['flower', 'Flower Wrap', '\u2740 ', ' \u2740', ['flower', 'wrap']],
  ['crown', 'Crown Wrap', '\u265b ', ' \u265b', ['crown', 'wrap']],
  ['paw', 'Paw Wrap', '\u273e ', ' \u273e', ['paw', 'wrap']],
  ['check', 'Check Wrap', '\u2714 ', ' \u2714', ['check', 'wrap']],
  ['cross', 'Cross Wrap', '\u2718 ', ' \u2718', ['cross', 'wrap']],
  ['diamond', 'Diamond Wrap', '\u25c6 ', ' \u25c6', ['diamond', 'wrap']],
  ['dots', 'Dot Wrap', '\u2026 ', ' \u2026', ['dots', 'wrap']],
];
SYMBOL_WRAPS.forEach(([key, name, prefix, suffix, tags], i) => {
  const id = `symbol-${key}`;
  add({
    id, slug: id, name, category: 'symbols', type: 'pipeline', tags: [...tags, 'symbol'],
    pipeline: [{ type: 'frame', prefix, suffix }], support: 'safe', indexable: i < 8,
    description: `Wraps the line with ${name.replace(' Wrap', '').toLowerCase()} symbols so it stands out without changing the letters.`,
  });
});
for (const [key, name, sep] of SEPS) {
  const id = `symbol-join-${key}`;
  add({
    id, slug: id, name: `${name} (Plain)`, category: 'symbols', type: 'pipeline', tags: ['separator', key, 'symbol'],
    pipeline: [{ type: 'fn', name: 'separate', sep }], support: 'safe', indexable: key === 'spaced',
    description: `Joins the letters of each word with ${JSON.stringify(sep)} for airy, spaced-out plain text.`,
  });
}

// ---------------------------------------------------------------- emoji category (M3)
const EMOJI_SETS = [
  ['sparkle', 'Emoji Sparkles', '\u2728\u2b50\ud83c\udf1f'],
  ['hearts', 'Emoji Hearts', '\ud83d\udc96\u2764\ufe0f\u2764\ufe0f\ud83e\ude76'],
  ['stars', 'Emoji Stars', '\u2b50\ud83c\udf1f\ud83c\udf20'],
  ['nature', 'Emoji Nature', '\ud83c\udf3f\ud83c\udf43\ud83c\udf31'],
  ['food', 'Emoji Bites', '\ud83c\udf53\ud83c\udf51\ud83c\udf6f'],
  ['animals', 'Emoji Paws', '\ud83d\udc3e\ud83d\udc31\ud83e\udd8a'],
  ['party', 'Emoji Party', '\ud83c\udf89\ud83c\udf88\ud83c\udf8a'],
  ['fire', 'Emoji Fire', '\ud83d\udd25\ud83d\udd25\ud83e\uddca'],
  ['ocean', 'Emoji Waves', '\ud83c\udf0a\ud83d\udca7\ud83c\udf0a'],
  ['music', 'Emoji Beats', '\ud83c\udfb5\ud83c\udfb6\ud83d\udc95'],
  ['cute', 'Emoji Cute', '\ud83c\udf38\ud83c\udf3a\ud83c\udf35'],
  ['gaming', 'Emoji Gaming', '\ud83c\udfae\ud83c\udfbf\ud83c\uDF81'],
];
for (const [key, name, symbols] of EMOJI_SETS) {
  const id = `emoji-${key}`;
  add({
    id, slug: id, name, category: 'emoji', type: 'pipeline', tags: ['emoji', key, 'flair'],
    pipeline: [{ type: 'flair', symbols, density: 'balanced', seed: `emoji-${key}` }],
    support: 'good', indexable: key === 'sparkle',
    description: `Sprinkles ${name.replace('Emoji ', '').toLowerCase()} emoji between words as you type.`,
  });
  for (const [density, densityName] of DENSITIES) {
    if (density === 'balanced') continue;
    const did = `emoji-${key}-${density}`;
    add({
      id: did, slug: did, name: `${name} (${densityName})`, category: 'emoji', type: 'pipeline',
      tags: ['emoji', key, density], pipeline: [{ type: 'flair', symbols, density, seed: `emoji-${key}-${density}` }],
      support: 'good', parent: id, description: `${densityName} density of emoji between words.`,
    });
  }
}
const EMOJI_FRAMES = [
  ['blossom', 'Blossom Frame', '\ud83c\udf38 ', ' \ud83c\udf38'],
  ['star', 'Star Frame', '\u2b50 ', ' \u2b50'],
  ['heart', 'Heart Frame', '\ud83d\udc96 ', ' \ud83d\udc96'],
  ['sparkles', 'Sparkles Frame', '\u2728 ', ' \u2728'],
  ['fire', 'Fire Frame', '\ud83d\udd25 ', ' \ud83d\udd25'],
  ['party', 'Party Frame', '\ud83c\udf89 ', ' \ud83c\udf89'],
  ['ocean', 'Wave Frame', '\ud83c\udf0a ', ' \ud83c\udf0a'],
  ['paw', 'Paw Frame', '\ud83d\udc3e ', ' \ud83d\udc3e'],
  ['crown', 'Crown Frame', '\ud83d\udc51 ', ' \ud83d\udc51'],
  ['rocket', 'Rocket Frame', '\ud83d\ude80 ', ' \ud83d\ude80'],
  ['coffee', 'Coffee Frame', '\u2615 ', ' \u2615'],
  ['pizza', 'Pizza Frame', '\ud83c\udf55 ', ' \ud83c\udf55'],
];
EMOJI_FRAMES.forEach(([key, name, prefix, suffix], i) => {
  const id = `emoji-frame-${key}`;
  add({
    id, slug: id, name, category: 'emoji', type: 'pipeline', tags: ['emoji', 'frame', key],
    pipeline: [{ type: 'frame', prefix, suffix }], support: 'good', indexable: i < 6,
    description: `Frames the whole line with ${name.replace(' Frame', '').toLowerCase()} emoji while leaving the letters untouched.`,
  });
});

// ---------------------------------------------------------------- kaomoji category (M3)
const KAOMOJI_WRAPS = [
  ['flip', 'Table Flip Frame', '\u256f\u00b0\u25a1\u00b0\u256f\ufe35 ', ' \u2570\u00b0\u25a1\u00b0\u256f'],
  ['shrug', 'Shrug Frame', '\u00af\\_(\u30c4)_/\u00af ', ' \u00af\\_(\u30c4)_/\u00af'],
  ['happy', 'Happy Frame', '(\u1d3f\u2c7c\u1d3f) ', ' (\u1d3f\u2c7c\u1d3f)'],
  ['cat', 'Cat Frame', '(=^\u03c9\u005e=) ', ' (=^\u03c9\u005e=)'],
  ['heart', 'Kaomoji Heart Frame', '(\u2665\u0361\u203f\u2665) ', ' (\u2665\u0361\u203f\u2665)'],
  ['bear', 'Bear Frame', '\u0295\u2022\u0329\u2022\u0294 ', ' \u0295\u2022\u0329\u2022\u0294'],
  ['glow', 'Glitter Face', '\u30fd(\u00b4\u2022\u03c9\u2022`) ', ' (\u00b4\u03c9\u2022\u0301)'],
  ['dance', 'Dance Frame', '\u30ce(\u0361\u25d4\u0361\u00b4) ', ' (\u00b4\u25d4\u0361\u0301)\u30ce'],
  ['victory', 'Victory Frame', '(\u0ca5\u203a\u25cb\u203a) ', ' (\u0ca5\u2039\u25cb\u2039)'],
  ['wave', 'Wave Frame', '(\u00b4\u00bb\u00b4) ', ' (\u00b4\u2039\u00b4)'],
  ['sleepy', 'Sleepy Frame', '(-\u03c9-) ', ' (-\u03c9-)'],
  ['angry', 'Angry Frame', '(\u2569\u2022\u2299\u2022) ', ' (\u2569\u2022\u2299\u2022)'],
  ['star', 'Star Face', '(\u2734 \u00b4\u03c9\u2022`) ', ' (\u00b4\u2022\u03c9\u00b4 \u2734)'],
  ['sparkle', 'Sparkle Face', '(\uff61\u25d4\u203f\u25d4\uff61)\uff89\u2728 ', ' \u2728(\uff61\u25d4\u203f\u25d4\uff61)'],
];
KAOMOJI_WRAPS.forEach(([key, name, prefix, suffix], i) => {
  const id = `kaomoji-${key}`;
  add({
    id, slug: id, name, category: 'kaomoji', type: 'pipeline', tags: ['kaomoji', key, 'japanese'],
    pipeline: [{ type: 'frame', prefix, suffix }], support: 'safe', indexable: i < 5,
    description: `Puts a ${name.replace(' Frame', '').toLowerCase()} Japanese text face around your line without touching the letters.`,
  });
});

// ---------------------------------------------------------------- gaming category (M4)
const GAMING = [
  ['clan-tag', 'Clan Tag', [{ type: 'case', mode: 'upper' }, { type: 'map', name: 'monospace' }, { type: 'frame', prefix: '[', suffix: ']' }], ['gaming', 'clan', 'tag'], 'good'],
  ['gg-frame', 'GG Frame', [{ type: 'frame', prefix: '\u2694 ', suffix: ' \u2694' }], ['gaming', 'gg', 'frame'], 'good'],
  ['console', 'Console Tag', [{ type: 'case', mode: 'upper' }, { type: 'map', name: 'monospace' }], ['gaming', 'console', 'code'], 'safe'],
  ['shout-caps', 'Shout Caps', [{ type: 'case', mode: 'upper' }, { type: 'combine', marks: 'double-underline' }], ['gaming', 'shout', 'caps'], 'good'],
  ['respawn', 'Respawn Text', [{ type: 'map', name: 'sans-bold' }, { type: 'fn', name: 'separate', sep: ' ' }], ['gaming', 'respawn', 'spaced'], 'safe'],
  ['frag-line', 'Frag Line', [{ type: 'map', name: 'bold' }, { type: 'combine', marks: 'strike' }], ['gaming', 'frag', 'strike'], 'good'],
  ['boss-mode', 'Boss Mode', [{ type: 'map', name: 'fraktur' }, { type: 'frame', frame: 'ornate' }], ['gaming', 'boss', 'gothic'], 'good'],
  ['health-bar', 'Health Bar', [{ type: 'fn', name: 'separate', sep: '\u25ae' }, { type: 'frame', prefix: '\u258c', suffix: '\u2588' }], ['gaming', 'health', 'bar'], 'limited'],
  ['level-up', 'Level Up', [{ type: 'map', name: 'double-struck' }, { type: 'frame', prefix: '\u2b06 ', suffix: ' \u2b06' }], ['gaming', 'level', 'up'], 'good'],
  ['game-over', 'Game Over', [{ type: 'map', name: 'bold-fraktur' }, { type: 'combine', marks: 'strike' }], ['gaming', 'game-over', 'over'], 'good'],
  ['insert-coin', 'Insert Coin', [{ type: 'case', mode: 'upper' }, { type: 'map', name: 'circled' }], ['gaming', 'arcade', 'coin'], 'good'],
  ['power-up', 'Power Up', [{ type: 'map', name: 'sans-bold' }, { type: 'frame', frame: 'sparkles' }], ['gaming', 'power', 'boost'], 'good'],
  ['speedrun', 'Speedrun', [{ type: 'fn', name: 'separate', sep: '\u2013' }, { type: 'map', name: 'monospace' }], ['gaming', 'speedrun', 'time'], 'safe'],
  ['final-boss', 'Final Boss', [{ type: 'map', name: 'fraktur' }, { type: 'zalgo', level: 'low', seed: 'final-boss' }], ['gaming', 'boss', 'zalgo'], 'limited'],
  ['spawn-point', 'Spawn Point', [{ type: 'map', name: 'double-struck' }, { type: 'frame', prefix: '\u25ce ', suffix: ' \u25ce' }], ['gaming', 'spawn', 'marker'], 'good'],
  ['critical-hit', 'Critical Hit', [{ type: 'map', name: 'bold' }, { type: 'combine', marks: ['strike', 'underline'] }], ['gaming', 'critical', 'hit'], 'good'],
  ['afk', 'AFK Badge', [{ type: 'case', mode: 'upper' }, { type: 'map', name: 'squared' }], ['gaming', 'afk', 'badge'], 'limited'],
  ['loading', 'Loading Dots', [{ type: 'fn', name: 'separate', sep: '\u2022' }, { type: 'frame', prefix: '\u25b6 ', suffix: ' \u2026' }], ['gaming', 'loading', 'status'], 'good'],
  ['respawn-timer', 'Respawn Timer', [{ type: 'map', name: 'monospace' }, { type: 'frame', prefix: '\u23f1 ', suffix: ' \u23f1' }], ['gaming', 'timer', 'countdown'], 'good'],
  ['no-scope', 'No Scope', [{ type: 'fn', name: 'alternate' }, { type: 'frame', prefix: '\u25c9 ', suffix: ' \u25c9' }], ['gaming', 'noscope', 'aim'], 'good'],
  ['raid-night', 'Raid Night', [{ type: 'map', name: 'bold-fraktur' }, { type: 'frame', frame: 'stars' }], ['gaming', 'raid', 'night'], 'good'],
  ['gg-ez', 'GG EZ', [{ type: 'case', mode: 'upper' }, { type: 'map', name: 'bold' }, { type: 'frame', prefix: '\u2694 ', suffix: ' \u2694' }], ['gaming', 'gg', 'ez'], 'good'],
  ['lobby', 'Lobby Title', [{ type: 'map', name: 'sans-bold' }, { type: 'frame', frame: 'brackets' }], ['gaming', 'lobby', 'title'], 'good'],
  ['score-line', 'Score Line', [{ type: 'map', name: 'monospace' }, { type: 'fn', name: 'separate', sep: ' ' }, { type: 'frame', prefix: '\u2611 ', suffix: '' }], ['gaming', 'score', 'points'], 'safe'],
  ['guild-banner', 'Guild Banner', [{ type: 'map', name: 'fraktur' }, { type: 'frame', frame: 'wings' }], ['gaming', 'guild', 'banner'], 'good'],
  ['combo', 'Combo Breaker', [{ type: 'fn', name: 'alternate' }, { type: 'combine', marks: 'wavy' }], ['gaming', 'combo', 'break'], 'good'],
  ['victory-screen', 'Victory Screen', [{ type: 'case', mode: 'upper' }, { type: 'map', name: 'double-struck' }, { type: 'frame', frame: 'stars' }], ['gaming', 'victory', 'win'], 'good'],
  ['defeat-screen', 'Defeat Screen', [{ type: 'map', name: 'double-struck' }, { type: 'combine', marks: 'strike' }], ['gaming', 'defeat', 'lose'], 'good'],
  ['rank-badge', 'Rank Badge', [{ type: 'map', name: 'circled' }, { type: 'frame', prefix: '\u265b ', suffix: ' \u265b' }], ['gaming', 'rank', 'badge'], 'good'],
  ['ping-status', 'Ping Status', [{ type: 'map', name: 'monospace' }, { type: 'combine', marks: 'dot-above' }], ['gaming', 'ping', 'status'], 'good'],
];
GAMING.forEach(([slug, name, pipeline, tags, support], i) => {
  add({
    id: slug, slug, name, category: 'gaming', type: 'pipeline', tags: ['gaming', ...tags],
    pipeline, support, indexable: i < 8,
    description: `${name} styling built for game tags, Discord nicknames and lobby titles. ${CAVEAT[support]}`,
  });
});

// ---------------------------------------------------------------- social category (M4)
const SOCIAL = [
  ['bio-hearts', 'Bio Hearts', [{ type: 'frame', frame: 'hearts' }], ['bio', 'hearts'], 'safe'],
  ['profile-stars', 'Profile Stars', [{ type: 'frame', frame: 'stars' }], ['profile', 'stars'], 'safe'],
  ['story-title', 'Story Title', [{ type: 'map', name: 'bold-script' }], ['story', 'title'], 'good'],
  ['handle-wrap', 'Handle Wrap', [{ type: 'frame', frame: 'sparkles' }], ['handle', 'name'], 'good'],
  ['soft-bio', 'Soft Bio', [{ type: 'map', name: 'small-caps' }], ['bio', 'soft'], 'good'],
  ['aesthetic-wide', 'Aesthetic Wide', [{ type: 'map', name: 'fullwidth' }], ['aesthetic', 'wide'], 'safe'],
  ['caption-underline', 'Caption Underline', [{ type: 'map', name: 'sans-bold' }, { type: 'combine', marks: 'underline' }], ['caption', 'underline'], 'good'],
  ['cute-bubble', 'Cute Bubble', [{ type: 'map', name: 'circled' }], ['cute', 'bubble'], 'good'],
  ['feed-divider', 'Feed Divider', [{ type: 'fn', name: 'separate', sep: '\u2726' }], ['divider', 'feed'], 'good'],
  ['quote-frame', 'Quote Frame', [{ type: 'frame', frame: 'quotes' }], ['quote', 'frame'], 'safe'],
  ['username-flair', 'Username Flair', [{ type: 'map', name: 'sans-bold' }, { type: 'flair', symbols: '\u2728\u2727\u22c6', density: 'light', seed: 'username-flair' }], ['username', 'flair'], 'good'],
  ['announcement', 'Announcement', [{ type: 'case', mode: 'upper' }, { type: 'combine', marks: 'overline' }], ['announcement', 'shout'], 'good'],
  ['weekend', 'Weekend Post', [{ type: 'map', name: 'bold-script' }, { type: 'frame', frame: 'stars' }], ['weekend', 'post'], 'good'],
  ['gratitude', 'Gratitude Note', [{ type: 'map', name: 'script' }, { type: 'frame', frame: 'hearts' }], ['note', 'thanks'], 'good'],
  ['minimal-bio', 'Minimal Bio', [{ type: 'map', name: 'sans' }, { type: 'fn', name: 'separate', sep: ' ' }], ['bio', 'minimal'], 'safe'],
  ['hype-post', 'Hype Post', [{ type: 'case', mode: 'upper' }, { type: 'map', name: 'sans-bold' }, { type: 'combine', marks: 'double-underline' }], ['hype', 'shout'], 'good'],
  ['night-mood', 'Night Mood', [{ type: 'map', name: 'fraktur' }, { type: 'flair', symbols: '\u263d\u272a\u2606', density: 'light', seed: 'night-mood' }], ['night', 'mood'], 'good'],
  ['mirror-selfie', 'Mirror Caption', [{ type: 'fn', name: 'alternate' }], ['caption', 'mirror'], 'safe'],
  ['repost-tag', 'Repost Tag', [{ type: 'frame', prefix: '\u21ba ', suffix: ' \u21ba' }, { type: 'map', name: 'sans-bold' }], ['repost', 'tag'], 'good'],
  ['countdown', 'Countdown', [{ type: 'map', name: 'monospace' }, { type: 'frame', prefix: '\u23f3 ', suffix: '' }], ['countdown', 'event'], 'good'],
  ['poll-question', 'Poll Question', [{ type: 'map', name: 'sans-bold' }, { type: 'frame', prefix: '\u2754 ', suffix: '' }], ['poll', 'question'], 'good'],
  ['shoutout', 'Shoutout', [{ type: 'case', mode: 'upper' }, { type: 'frame', frame: 'arrow' }], ['shoutout', 'mention'], 'good'],
  ['diary-entry', 'Diary Entry', [{ type: 'map', name: 'script' }, { type: 'combine', marks: 'dotted' }], ['diary', 'entry'], 'good'],
  ['sale-banner', 'Sale Banner', [{ type: 'case', mode: 'upper' }, { type: 'map', name: 'squared' }], ['sale', 'banner'], 'limited'],
  ['community-name', 'Community Name', [{ type: 'map', name: 'double-struck' }, { type: 'frame', frame: 'brackets' }], ['community', 'name'], 'good'],
  ['poll-results', 'Poll Results', [{ type: 'map', name: 'monospace' }, { type: 'combine', marks: 'overline' }], ['results', 'stats'], 'good'],
  ['mood-ring', 'Mood Ring', [{ type: 'frame', frame: 'diamonds' }, { type: 'flair', symbols: '\u2661\u2665\u2764', density: 'light', seed: 'mood-ring' }], ['mood', 'ring'], 'good'],
  ['close-friends', 'Close Friends', [{ type: 'map', name: 'small-caps' }, { type: 'frame', frame: 'hearts' }], ['friends', 'close'], 'good'],
  ['intro-post', 'Intro Post', [{ type: 'map', name: 'bold' }, { type: 'frame', frame: 'sparkles' }], ['intro', 'welcome'], 'good'],
];
SOCIAL.forEach(([slug, name, pipeline, tags, support], i) => {
  add({
    id: slug, slug, name, category: 'social', type: 'pipeline', tags: ['social', ...tags],
    pipeline, support, indexable: i < 8,
    description: `${name} styling for bios, captions and profile text on Instagram, TikTok and X. ${CAVEAT[support]}`,
  });
});

// ---------------------------------------------------------------- composed combinations (the volume)
const LINE_SUBSET = LINES.slice(0, 12).map(([key]) => key);
const FRAME_SUBSET = FRAME_LIST.slice(0, 8).map(([key]) => key);
const LINE_SUBSET_SM = LINES.slice(0, 6).map(([key]) => key);
const FRAME_SUBSET_SM = FRAME_LIST.filter(([k]) => ['brackets', 'stars', 'hearts', 'sparkles', 'diamonds', 'quotes'].includes(k)).map(([k]) => k);
const lineMeta = new Map(LINES.map(([key, name, what, marks, support]) => [key, { name, what, marks, support }]));
const frameMeta = new Map(FRAME_LIST);
const sepMeta = new Map(SEPS.map(([key, name, sep]) => [key, { name, sep }]));
const baseMeta = new Map(BASES.map(([slug, name, category, tags, , support]) => [slug, { name, category, tags, support }]));

const compose = (id, name, category, tags, pipeline, support, parent, description) => {
  add({ id, slug: id, name, category, type: 'pipeline', tags, pipeline, support, parent, description });
};

// alphabet x line
for (const [slug] of BASES) {
  const b = baseMeta.get(slug);
  for (const [key] of LINES) {
    const l = lineMeta.get(key);
    compose(`${slug}-${key}`, `${b.name} ${l.name}`, b.category, [...b.tags, key],
      [{ type: 'map', name: slug }, { type: 'combine', marks: l.marks }],
      b.support === 'safe' ? 'good' : b.support, slug, `${b.name} letters combined with the ${l.name.toLowerCase()} effect.`);
  }
}
// alphabet x frame
for (const [slug] of BASES) {
  const b = baseMeta.get(slug);
  for (const [key, fName] of FRAME_LIST) {
    compose(`${slug}-${key}`, `${b.name} with ${fName}`, b.category, [...b.tags, 'frame', key],
      [{ type: 'map', name: slug }, { type: 'frame', frame: key }],
      b.support === 'safe' ? 'good' : b.support, slug, `${b.name} letters wrapped in a ${fName.toLowerCase()} frame.`);
  }
}
// alphabet x separator
for (const [slug] of BASES) {
  const b = baseMeta.get(slug);
  for (const [key, sName, sep] of SEPS) {
    compose(`${slug}-${key}`, `${b.name} ${sName}`, b.category, [...b.tags, 'separator', key],
      [{ type: 'map', name: slug }, { type: 'fn', name: 'separate', sep }],
      'good', slug, `${b.name} letters joined with ${JSON.stringify(sep)} for a ${sName.toLowerCase()} look.`);
  }
}
// alphabet x line x frame
for (const [slug] of BASES) {
  const b = baseMeta.get(slug);
  for (const key of LINE_SUBSET) {
    const l = lineMeta.get(key);
    for (const [fk, fName] of FRAME_SUBSET.map((k) => [k, frameMeta.get(k)])) {
      const id = `${slug}-${key}-in-${fk}`;
      compose(id, `${b.name} ${l.name} in ${fName}`, b.category, [...b.tags, key, 'frame', fk],
        [{ type: 'map', name: slug }, { type: 'combine', marks: l.marks }, { type: 'frame', frame: fk }],
        b.support === 'safe' ? 'good' : b.support, slug,
        `${b.name} letters with the ${l.name.toLowerCase()} effect inside a ${fName.toLowerCase()} frame.`);
    }
  }
}
// alphabet x separator x line
for (const [slug] of BASES) {
  const b = baseMeta.get(slug);
  for (const [sk, sName, sep] of SEPS) {
    for (const key of LINE_SUBSET_SM) {
      const l = lineMeta.get(key);
      const id = `${slug}-${key}-with-${sk}`;
      compose(id, `${b.name} ${sName} ${l.name}`, b.category, [...b.tags, 'separator', sk, key],
        [{ type: 'map', name: slug }, { type: 'combine', marks: l.marks }, { type: 'fn', name: 'separate', sep }],
        'good', slug, `${b.name} letters with the ${l.name.toLowerCase()} effect, joined by ${JSON.stringify(sep)}.`);
    }
  }
}
// alphabet x separator x frame
for (const [slug] of BASES) {
  const b = baseMeta.get(slug);
  for (const [sk, sName, sep] of SEPS) {
    for (const fk of FRAME_SUBSET_SM) {
      const fName = frameMeta.get(fk);
      const id = `${slug}-in-${fk}-and-${sk}`;
      compose(id, `${b.name} ${fName} ${sName}`, b.category, [...b.tags, 'frame', fk, 'separator', sk],
        [{ type: 'map', name: slug }, { type: 'fn', name: 'separate', sep }, { type: 'frame', frame: fk }],
        'good', slug, `${b.name} letters joined by ${JSON.stringify(sep)} inside a ${fName.toLowerCase()} frame.`);
    }
  }
}

if (styles.length < 5000) throw new Error(`Only ${styles.length} styles were generated; at least 5000 required.`);

const indexable = styles.filter((s) => s.indexable);
writeFileSync(path.join(root, 'data/fonts.json'), JSON.stringify({ sample: SAMPLE, styles }));
console.log(`Wrote ${styles.length} styles (${indexable.length} indexable) in ${new Set(styles.map((s) => s.category)).size} categories`);
