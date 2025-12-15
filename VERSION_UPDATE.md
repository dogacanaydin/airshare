# ⚠️ VERSION UPDATE CHECKLIST

## When Updating AirShare Version

**CRITICAL**: Always update BOTH files together to avoid PWA cache issues!

### Step-by-Step:

1. **Update `public/app.js` Line 3:**
   ```javascript
   // Version: 1.0.X - Description of changes
   ```

2. **Update `public/sw.js` Line 3:**
   ```javascript
   const VERSION = '1.0.X';
   ```

3. **Verify versions match** - Both files must have the same version number!

4. **Commit both files together**

### Why This Matters

The service worker uses the VERSION constant to create cache names like `airshare-v1.0.4`. If the versions don't match:
- ❌ Users get outdated cached versions
- ❌ PWA serves broken/old code
- ❌ Requires hard refresh to see updates
- ❌ Windows file transfer might break

### Current Version Locations

- **App Version**: `public/app.js:3` (comment)
- **Service Worker**: `public/sw.js:3` (VERSION constant)
- **Package**: `package.json:3` (npm version)

### Testing After Update

1. Open DevTools Console
2. Look for: `[SW] Installing version 1.0.X`
3. Verify: `AirShare v1.0.X loaded`
4. Both messages should show the same version!

### Quick Check Command

```bash
grep -n "Version:" public/app.js && grep -n "VERSION = " public/sw.js
```

This should show matching version numbers.
