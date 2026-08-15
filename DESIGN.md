# Design System — Dark Glassmorphism with LightTunnel

## Visual Identity

**Aesthetic:** Immersive dark void with animated WebGL background
**Mood:** Futuristic, mysterious, premium, focused
**Brand Personality:** Playful rebellion, technical sophistication, ADHD-friendly clarity

---

## Color Palette

### Core Colors
```
--bg-void: #050308          Near-black with violet undertone
--bg-deep: #0a0612          Deep void base
--bg-surface: #1a0b2e       Elevated surface
--bg-elevated: #2d1b4e      Highest elevation
```

### Glass Surfaces
```
--glass-bg: rgba(255, 255, 255, 0.03)
--glass-bg-hover: rgba(255, 255, 255, 0.06)
--glass-bg-strong: rgba(255, 255, 255, 0.08)
--glass-border: rgba(255, 255, 255, 0.08)
--glass-border-hover: rgba(255, 255, 255, 0.18)
--glass-border-active: rgba(168, 85, 247, 0.4)
```

### Accent Palette
```
--accent-violet: #A855F7    Primary accent (buttons, active states, glows)
--accent-cyan: #06B6D4      Secondary accent (data, info, gradients)
--accent-pink: #EC4899      Tertiary accent (highlights)
--accent-success: #10B981   Emerald (success states)
--accent-warning: #F59E0B   Amber (warnings)
--accent-danger: #EF4444    Red (errors, destructive actions)
```

### Text
```
--text-primary: #F8FAFC     White with slight warmth
--text-secondary: #CBD5E1   Light gray for body text
--text-muted: #94A3B8       Muted for captions
--text-disabled: #64748B    Disabled states
```

---

## Typography

### Font Stack
```css
--font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 
             "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

### Type Scale
- **Display:** 4xl-7xl (40px-72px), font-black, tight tracking
- **Heading:** 3xl-4xl (30px-36px), font-black, tracking-tight
- **Title:** xl-2xl (20px-24px), font-bold
- **Body:** base (16px), font-normal
- **Caption:** xs-sm (12px-14px), font-normal
- **Mono:** font-mono for stats, labels, code

### Usage
- **Gradient text:** Used for main title "BakaTracker" (violet → cyan)
- **Monospace:** Stats, levels, labels (XP, LVL, progress)
- **Font weights:** 400 (normal), 500 (medium), 600 (semibold), 700 (bold), 900 (black)

---

## Components

### Glass Card
```css
.glass-card {
  background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06);
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
  border-color: rgba(255,255,255,0.18);
  box-shadow: 0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
  transform: translateY(-2px);
}
```

### Glass Button
```css
.glass-button {
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  padding: 0.5rem 1.5rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.glass-button:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.25);
}

.glass-button:active {
  transform: translateY(1px);
}
```

### Glow Button
```css
.glow-button {
  background: linear-gradient(135deg, #A855F7 0%, #8B5CF6 100%);
  border: 1px solid rgba(255,255,255,0.2);
  box-shadow: 0 4px 20px rgba(168,85,247,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
  border-radius: 10px;
  padding: 0.75rem 2rem;
  font-weight: 700;
  transition: all 0.3s ease;
}

.glow-button:hover {
  box-shadow: 0 6px 30px rgba(168,85,247,0.6), inset 0 1px 0 rgba(255,255,255,0.3);
  transform: translateY(-2px);
}
```

### Glass Input
```css
.glass-input {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  transition: all 0.2s ease;
}

.glass-input:focus {
  background: rgba(255,255,255,0.06);
  border-color: var(--accent-violet);
  box-shadow: 0 0 0 3px rgba(168,85,247,0.15);
  outline: none;
}
```

---

## Background System

### LightTunnel WebGL Animation
- **Component:** `src/components/background/LightTunnel.tsx`
- **Technology:** WebGL shader via OGL library
- **Effect:** Animated fiber-optic tunnel with pulsing violet/cyan light
- **Props:**
  - `cableColor: #A855F7` (violet)
  - `pulseColor: #C084FC` (lighter violet)
  - `speed: 0.08` (slow, meditative)
  - `flowDirection: 'outward'` (radiating from center)
  - `cableCount: 24` (dense, immersive)
  - `glow: 1.2` (enhanced luminosity)
  - `mouseInteraction: true` (subtle parallax)

### AppBackground Wrapper
- **Component:** `src/components/background/AppBackground.tsx`
- **Structure:** Fixed position, z-index 0, full viewport
- **Gradient overlay:** Radial gradient from `#1a0b2e` (center) to `#050308` (edges)
- **Vignette:** Darkens edges for focus and depth
- **Accessibility:** Respects `prefers-reduced-motion`, disables animation

---

## Layout Patterns

### Sidebar (Desktop)
- **Width:** 260px (expanded), 70px (collapsed)
- **Background:** Glass with subtle gradient
- **Navigation items:** Glass cards, active state has violet glow border
- **Character stats:** Glass card with gradient background (violet → cyan)
- **Logo:** Circular with glass border and subtle glow

### Mobile Bottom Nav
- **Position:** Fixed bottom, full width
- **Background:** Glass with blur
- **Active item:** Glass card with violet glow
- **Icon size:** 20x20px
- **Label:** 10px monospace font

### Cards & Containers
- **Border radius:** 12-16px (consistent rounding)
- **Padding:** 16-24px (breathing room)
- **Gap:** 16px between elements (consistent rhythm)
- **Hover effects:** Subtle lift (translateY -2px), border brightens

---

## Interaction Patterns

### Hover States
- **Buttons:** Lift up 2px, glow intensifies
- **Cards:** Lift up 2px, border brightens to 0.18 opacity
- **Navigation:** Background brightens, text color shifts to white

### Active States
- **Buttons:** Push down 1px, glow reduces
- **Pressed:** Slight scale down (0.98)

### Focus States
- **Inputs:** Violet border + 3px violet glow ring
- **Buttons:** 2px solid violet outline, 2px offset
- **Interactive elements:** Visible focus ring for keyboard navigation

### Transitions
- **Duration:** 0.2s - 0.3s
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (smooth, natural)
- **Properties:** transform, box-shadow, border-color, background

---

## Accessibility

### Contrast Ratios
- **Primary text:** #F8FAFC on #050308 = 18.5:1 (AAA)
- **Secondary text:** #CBD5E1 on #050308 = 13.2:1 (AAA)
- **Muted text:** #94A3B8 on #050308 = 8.1:1 (AAA)
- **Disabled text:** #64748B on #050308 = 5.2:1 (AA)
- **Violet accent:** #A855F7 on #050308 = 4.8:1 (AA)

### Reduced Motion
- **Media query:** `@media (prefers-reduced-motion: reduce)`
- **Behavior:** Disables LightTunnel animation, shows static gradient background
- **Transitions:** Reduced to 0.01ms duration

### Focus Indicators
- **All interactive elements:** 2px solid violet outline, 2px offset
- **Keyboard navigation:** Fully supported via tab order
- **Screen readers:** ARIA labels on icon-only buttons

### High Contrast Mode
- **Detection:** `@media (prefers-contrast: high)`
- **Adjustments:** Increased border opacity, enhanced text contrast

---

## Performance Optimizations

### WebGL
- **DPR limit:** Capped at 2x (prevents excessive GPU load on 3x+ screens)
- **Intersection Observer:** Animation pauses when component not visible
- **Resize Observer:** Debounced canvas resize

### CSS
- **Backdrop-filter:** Heavy blur (24-32px) used sparingly
- **Transform:** Hardware-accelerated (translate3d, scale)
- **Will-change:** Applied to frequently animated elements
- **Containment:** `contain: layout style paint` on isolated components

### Assets
- **Logo:** Optimized PNG with transparency
- **Icons:** Lucide React (tree-shakeable, consistent stroke width)
- **Fonts:** Inter with font-display: swap (prevents FOIT)

---

## Browser Support

### Minimum Requirements
- **Chrome/Edge:** 88+ (full support)
- **Firefox:** 103+ (full support)
- **Safari:** 15.4+ (full support)
- **iOS Safari:** 15.4+ (full support)

### Fallbacks
- **No WebGL:** Static gradient background (graceful degradation)
- **No backdrop-filter:** Semi-transparent solid backgrounds
- **No CSS custom properties:** Hard-coded values (shouldn't happen in supported browsers)

---

## Component Inventory

### Core Components
- `AppBackground` — Fixed WebGL tunnel background
- `LightTunnel` — WebGL shader component
- `Layout` — Main app shell with sidebar/bottom nav
- `Landing` — Landing page with glass cards

### UI Components
- Glass cards (`.glass-card`)
- Glass buttons (`.glass-button`)
- Glow buttons (`.glow-button`)
- Glass inputs (`.glass-input`)
- Navigation items (sidebar + mobile bottom nav)
- Progress bars (glass style with gradient fill)
- Badges (small glass pills)
- Modals (glass overlay with blur)

### Feature Components
- `Habits` — Habit tracking with glass cards
- `Tasks` — Kanban board with glass columns
- `Eisenhower` — Matrix grid with glass quadrants
- `Today` — Focus board with glass cards
- `Journal` — Entry list with glass cards
- `Journey` — Analytics dashboard with glass charts
- `Notes` — Excalidraw canvas with glass toolbar
- `Settings` — Modal with glass sections

---

## Design Principles

1. **Immersive depth:** Background is a living, breathing entity; UI floats above it
2. **Glass as material:** Translucent, blurred, with subtle reflections and borders
3. **Violet identity:** Primary accent creates brand recognition through glow and gradients
4. **Minimal friction:** Every interaction is smooth, purposeful, and satisfying
5. **ADHD-friendly:** Clear hierarchy, focused attention, no unnecessary motion
6. **Playful rebellion:** Dark aesthetic with vibrant accents, technical yet approachable
7. **Accessibility first:** High contrast, keyboard navigation, reduced motion support

---

## File Structure

```
src/
├── components/
│   ├── background/
│   │   ├── LightTunnel.tsx      # WebGL shader component
│   │   ├── LightTunnel.css      # Container styles
│   │   └── AppBackground.tsx    # Wrapper with gradient overlay
│   ├── shared/
│   │   ├── Layout.tsx           # Main app shell (glassmorphism)
│   │   └── ...
│   └── ...
├── pages/
│   ├── Landing.tsx              # Landing page (glass cards)
│   └── ...
├── index.css                    # Global design system
└── App.tsx                      # Root with AppBackground mount
```

---

## Maintenance Notes

### Adding New Components
1. Use `.glass-card` or `.glass-button` base classes
2. Apply `backdrop-filter: blur(24px)` for glass effect
3. Use `rgba(255,255,255,0.03-0.08)` for backgrounds
4. Add `border: 1px solid rgba(255,255,255,0.08)` for definition
5. Include hover state with `translateY(-2px)` lift

### Modifying Colors
- All colors are CSS custom properties in `:root`
- Change in one place, propagates everywhere
- Test contrast ratios after changes

### Performance Checklist
- [ ] Limit backdrop-filter usage (expensive)
- [ ] Use `will-change` sparingly
- [ ] Test on mobile devices (3x DPR can kill performance)
- [ ] Verify reduced-motion media query works
- [ ] Check WebGL fallback renders correctly

---

## Version History

### v3.0 — Dark Glassmorphism (Current)
- Implemented LightTunnel WebGL background
- Complete glassmorphism design system
- Replaced neo-brutalist aesthetic
- Enhanced accessibility (focus states, reduced motion)
- Optimized performance (DPR cap, intersection observer)

### v2.0 — Neo-Brutalist (Previous)
- Light theme with hard shadows
- Black borders, bright accents
- Geometric, bold aesthetic

---

## Resources

- **OGL Library:** https://github.com/oframe/ogl
- **Lucide Icons:** https://lucide.dev
- **Inter Font:** https://rsms.me/inter/
- **React Bits:** https://reactbits.dev (LightTunnel inspiration)
