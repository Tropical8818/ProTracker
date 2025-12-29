# Version Update Checklist

Use this checklist when bumping the version number to ensure all locations are updated.

## Version Number Format
- **Major.Minor.Patch** (e.g., 6.2.0)
- **Major**: Breaking changes or major features
- **Minor**: New features, non-breaking changes
- **Patch**: Bug fixes only

---

## Required Updates

### 📦 Package Configuration
- [ ] `package.json` - Line 3: `"version": "X.X.X"`
- [ ] Run `npm install` to update `package-lock.json`

### 🖥️ UI Components - Page Headers
- [ ] `src/app/login/page.tsx` - Line ~56: `V6.X.X` in title
- [ ] `src/app/dashboard/page.tsx` - Line ~665: `V6.X.X` in header
- [ ] `src/app/dashboard/settings/page.tsx` - Line ~437: `V6.X.X` in header
- [ ] `src/app/dashboard/operation/page.tsx` - Line ~170: `V6.X.X` in header
- [ ] `src/app/dashboard/kiosk/page.tsx` - Line ~514: `V6.X.X` in footer

### 🎨 UI Components - Menus & Tooltips
- [ ] `src/components/DraggableMenu.tsx` - Line ~229: `v6.x.x` in footer
- [ ] `src/app/dashboard/page.tsx` - Line ~949: `6.X.X` in Info tooltip ⚠️ **EASY TO FORGET!**

---

## Update Commands

```bash
# 1. Update version in package.json manually or use npm
npm version minor  # for 6.X.0
npm version patch  # for 6.2.X

# 2. Update all UI files (use search & replace)
# Search: "6.2.0" or "V6.2.0"
# Replace with new version

# 3. Regenerate package-lock.json
npm install

# 4. Commit and push
git add -A
git commit -m "Bump version to X.X.X"
git push origin main
```

---

## Quick Search Method

Use this command to find all version references:
```bash
# Find all 6.X.X patterns
grep -r "6\.[0-9]\.[0-9]" src/ package.json

# Find all V6.X.X patterns
grep -r "V6\.[0-9]\.[0-9]" src/
```

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 6.2.0 | 2025-12-29 | UI-based watcher controls, dashboard refresh fix, skip-existing import mode |
| 6.1.4 | 2025-12-XX | Previous stable version |

---

## Notes

- The **Info tooltip** in `dashboard/page.tsx` is the most commonly forgotten location
- Always update both uppercase `V6.X.X` and lowercase `v6.x.x` formats
- Test the UI after updating to verify all version numbers are displayed correctly
