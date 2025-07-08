# SnapMeasure Pro

SnapMeasure Pro is a Chrome extension for measuring and inspecting UI elements, with both free and Pro (licensed) features. It provides a modern, PixelSnap-like overlay for designers and developers.

## Features

### Free Features
- **Grid Overlay**: Toggle an 8px grid overlay on any web page.
- **Free Selection**: Option-click to measure point-to-point distances anywhere on the page.
- **Multi-Component Distance**: Command-click to select and measure distances between multiple elements.
- **Inspector Overlay**: Toggle the inspector to activate the overlay and measurement tools.
- **Measurement History**: View and copy recent measurements from a floating panel.

### Pro Features
- **Baseline Grid**: Show a baseline grid for typography alignment.
- **Guides**: Add persistent vertical/horizontal guides (double-click overlay to add, drag to move, double-click guide to remove).
- **Screenshot Overlay**: Upload a screenshot for pixel-perfect comparison.
- **Spec Export**: Export overlay as an image for documentation.

## How It Works

1. **Install the extension** and pin it to your Chrome toolbar.
2. **Open any regular web page** (not a Chrome internal page).
3. **Click the SnapMeasure icon** to open the popup.
4. **Toggle the Inspector** to activate the overlay. You should see a dashed border and the SnapMeasure badge.
5. **Use the free features** immediately. Pro features require license activation.

## Troubleshooting

- If the overlay does not appear, ensure you are on a regular web page (not a Chrome Web Store or internal page).
- If you see a dashed border but no badge, check the browser console for logs starting with `SnapMeasure:`.
- Free features are always enabled by default. If they do not work, reload the extension and the page.
- If clipboard or export features fail, ensure you have granted the necessary permissions and are not on a restricted page.

## Recent Changes

- **Robust overlay activation**: The overlay is always created and visible when toggled, with a debug border for troubleshooting.
- **Always-on free features**: Grid, free selection, and multi-distance are enabled for all users by default.
- **Improved popup error handling**: The popup now gracefully handles errors and always initializes free feature settings.
- **Extensive logging**: Logs are available in the console for debugging overlay creation, settings, and feature toggling.

## License
SnapMeasure Pro is licensed under the MIT License. See [LICENSE](LICENSE) for details.
