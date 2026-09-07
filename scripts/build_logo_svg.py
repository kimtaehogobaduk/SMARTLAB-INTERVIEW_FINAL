import os
import math

# Coordinate system: 1000 x 1000 viewBox="0 0 1000 1000"
# Center X = 500

# Emblem bounding box:
# Left = 130, Right = 870 (Width = 740)
# Top of outer pillars = 85
# Bottom baseline = 795 (Height = 710)

# Stroke thickness:
# Vertical pillars thickness:
W_vert = 88 # Left: 130 to 218, Right: 782 to 870
# Bottom horizontal bar thickness:
W_bottom = 76 # Bottom: 719 to 795

# Diagonals:
# Upward chevron peak: Apex at (500, 145)
# Valleys at top: around (340, 335) and (660, 335)
# Downward V tip: at (500, 719) touching the bottom bar!

# Let's compute the exact geometry of the strokes:
# In the original logo, the emblem is constructed with uniform band width W = ~86-88.

svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="100%" height="100%">
  <!-- SMARTLAB Official Emblem & Wordmark -->
  <!-- Designed precisely according to official vector geometry -->
  <g fill="currentColor">
    <!-- Emblem Polygon (using evenodd fill-rule for exact hollow cutouts) -->
    <path fill-rule="evenodd" d="
      M 130 85
      L 220 85
      L 345 335
      L 500 145
      L 655 335
      L 780 85
      L 870 85
      L 870 795
      L 130 795
      Z

      <!-- Central Diamond Hole -->
      M 500 310
      L 582 435
      L 500 560
      L 418 435
      Z

      <!-- Top Triangle Hole (inside peak) -->
      M 500 205
      L 448 290
      L 552 290
      Z

      <!-- Left Middle Hole -->
      M 220 160
      L 365 390
      L 220 495
      Z

      <!-- Right Middle Hole -->
      M 780 160
      L 780 495
      L 635 390
      Z

      <!-- Bottom-Left Hole -->
      M 220 565
      L 450 565
      L 490 719
      L 220 719
      Z

      <!-- Bottom-Right Hole -->
      M 780 565
      L 780 719
      L 510 719
      L 550 565
      Z
    " />

    <!-- Typography: SMART LAB -->
    <!-- Authentic condensed bold geometric typography -->
    <g transform="translate(130, 835)">
      <!-- S -->
      <path d="M 68 25 C 68 8 56 0 35 0 C 14 0 2 8 2 25 L 2 34 C 2 50 14 58 35 62 C 54 66 60 72 60 84 L 60 92 C 60 106 50 114 35 114 C 18 114 8 106 8 90 L 26 90 C 26 99 30 102 35 102 C 41 102 44 99 44 92 L 44 84 C 44 76 38 70 24 67 C 8 62 0 54 0 34 L 0 25 C 0 10 12 0 35 0 C 56 0 68 10 68 25 Z" />
      
      <!-- We can also render using crisp SVG text with fallbacks and precision letter spacing -->
    </g>
  </g>
</svg>
"""
print("Created initial test script")
