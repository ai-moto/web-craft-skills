---
name: web-brand-assets
description: Create, refine, review, and implement website brand assets including logos, wordmarks, icons, favicons, app icons, social preview images, and reusable visual systems. Use for brand identity work, icon systems, favicon generation, logo placement, hero marks, UI icon consistency, SVG cleanup, accessibility checks, and avoiding trademark or copyright issues in public web assets.
---

# Web Brand Assets

## Asset Workflow

1. Identify whether the work is for a new original brand, an existing brand, or a redesign of user-owned assets.
2. Ask for source files or brand rules when the request depends on an existing identity. Do not imitate third-party brands or copyrighted marks unless the user has rights and the use is appropriate.
3. Choose the right format:
   - Use SVG for logos, UI icons, favicons, simple marks, and scalable interface assets.
   - Use PNG/WebP for raster exports, social images, textured artwork, and generated imagery.
   - Use existing icon libraries for common UI actions when the project already has one.
4. Design for the smallest important size first. A mark that fails at 16-32px is not ready for favicons or app icons.
5. Provide light, dark, monochrome, and high-contrast variants when the site needs them.
6. Implement assets with accessible names, correct dimensions, cacheable file paths, and metadata where relevant.

## Logo And Icon Standards

- Keep forms simple enough to survive small sizes.
- Avoid thin strokes, tiny counters, excessive gradients, and complex internal detail for favicons.
- Align icon stroke width, corner style, cap style, and optical size across a set.
- Use meaningful filenames such as `logo.svg`, `icon-download.svg`, `favicon.svg`, and `apple-touch-icon.png`.
- Prefer inline SVG only when styling or state changes require it. Prefer external files when caching and reuse matter.
- Check contrast against actual backgrounds, not only white.
- Ensure social preview images include safe margins and readable type at compressed sizes.

## Favicon And App Icon Set

For a production website, consider creating or verifying:

- `favicon.ico` for legacy support.
- `favicon.svg` for modern browsers.
- `apple-touch-icon.png` at 180x180.
- PWA icons at 192x192 and 512x512 when a manifest exists.
- `site.webmanifest` links when the app uses installable metadata.
- Open Graph and Twitter/X preview images when pages are shared socially.

## Review Output

When reviewing brand assets, report:

1. Rights or source assumptions.
2. Small-size legibility.
3. Contrast and background compatibility.
4. File format and implementation issues.
5. Concrete export or code changes.
