#!/usr/bin/env python3
"""Check WCAG contrast ratios for color schemes."""

def hex_to_rgb(hex_color):
    """Convert hex color to RGB."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def relative_luminance(rgb):
    """Calculate relative luminance for RGB color."""
    r, g, b = [x / 255.0 for x in rgb]

    # Apply gamma correction
    def adjust(channel):
        if channel <= 0.03928:
            return channel / 12.92
        return ((channel + 0.055) / 1.055) ** 2.4

    r, g, b = adjust(r), adjust(g), adjust(b)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast_ratio(color1, color2):
    """Calculate contrast ratio between two colors."""
    lum1 = relative_luminance(hex_to_rgb(color1))
    lum2 = relative_luminance(hex_to_rgb(color2))

    lighter = max(lum1, lum2)
    darker = min(lum1, lum2)

    return (lighter + 0.05) / (darker + 0.05)

def check_wcag(ratio, name):
    """Check WCAG compliance levels."""
    aa_normal = ratio >= 4.5
    aa_large = ratio >= 3.0
    aaa_normal = ratio >= 7.0
    aaa_large = ratio >= 4.5

    print(f"  {name}: {ratio:.2f}:1")
    if aaa_normal:
        print(f"    ✓ AAA (normal and large text)")
    elif aaa_large:
        print(f"    ✓ AAA (large text only), AA (normal text)")
    elif aa_normal:
        print(f"    ✓ AA (normal and large text)")
    elif aa_large:
        print(f"    ⚠ AA (large text only) - fails for normal text")
    else:
        print(f"    ✗ FAILS WCAG requirements")
    return aa_normal

# Schemes to check
schemes = {
    "Grayscale Dark": {
        "base00": "#101010",  # background
        "base05": "#b9b9b9",  # foreground
        "base03": "#525252",  # comments
    },
    "Grayscale Light": {
        "base00": "#f7f7f7",  # background
        "base05": "#464646",  # foreground
        "base03": "#ababab",  # comments
    },
    "Equilibrium Gray Dark": {
        "base00": "#111111",  # background
        "base05": "#ababab",  # foreground
        "base03": "#777777",  # comments
        "base08": "#f04339",  # red
        "base0B": "#7f8b00",  # green
        "base0D": "#008dd1",  # blue
    },
    "Equilibrium Gray Light": {
        "base00": "#f1f1f1",  # background
        "base05": "#474747",  # foreground
        "base03": "#777777",  # comments
        "base08": "#d02023",  # red
        "base0B": "#637200",  # green
        "base0D": "#0073b5",  # blue
    },
    "Default Dark": {
        "base00": "#181818",  # background
        "base05": "#d8d8d8",  # foreground
        "base03": "#585858",  # comments
    },
    "Default Light": {
        "base00": "#f8f8f8",  # background
        "base05": "#383838",  # foreground
        "base03": "#b8b8b8",  # comments
    }
}

print("WCAG Contrast Ratio Analysis\n")
print("Requirements:")
print("  AA - Normal text: 4.5:1, Large text: 3:1")
print("  AAA - Normal text: 7:1, Large text: 4.5:1")
print()

for name, colors in schemes.items():
    print(f"\n{name}:")
    print("-" * 50)

    # Check background vs foreground
    ratio = contrast_ratio(colors["base00"], colors["base05"])
    check_wcag(ratio, "Background vs Foreground")

    # Check background vs comments
    ratio = contrast_ratio(colors["base00"], colors["base03"])
    check_wcag(ratio, "Background vs Comments")

    # Check colors if they exist
    if "base08" in colors:
        ratio = contrast_ratio(colors["base00"], colors["base08"])
        check_wcag(ratio, "Background vs Red")

        ratio = contrast_ratio(colors["base00"], colors["base0B"])
        check_wcag(ratio, "Background vs Green")

        ratio = contrast_ratio(colors["base00"], colors["base0D"])
        check_wcag(ratio, "Background vs Blue")

print("\n" + "=" * 50)
print("RECOMMENDATION:")
print("=" * 50)
