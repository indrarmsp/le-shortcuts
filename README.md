# le-Shortcuts

A personal, power-user dashboard for managing web shortcuts. Built with **Next.js 16** and **React 19**, it provides a clean square-grid layout for organizing essential links with advanced categorization, drag-and-drop, and multi-select capabilities.

## Features

- **Cloud Syncing**: Optional seamless cross-device syncing powered by **Supabase**. Log in instantly via secure Email Magic Link to backup and sync your dashboard to the cloud. Unauthenticated users gracefully fallback to `localStorage` just like before.
- **Loading Overlay During Fetch**: A centered loading state appears not only on initial page refresh, but also while user data is reloading (for example right after sign-in and cloud fetch).
- **Dedicated Mobile View**: Dynamically responsive architecture that serves a truly native-feeling, touch-optimized vertical layout when loaded on mobile bounds.
- **Square-Grid Layout**: Responsive `auto-fill` grid of shortcut cards with custom icon support — paste high-resolution icons directly from [Flaticon](https://www.flaticon.com/) or upload from file.
- **Collapsible Categories**: Group shortcuts into categories with emoji or custom image icons; collapse/expand categories to stay focused.
- **Drag-and-Drop Reordering**: Reorder both categories and shortcuts within a category using `@dnd-kit` — touch-friendly with a grab-handle.
- **Multi-select & Bulk Actions**: Toggle select mode to pick multiple shortcuts, then bulk-delete or bulk-move them to another category at once.
- **Pinning**: Pin important shortcuts to always sort them to the top of their category.
- **Custom Icons**: Upload or paste (Ctrl+V) a custom icon for any shortcut or category, overriding the default globe/emoji.
- **Automatic Icon Resize (256x256)**: Newly pasted/uploaded icons are normalized to `256x256` PNG automatically to reduce payload size and improve dashboard performance.
- **Existing Icon Migration**: Previously saved custom icons are migrated once to `256x256` on load and then persisted back to local storage / cloud when possible.
- **Theme-Adaptive Icons**: Icons automatically adapt between dark and light mode — subtle glow in dark mode, clean shadows in light mode with smooth transitions.
- **Search**: Live search bar (press `/` to focus) filters shortcuts across all categories by title or URL; empty categories are hidden during search.
- **Keyboard Shortcuts**:
  | Key | Action |
  |-----|--------|
  | `/` | Focus search bar |
  | `n` | Open "New Shortcut" modal |
  | `Esc` | Close modal / exit select mode |
- **Persistent State**: All data (categories, links, collapse state) is stored in `localStorage` — no backend required.
- **Integrated Clock**: Full-screen greeting clock widget at the top of the dashboard with HH:MM display, date, and time-of-day greeting.
- **Theming**: Floating theme toggle to switch between light and dark appearances.

## Tech Stack

| Layer | Library / Version |
|---|---|
| Framework | [Next.js](https://nextjs.org/) `16.2.4` |
| UI | React `19.2.4` + Tailwind CSS `4` |
| Drag & Drop | `@dnd-kit/core` `^6.3`, `@dnd-kit/sortable` `^10.0` |
| Database/Auth | `@supabase/supabase-js` |
| Icons | `lucide-react` `^1.8` |
| State / Persistence | Custom React hook (`useDashboardData`) + `localStorage` / `Supabase` |

## Project Structure

```
src/
├── app/
│   ├── page.js               # Root page — renders Clock + ShortcutManager
│   ├── layout.js             # App layout (fonts, metadata)
│   └── globals.css           # Global styles & CSS variables (themes)
├── components/
│   ├── ShortcutManager.js    # Core dashboard: categories, shortcuts, modals, DnD, multi-select
│   ├── MobileDashboard.js    # Dedicated touch-friendly layout for mobile users
│   ├── Clock.js              # Greeting clock widget
│   └── ThemeToggleFloating.js# Floating dark/light mode toggle
├── hooks/
│   └── useDashboardData.js   # All CRUD operations + localStorage / Supabase persistence
└── lib/
  ├── supabase.js           # Supabase DB/Auth client configuration
  └── imageResize.js        # Image normalization utilities
```

## Database / localStorage Keys

If no Supabase environment variables are provided, the app will operate locally using:
| Key | Content |
|-----|---------|
| `le-shortcuts_categories` | Array of category objects |
| `le-shortcuts_links` | Array of shortcut/link objects |
| `le-shortcuts_collapsed` | Object mapping category IDs → collapsed boolean |
| `le-shortcuts_icons_256_migrated_v1` | One-time migration flag for resizing legacy custom icons |

*(To enable real-time Cloud Syncing, create a free Supabase project, execute `supabase_schema.sql` inside the Supabase SQL editor to scaffold the tables securely with RLS, and map your NEXT_PUBLIC environment credentials locally inside `.env.local`)*.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Other available scripts:

```bash
npm run build   # Production build
npm run start   # Start production server
npm run lint    # Lint with ESLint
```

## Contributing

Contributions are welcome! In particular, an **auto-fetch icon/logo** feature — automatically retrieving high-resolution website favicons when a URL is entered — would be highly appreciated. If you're interested in tackling this, feel free to open a PR!

## License

This project is open source and available under the [MIT License](LICENSE).
