# Button System Style Guide

## Concept: Composable `base + size + color` modifiers

Every `<button>` in the app uses a composable class system:

```tsx
<button className="btn btn-{color}">        // default size
<button className="btn btn-{color} btn-sm"> // small
<button className="btn btn-{color} btn-lg"> // large
```

---

## Base `.btn`

All buttons share these properties via the `.btn` class:

- `font-weight: 700`
- `text-transform: uppercase`
- `letter-spacing: 0.5px`
- `border-radius: var(--border-radius-default)`
- `cursor: pointer`
- `transition: all var(--transition-fast)`
- `line-height: 1.2`
- `:active` press animation: `scale(0.97)`
- `:disabled` state: `opacity: 0.5; cursor: not-allowed`

---

## Sizes

| Modifier | Padding | Font-size | Use case |
|----------|---------|-----------|----------|
| `.btn-sm` | `0.4rem 0.8rem` | `0.75rem` | tabs, toggles, difficulty pills |
| _(default)_ | `0.55rem 1.2rem` | `0.85rem` | nav buttons, game controls, tower actions |
| `.btn-lg` | `0.75rem 2rem` | `1rem` | modal CTAs, main Play Again button |

---

## Color Variants

### `.btn-gold` (primary CTA)
- Gold background, dark text
- Hover: darker gold + gold glow shadow + lift(-2px)
- Use for: Play Game, Start Wave, Fast Forward, Upgrade, Keep Playing, Play Again

### `.btn-dark` (secondary/subtle)
- Dark background, light text, subtle border
- Hover: lighter background + border brighten + lift(-2px)
- Use for: nav buttons (Back, Configuration, Statistics, Save), tab buttons, toggle buttons, difficulty pills
- Active/selected state: `.btn-dark.active` or `.btn-dark.selected` turns gold (same as btn-gold look)

### `.btn-danger` (destructive actions)
- Transparent background, red border, red text
- Hover: fill red background + white text + lift(-2px)
- Use for: Resign, Sell Tower

### `.btn-ghost` (icon/close buttons)
- Transparent, no border, muted text
- Hover: full opacity text (no lift)
- Use for: close (X) buttons on modals/panels

---

## Layout-Only Classes

Some buttons need extra layout properties beyond color/size. These classes only add layout:

| Class | Layout property | Used in |
|-------|----------------|---------|
| `.tab-button` | `flex: 1` | Settings tab bar |
| `.difficulty-button` | `flex: 1` | Difficulty selector |
| `.game-button` | `min-width: 140px; box-shadow` | Game controls |
| `.upgrade-button` | `width: 100%` | Tower modal |
| `.sell-button` | `width: 100%` | Tower modal |
| `.tower-type-button` | `display: flex; width: 100%; gap` | Settings tower list |
| `.modal-close` | `position: absolute; top; right` | Tower modal close |
| `.panel-close` | `position: absolute; top; right` | Enemy panel close |
| `.nav-difficulty-btn` | `width: 170px; text-align: left` | Main screen nav |

These classes contain **no color, font, or animation rules** - those come from the `btn-{color}` classes.

---

## Complete Button Mapping

| Screen | Button | Classes |
|--------|--------|---------|
| **MainScreen** | Configuration | `btn btn-dark` |
| | Statistics | `btn btn-dark` |
| | Game Mode: Normal | `btn btn-dark nav-difficulty-btn` |
| | Play Game | `btn btn-gold` |
| **DifficultySelector** | Easy/Normal/Hard | `btn btn-dark btn-sm difficulty-button` |
| **StatisticsScreen** | Overview/Recent/Top | `btn btn-dark btn-sm` |
| | Back | `btn btn-dark` |
| **SettingsScreen** | Save | `btn btn-dark` |
| | Back | `btn btn-dark` |
| | Tab buttons | `btn btn-dark btn-sm tab-button` |
| | Tower type buttons | `btn btn-dark btn-sm tower-type-button` |
| **GameControls** | Fast Forward | `btn btn-gold game-button` |
| | Start Wave | `btn btn-gold game-button` |
| | End Game | `btn btn-dark` |
| **TowerModal** | Close (X) | `btn btn-ghost modal-close` |
| | Upgrade | `btn btn-gold upgrade-button` |
| | Sell | `btn btn-danger sell-button` |
| **EndGameModal** | Keep Playing | `btn btn-gold btn-lg` |
| | Resign | `btn btn-danger btn-lg` |
| **EnemyStatsPanel** | Close (X) | `btn btn-ghost panel-close` |
| **ScreenLayout** | Back | `btn btn-dark` |

---

## Current Status

Migration complete. All buttons use the composable `btn` + `btn-gold/dark/danger/ghost` + `btn-sm/lg` system. Legacy per-component button variants (`.btn-primary`, `.btn-secondary`, `.nav-action-btn`, `.toggle-button`) have been removed. Component CSS files retain layout-only classes (positioning, width, flex) with no color, font, or animation rules.
