# Publishing

Single-package repo. No changesets needed.

## How to publish

```bash
# 1. Make sure you're on main with a clean tree
git checkout main && git pull

# 2. Bump version (pick one)
npm version patch   # 0.3.2 → 0.3.3 (bug fixes, new portals)
npm version minor   # 0.3.2 → 0.4.0 (new features, adapter changes)
npm version major   # 0.3.2 → 1.0.0 (breaking changes)

# 3. Push commit + tag → CI publishes
git push --follow-tags
```

That's it. `npm version` bumps `package.json`, commits, and creates a `v*` tag.
The GitHub Action triggers on the tag push and publishes to npmjs.org.

## Prerequisites

- **NPM_TOKEN** secret must be set in the GitHub repo settings
  (Settings → Secrets → Actions → `NPM_TOKEN`)
- Token must have publish access to the `@use_homi` scope on npmjs.org

## Manual publish (fallback)

If CI is broken:

```bash
pnpm run build
npm publish --access public
```

## Consumer update

After publishing, update in the Homi monorepo:

```bash
cd ~/Developer/boe-ventures/homi
pnpm update @use_homi/real-estate-portal-schemas@latest
```
