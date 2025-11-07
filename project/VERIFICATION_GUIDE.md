# Verification Guide - Phase 0.1 & Phase 1.1

This guide provides step-by-step instructions to manually verify the completion of Phase 0.1 (Project Scaffolding Research) and Phase 1.1 (Project Initialization).

## Quick Start Verification

Before diving into detailed checks, run these quick tests:

```bash
# 1. Install dependencies
pnpm install

# 2. Run type checking
pnpm check

# 3. Start dev server
pnpm dev

# 4. In another terminal, run formatting check
pnpm lint

# 5. Test build
pnpm build
```

If all commands complete successfully, the basic setup is working! ✅

---

## Phase 0.1: Project Scaffolding Research - Detailed Verification

### ✅ SvelteKit Project Initialization

**What to Check:**
1. Open `package.json`
   - [ ] Verify `@sveltejs/kit` is in devDependencies (should be v2.47.1 or higher)
   - [ ] Verify `@sveltejs/vite-plugin-svelte` is present
   - [ ] Verify `svelte` is present (v5.41.0 or higher)

2. Open `svelte.config.js`
   - [ ] Verify it imports `adapter` from '@sveltejs/adapter-auto'
   - [ ] Verify it has `preprocess: vitePreprocess()`
   - [ ] Verify adapter is configured in the `kit` section

3. Open `vite.config.ts`
   - [ ] Verify it imports `sveltekit` from '@sveltejs/kit/vite'
   - [ ] Verify `sveltekit()` is in the plugins array

**Expected Result:** All SvelteKit dependencies and configuration files are properly set up.

---

### ✅ Tailwind CSS Integration

**What to Check:**
1. Open `package.json`
   - [ ] Verify `@tailwindcss/vite` is in devDependencies (v4.1.14 or higher)
   - [ ] Verify `tailwindcss` is in devDependencies (v4.1.14 or higher)

2. Open `vite.config.ts`
   - [ ] Verify it imports `tailwindcss` from '@tailwindcss/vite'
   - [ ] Verify `tailwindcss()` appears in plugins array BEFORE `sveltekit()`

3. Open `src/app.css`
   - [ ] Verify it contains `@import 'tailwindcss';`

4. Open `src/routes/+layout.svelte`
   - [ ] Verify it imports '../app.css'

**Test in Browser:**
```bash
pnpm dev
# Visit http://localhost:5173
# Open browser DevTools > Elements tab
# Check that <style> tags with Tailwind CSS are injected
```

**Expected Result:** Tailwind CSS is properly integrated and styles are being applied.

---

### ✅ Project Structure

**What to Check:**
Run these commands and verify output:

```bash
# Check routes directory
ls -la src/routes/
# Expected: +layout.svelte, +page.svelte

# Check lib directory
ls -la src/lib/
# Expected: assets/, index.ts

# Check static directory
ls -la static/
# Expected: robots.txt

# Check for TypeScript config
cat tsconfig.json
# Expected: extends .svelte-kit/tsconfig.json, strict: true
```

**Directory Structure Checklist:**
- [ ] `src/routes/` exists with +page.svelte and +layout.svelte
- [ ] `src/lib/` exists with index.ts
- [ ] `src/lib/assets/` exists with favicon.svg
- [ ] `static/` exists with robots.txt
- [ ] `tsconfig.json` exists at project root

**Expected Result:** Standard SvelteKit project structure is in place.

---

### ✅ TypeScript Configuration

**What to Check:**
1. Open `tsconfig.json`
   - [ ] Verify `"extends": "./.svelte-kit/tsconfig.json"`
   - [ ] Verify `"strict": true` in compilerOptions
   - [ ] Verify `"moduleResolution": "bundler"` in compilerOptions

2. Run TypeScript check:
```bash
pnpm check
```
- [ ] Command should complete without errors
- [ ] Should see "No errors found"

**Expected Result:** TypeScript strict mode is enabled and no type errors exist.

---

## Phase 1.1: Project Initialization - Detailed Verification

### ✅ Development Server

**Test Steps:**
```bash
# Start dev server
pnpm dev
```

**Verification Checklist:**
- [ ] Server starts without errors
- [ ] Output shows "VITE v7.x.x ready in XXXms"
- [ ] Output shows "Local: http://localhost:5173/"
- [ ] No error messages in terminal

**Browser Test:**
1. Open http://localhost:5173 in your browser
   - [ ] Page loads successfully
   - [ ] No errors in browser console (F12 > Console)
   - [ ] Page displays SvelteKit welcome content

2. Test Hot Module Replacement (HMR):
   - [ ] Edit `src/routes/+page.svelte` and add some text
   - [ ] Save the file
   - [ ] Verify browser automatically updates without full refresh
   - [ ] No errors appear in browser console

**Expected Result:** Development server runs smoothly with working HMR.

---

### ✅ Build Process

**Test Steps:**
```bash
# Run production build
pnpm build
```

**Verification Checklist:**
- [ ] Build completes without errors
- [ ] Output shows "vite v7.x.x building for production..."
- [ ] Output shows "vite v7.x.x building SSR bundle for production..."
- [ ] `.svelte-kit/output/` directory is created

**Check Build Output:**
```bash
ls -la .svelte-kit/output/
# Should contain: client/, prerendered/, server/
```

**Preview Build:**
```bash
pnpm preview
```
- [ ] Preview server starts successfully
- [ ] Visit the preview URL and verify app works
- [ ] Check that production build is optimized (smaller bundle size)

**Expected Result:** Production build works correctly.

---

### ✅ Linting & Formatting

**Test Prettier Configuration:**
```bash
# Check formatting
pnpm lint

# Apply formatting
pnpm format
```

**Verification Checklist:**
1. Verify configuration files exist:
   - [ ] `.prettierrc` exists
   - [ ] `.prettierignore` exists

2. Test formatting:
```bash
# Create a poorly formatted test file
echo "const   x=1;const    y   =    2;" > test-format.js

# Run formatter
pnpm format

# Check if file is now formatted
cat test-format.js
# Expected: "const x = 1;\nconst y = 2;\n"

# Clean up
rm test-format.js
```

**Prettier Config Verification:**
```bash
cat .prettierrc
```
- [ ] Should contain Svelte and Tailwind plugins configuration
- [ ] Should have formatting rules defined

**Expected Result:** Prettier formats code correctly.

---

## Remaining Tasks (Not Yet Complete)

These items from Phase 1.1 are marked as TODO and need to be completed:

### ⚠️ Custom Tailwind Theme (Moxfield-inspired)
**Status:** Not started
**What's Needed:**
- Create custom color palette matching Moxfield's dark theme
- Configure theme in app.css or separate config file
- Test theme colors in components

### ⚠️ TypeScript Types for Deck Structures
**Status:** Not started
**What's Needed:**
- Create `src/lib/types/` directory
- Define interfaces for:
  - Deck, Card, Branch (deck.ts)
  - Version metadata (version.ts)
  - Maybeboard structures (maybeboard.ts)

---

## Summary Checklist

Use this quick checklist to verify everything at a glance:

### Phase 0.1 - Research ✅
- [x] SvelteKit properly configured
- [x] Tailwind CSS v4 integrated
- [x] Project structure follows conventions
- [x] TypeScript strict mode enabled
- [x] Documentation complete

### Phase 1.1 - Initialization
- [x] Dev server works (`pnpm dev`)
- [x] Build process works (`pnpm build`)
- [x] Prettier formatting works (`pnpm format`)
- [x] TypeScript checking works (`pnpm check`)
- [ ] Custom Tailwind theme configured
- [ ] TypeScript type definitions created

---

## Troubleshooting

### Dev server won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules .svelte-kit
pnpm install
pnpm dev
```

### TypeScript errors
```bash
# Regenerate SvelteKit files
pnpm prepare
pnpm check
```

### Build fails
```bash
# Clear build cache
rm -rf .svelte-kit build
pnpm build
```

### Prettier not working
```bash
# Verify Prettier is installed
pnpm list prettier

# Reinstall if needed
pnpm add -D prettier prettier-plugin-svelte prettier-plugin-tailwindcss
```

---

## Next Steps

After completing all verification steps:

1. ✅ Mark completed items as done in `project/TASKS.md`
2. 🔨 Complete remaining Phase 1.1 tasks (theme, types)
3. 🚀 Move on to Phase 1.2 (File Format & Storage)

For questions or issues, refer to:
- SvelteKit docs: https://kit.svelte.dev/docs
- Tailwind v4 docs: https://tailwindcss.com/docs
- Project PRD: `project/PRD.md`
