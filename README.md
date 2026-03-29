# WP AI Slider Plugin

A Gutenberg block plugin for WordPress that creates AI-powered image sliders. Search for images from Pixabay directly inside the block editor, then use OpenRouter AI to automatically generate hero headings and subtitles from image metadata — or write your own prompt. Full typography, overlay, animation, and layout controls are available from the block sidebar.

---

## Features

- **Pixabay image search** built into the block editor — search, browse paginated results, and select images without leaving the page
- **AI-generated hero text** via OpenRouter — two modes per slide:
  - **Tab 1 — AI from Image:** AI reads the image's tags and photographer info to write a heading and subtitle automatically
  - **Tab 2 — Manual Prompt:** Type your own instructions; AI writes the text to match
- **Live slide preview** inside the editor with overlay, hero text, and font rendering
- **Multi-slide support** — add unlimited slides, reorder with up/down controls, remove individually
- **Fade and slide animations** on the frontend with configurable autoplay interval
- **Navigation arrows** (left / right) and **dot indicators**, each independently toggleable
- **Full-width and wide alignment** support via the Gutenberg block toolbar
- **Image overlay** with colour picker and opacity slider — rendered via CSS `::before` so it works correctly across all themes without being stripped by theme stylesheets
- **Complete typography controls** — text colour, text alignment, font family (9 options), heading size, subtext size, font weight, and text shadow toggle
- **Image display options** — Cover, Contain, Auto, or 100% stretch, plus nine focus-point presets (Centre, Top, Bottom, Left, Right, and four corners)
- **Corner rounding** slider (0–48 px) for card-style sliders
- **Slider height** control (200–900 px)
- **Keyboard navigation** (arrow keys) and **touch/swipe** support on the frontend
- Pauses on hover and when the browser tab is hidden
- ARIA roles and attributes for screen reader accessibility
- No build step required — plain JavaScript, no Node.js or webpack needed

---

## Requirements

| Requirement | Minimum version |
|---|---|
| WordPress | 6.0 |
| PHP | 7.4 |
| Browser | Any modern browser (Chrome, Firefox, Safari, Edge) |
| Pixabay API key | Free account at [pixabay.com](https://pixabay.com/api/docs/) |
| OpenRouter API key | Account at [openrouter.ai](https://openrouter.ai) |

---

## Installation

1. Download the latest `wp-ai-slider.zip` from the [Releases](../../releases) page
2. In your WordPress admin, go to **Plugins → Add New → Upload Plugin**
3. Choose `wp-ai-slider.zip` and click **Install Now**
4. Click **Activate Plugin**

---

## Setup

### 1. Add your API keys

Go to **WP AI Slider** in the WordPress admin menu.

**OpenRouter (AI text generation)**

1. Paste your OpenRouter API key into the OpenRouter field
2. Click **Test** to verify the connection
3. Click **Refresh Models** to load the AI models available on your account
4. Select your preferred model from the dropdown
5. Click **Save Settings**

**Pixabay (image search)**

1. Paste your Pixabay API key into the Pixabay field
2. Click **Test** to verify the connection
3. Click **Save Settings**

> Both keys are stored in the WordPress options table and are never exposed in page source or JavaScript.

### 2. Get your API keys

**Pixabay** — free registration at [pixabay.com](https://pixabay.com/accounts/register/). Your API key is on the [API documentation page](https://pixabay.com/api/docs/) once logged in.

**OpenRouter** — register at [openrouter.ai](https://openrouter.ai). Free credits are available on sign-up. Your API key is in the [Keys section](https://openrouter.ai/keys) of your account.

---

## Using the Block

### Adding the block

1. Open any post or page in the Gutenberg editor
2. Click **+** to add a block and search for **WP AI Slider**
3. Click the block to insert it

### Adding slides

1. Click **+ Add** in the slide thumbnail strip, or click **+ Create First Slide** on an empty block
2. The slide editor panel opens below the thumbnail strip

### Searching for an image

1. In the slide editor, click **🔍 Search Pixabay Images**
2. Type a search term and press **Enter** or click **Search**
3. A confirmation message appears when results are returned, or a not-found message if the term returned no results
4. Click any image thumbnail to select it — the image appears in the chosen-image panel and in the live preview below

### Generating hero text

After selecting an image, two tabs appear:

**Tab 1 — AI from Image**
Click **✨ Generate Hero Text from Image**. The AI reads the image's tags and photographer credit to write a heading and subtitle. The text appears in the editable fields below.

**Tab 2 — Manual Prompt**
Type your own instructions (for example: *"A motivational tagline for a travel company"*) and click **✨ Generate Hero Text**. The AI writes the heading and subtitle to match your instructions.

Both generated heading and subtitle are fully editable in the text fields after generation.

### Block sidebar settings

Click the block to reveal the settings panel in the right sidebar. Settings are grouped into four panels:

**📐 Layout & Width**

| Setting | Description |
|---|---|
| Block Width | Use the toolbar above the block to set Default, Wide, or Full width |
| Slider Height | Height in pixels (200–900 px) |
| Image Display (Fit) | Cover, Contain, Auto, or 100% stretch |
| Image Focus Position | Nine focus-point presets for Cover mode (Centre, Top, Bottom, etc.) |

**🎬 Slider Behaviour**

| Setting | Description |
|---|---|
| Slide Animation | Fade (crossfade) or Slide (horizontal scroll) |
| Autoplay Slides | Toggle autoplay on or off |
| Autoplay Interval | Time between slides in milliseconds (1 000–10 000 ms) |
| Show Navigation Arrows | Toggle previous/next arrow buttons |
| Show Dot Indicators | Toggle dot navigation below the slider |

**🎨 Image Overlay**

| Setting | Description |
|---|---|
| Overlay Colour | Colour picker with presets (Black, Navy, Deep Purple, Forest, Maroon, Charcoal, Teal) |
| Overlay Opacity | Strength of the overlay from 0% (invisible) to 90% (near-opaque) |

**✍️ Typography**

| Setting | Description |
|---|---|
| Text Colour | Colour applied to both heading and subtext |
| Text Alignment | Centre, Left, or Right |
| Font Family | 9 options: Default (theme), System Sans-serif, System Serif, Georgia, Palatino, Trebuchet, Verdana, Impact, Courier |
| Font Weight | Normal (400) through Black (900) |
| Heading Font Size | Size of the main heading in pixels (16–120 px) |
| Subtext Font Size | Size of the subtitle in pixels (12–60 px) |
| Text Shadow | Toggle a drop shadow behind text for readability on bright images |

**🔲 Style**

| Setting | Description |
|---|---|
| Corner Rounding | Border radius in pixels (0–48 px) |

---

## File Structure

```
wp-ai-slider/
├── wp-ai-slider.php                  # Main plugin file — block registration, PHP render callback
├── includes/
│   ├── class-settings.php            # Settings storage wrapper (wp_options)
│   ├── class-api-handler.php         # Pixabay and OpenRouter API calls
│   └── class-rest-api.php            # WP REST API route registration and callbacks
├── admin/
│   └── class-admin.php               # Admin menu page registration
├── templates/
│   └── admin-page.php                # Admin settings page HTML
└── assets/
    ├── js/
    │   ├── block.js                  # Gutenberg block editor (no build step required)
    │   ├── frontend.js               # Frontend slider — vanilla JS, no dependencies
    │   └── admin.js                  # Admin settings page interactions (jQuery)
    └── css/
        ├── block-editor.css          # Block editor styles
        ├── frontend.css              # Frontend slider styles
        └── admin.css                 # Admin page styles
```

---

## REST API Endpoints

All endpoints live under the namespace `wp-ai-slider/v1`.

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/search-pixabay` | `edit_posts` | Search Pixabay. Params: `query`, `page`, `per_page` |
| `POST` | `/generate-text` | `edit_posts` | Generate AI text. Body: `{ prompt, system }` |
| `POST` | `/test-pixabay` | `manage_options` | Test Pixabay connectivity |
| `POST` | `/test-openrouter` | `manage_options` | Test OpenRouter connectivity |
| `GET` | `/get-models` | `manage_options` | Fetch available OpenRouter models |
| `GET` | `/get-settings` | `manage_options` | Read saved plugin settings |
| `POST` | `/save-settings` | `manage_options` | Save API keys and selected model |

---

## Technical Notes

**No build step** — `block.js` uses `wp.element.createElement` directly instead of JSX, so no Node.js, webpack, or compilation is needed. The plugin works by uploading the ZIP as-is.

**Image resolution** — when an image is selected, two CDN URLs are stored:
- `imageUrl` — 1 280 px wide, used on the frontend for sharp display at full viewport widths
- `imageWebUrl` — 640 px wide, used in the editor preview for fast loading

Both are served from Pixabay's CDN (`cdn.pixabay.com`) with no referrer restrictions, which avoids the silent failures caused by Pixabay's hotlink-protected `webformatURL`.

**Overlay rendering** — the colour overlay uses a CSS `::before` pseudo-element rather than a child `<div>`. This prevents common WordPress theme stylesheets (e.g. `.entry-content div { background: none }`) from inadvertently stripping the overlay colour.

**Dynamic block** — the block is server-side rendered by PHP (`render_callback`). This means slider content is always up to date and works correctly in caching environments without stale HTML.

---

## Frequently Asked Questions

**Do I need to pay for the APIs?**
Both Pixabay and OpenRouter offer free tiers. Pixabay is completely free for API access. OpenRouter provides free credits on sign-up and supports many free-tier models. Usage costs for paid models depend on the model selected and the number of text generations.

**Which AI models work best for hero text?**
Any instruction-following model works. Fast, inexpensive models such as `mistralai/mistral-7b-instruct` or `openai/gpt-3.5-turbo` are well suited for short hero text generation and produce results in under two seconds.

**Why does my slider not appear on the frontend?**
Check that the block contains at least one slide with an image selected. Slides without an image are automatically skipped in the PHP render.

**My overlay colour is not showing. What should I check?**
Confirm that Overlay Opacity is set above 0% in the Image Overlay panel. If a theme stylesheet is overriding the slider, try increasing opacity further. The overlay is rendered via `::before` and is isolated from theme `div` resets.

**Can I add the slider to a widget area or template?**
The block can be added anywhere the Gutenberg editor is available, including Full Site Editing templates, template parts, and reusable blocks.

---

## Changelog

### 1.1.0
- Added full-width and wide alignment support
- Added Image Focus Position control (9 presets)
- Added Image Display options: Cover, Contain, Auto, 100% stretch
- Added complete typography controls: font family, font weight, heading size, subtext size, text shadow
- Added Corner Rounding style control
- Fixed overlay colour not applying when WordPress's `ColorPalette` returns `rgb()` strings
- Fixed overlay being stripped by theme stylesheets — replaced overlay div with CSS `::before` pseudo-element
- Fixed frontend image pixelation — now stores and renders 1 280 px CDN images on the frontend
- Fixed navigation arrows both appearing on the left side (CSS selector mismatch)
- Fixed image not appearing in slide preview or chosen-image panel (Pixabay `largeImageURL` is empty on free accounts — now uses CDN-derived URLs)
- Fixed "No images found" message appearing while typing before a search was submitted

### 1.0.0
- Initial release

---

## License

GPL-2.0-or-later — see [LICENSE](LICENSE) for full text.

---

## Credits

- Images provided by [Pixabay](https://pixabay.com) via their free API
- AI text generation powered by [OpenRouter](https://openrouter.ai)

**Plugin Workflow**

<img width="1440" height="2506" alt="image" src="https://github.com/user-attachments/assets/ce7d44dd-1a8d-4326-9657-6c30e79bd2c5" />
