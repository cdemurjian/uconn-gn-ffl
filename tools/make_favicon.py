"""Generate favicon.ico from the league logo.

The logo is not square; pad it onto a square white canvas so the icon is
not distorted. Re-run after replacing assets/img/logo.png.
"""

from PIL import Image

SRC = "assets/img/logo.png"
DST = "favicon.ico"
SIZES = [(16, 16), (32, 32), (48, 48)]


def square_canvas(img):
    side = max(img.size)
    canvas = Image.new("RGBA", (side, side), (255, 255, 255, 255))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)
    return canvas


def main():
    logo = Image.open(SRC).convert("RGBA")
    square_canvas(logo).save(DST, format="ICO", sizes=SIZES)
    print(f"wrote {DST} from {SRC} at sizes {SIZES}")


if __name__ == "__main__":
    main()
