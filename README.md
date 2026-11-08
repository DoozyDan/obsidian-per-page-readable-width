# Per-Page Readable Width for Obsidian

An Obsidian plugin to disable **Readable Line Length** (enabling **Full Width**) on specific notes or folders while keeping global Readable Line Length enabled across the rest of your vault.

## Why?

Obsidian's global "Readable line length" setting is great for reading prose, but restricts layouts when viewing:
- Large tables, Dataview queries, or database views
- Wide kanban boards
- Custom embedded web apps or dashboards
- Visual diagrams and wide canvas/markdown content

This plugin gives you full per-page control without constantly toggling global settings.

## Features

- **Header Action Button**: 1-click toggle button directly in note header actions.
- **Frontmatter Support**: Automatically applies full width if a note frontmatter contains:
  ```yaml
  wide: true
  # or
  full-width: true
  # or
  readable-line-length: false
  ```
- **Page Rules**: Add specific note paths in plugin settings to always display full-width.
- **Folder Rules**: Designate entire folders (e.g. `Dashboards/` or `Tables/`) as full-width.
- **Automatic Path Tracking**: Renaming a note in Obsidian automatically updates your configured path rules.
- **Command Palette Action**: `Toggle readable line length (Full Width) for current page`.
- **Right-Click Menu**: Quick action in note file context menus.

## Installation

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Place them into your vault at `<vault>/.obsidian/plugins/obsidian-per-page-readable-width/`.
3. Reload Obsidian and enable the plugin in **Community plugins**.

## License

MIT © [Dan](https://github.com/DoozyDan)
