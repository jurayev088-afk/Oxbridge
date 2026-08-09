from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import os

src = r"C:\Users\User\.cursor\projects\c-Users-User-Desktop-crm-sayt\assets\c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_photo-de2f09de-739c-48f8-bfde-736191a42af0.png"
out = r"C:\Users\User\Desktop\crm sayt\enhanced_selfie.png"

img = Image.open(src).convert("RGB")

# Selfie: flip so background text reads correctly
img = ImageOps.mirror(img)

# Slight crop for tighter composition (remove excess ceiling/wall)
w, h = img.size
left = int(w * 0.02)
top = int(h * 0.05)
right = int(w * 0.98)
bottom = int(h * 0.98)
img = img.crop((left, top, right, bottom))

# Auto contrast for better dynamic range
img = ImageOps.autocontrast(img, cutoff=1)

# Warm, vibrant color balance
img = ImageEnhance.Color(img).enhance(1.12)
img = ImageEnhance.Contrast(img).enhance(1.08)
img = ImageEnhance.Brightness(img).enhance(1.04)
img = ImageEnhance.Sharpness(img).enhance(1.25)

# Subtle smooth finish
img = img.filter(ImageFilter.SMOOTH_MORE)

# Final polish sharpen
img = ImageEnhance.Sharpness(img).enhance(1.15)

img.save(out, "PNG", optimize=True)
print(f"Saved: {out}")
