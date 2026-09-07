import math

# We will generate public/logo.svg and assets/logo.svg
# Coordinates precisely calculated to match 1786661984877.png

svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="100%" height="100%">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&amp;display=swap');
      .smartlab-text {
        font-family: 'Bebas Neue', 'Impact', 'Arial Black', 'Trebuchet MS', sans-serif;
        font-weight: 900;
        font-size: 130px;
        letter-spacing: 0.055em;
        text-anchor: middle;
      }
    </style>
  </defs>

  <!-- SMARTLAB Official Vector Monogram Emblem -->
  <g fill="currentColor">
    <!-- Outer crown-monogram frame with precision cutouts -->
    <path fill-rule="evenodd" d="
      M 130 85
      L 225 85
      L 345 320
      L 500 150
      L 655 320
      L 775 85
      L 870 85
      L 870 795
      L 130 795
      Z

      M 500 315
      L 585 440
      L 500 565
      L 415 440
      Z

      M 500 220
      L 452 300
      L 548 300
      Z

      M 225 170
      L 415 440
      L 225 510
      Z

      M 775 170
      L 775 510
      L 585 440
      Z

      M 225 570
      L 435 570
      L 485 710
      L 225 710
      Z

      M 775 570
      L 775 710
      L 515 710
      L 565 570
      Z
    " />

    <!-- Official Wordmark: SMART LAB -->
    <text x="500" y="955" class="smartlab-text">SMART LAB</text>
  </g>
</svg>
"""

with open('/app/applet/public/logo.svg', 'w') as f:
    f.write(svg_content)

os.makedirs('/app/applet/assets', exist_ok=True)
with open('/app/applet/assets/logo.svg', 'w') as f:
    f.write(svg_content)

print("Saved public/logo.svg and assets/logo.svg successfully!")
