# 📱 Mobile Testing Checklist

## Test on Real Devices
Open https://rgblightcat.com on your phone and test:

### Homepage
- [ ] Logo and header visible
- [ ] Stats cards don't overflow
- [ ] Numbers don't wrap in stat cards
- [ ] Buttons are easily tappable (44px minimum)
- [ ] Text is readable without zooming
- [ ] Horizontal scroll doesn't appear

### Game Page
- [ ] Game loads and renders correctly
- [ ] Touch controls appear (joystick + jump button)
- [ ] Controls are responsive to touch
- [ ] Score displays properly
- [ ] Game redirects to purchase after unlocking tier
- [ ] No lag or stuttering during gameplay

### Purchase Flow
- [ ] QR scanner button works
- [ ] Can paste RGB invoice
- [ ] Batch selector is easy to use
- [ ] Submit button is clearly visible
- [ ] Lightning invoice QR code displays
- [ ] Payment status updates work

### Testing Tools
1. **Chrome DevTools** (on desktop)
   - Press F12 → Toggle device toolbar
   - Test these devices:
     - iPhone SE (375x667)
     - iPhone 12 Pro (390x844)
     - Samsung Galaxy S20 (412x915)
     - iPad (768x1024)

2. **Real Device Testing**
   - Test on actual iPhone/Android
   - Check in both portrait and landscape
   - Test with slow 3G connection

3. **Lighthouse Audit**
   ```bash
   # In Chrome DevTools
   # Go to Lighthouse tab
   # Run mobile audit
   # Target scores:
   # - Performance: >90
   # - Accessibility: >95
   # - Best Practices: >95
   # - SEO: >90
   ```

### Common Mobile Issues to Check

1. **Touch Targets**
   - All buttons/links at least 44x44px
   - Adequate spacing between tappable elements
   - No accidental taps on adjacent elements

2. **Viewport**
   - No horizontal scrolling
   - Content fits within screen width
   - Zoom disabled for game page

3. **Performance**
   - Game runs at 30+ FPS
   - Touch response < 100ms
   - No memory leaks causing crashes

4. **Orientation**
   - Test portrait mode (required)
   - Test landscape mode (should work)
   - UI adapts properly to rotation

### Quick Fixes for Common Issues

**Text too small:**
```css
@media (max-width: 768px) {
  body { font-size: 16px; }
  h1 { font-size: 1.8rem; }
  button { font-size: 1rem; }
}
```

**Buttons too small:**
```css
button, .btn {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;
}
```

**Game controls not working:**
```javascript
// Ensure touch events are properly handled
element.addEventListener('touchstart', handleTouch, { passive: false });
element.addEventListener('touchmove', handleTouch, { passive: false });
element.addEventListener('touchend', handleTouch, { passive: false });
```

## Mobile Testing Report Template

```
Device: [iPhone/Android] [Model]
OS Version: [iOS/Android version]
Browser: [Safari/Chrome/Firefox]

Homepage: ✅/❌
Game Loading: ✅/❌
Game Controls: ✅/❌
Purchase Flow: ✅/❌
Payment: ✅/❌

Issues Found:
1. [Description]
2. [Description]

Screenshots: [Attach if needed]
```