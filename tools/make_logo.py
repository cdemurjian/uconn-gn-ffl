"""Build assets/img/logo.png from assets/img/logo-source.png.

The source has an opaque white background, which shows as a visible box against
the page tint. Knocking out "all white" would also punch holes in the husky's
face and the lettering, so instead this flood-fills inwards from the border:
only white connected to an edge becomes transparent.

Re-run after replacing the source image.
"""

from collections import deque

from PIL import Image

SRC = "assets/img/logo-source.png"
DST = "assets/img/logo.png"
# How far from pure white still counts as background.
TOLERANCE = 26


def is_background(pixel):
    r, g, b = pixel[:3]
    return r >= 255 - TOLERANCE and g >= 255 - TOLERANCE and b >= 255 - TOLERANCE


def main():
    img = Image.open(SRC).convert("RGBA")
    width, height = img.size
    px = img.load()

    seen = [[False] * width for _ in range(height)]
    queue = deque()

    for x in range(width):
        for y in (0, height - 1):
            if is_background(px[x, y]):
                queue.append((x, y))
                seen[y][x] = True
    for y in range(height):
        for x in (0, width - 1):
            if is_background(px[x, y]):
                queue.append((x, y))
                seen[y][x] = True

    cleared = 0
    while queue:
        x, y = queue.popleft()
        px[x, y] = (255, 255, 255, 0)
        cleared += 1
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height and not seen[ny][nx]:
                if is_background(px[nx, ny]):
                    seen[ny][nx] = True
                    queue.append((nx, ny))

    img.save(DST)
    total = width * height
    print(f"wrote {DST}: cleared {cleared}/{total} px ({100 * cleared / total:.1f}%)")


if __name__ == "__main__":
    main()
