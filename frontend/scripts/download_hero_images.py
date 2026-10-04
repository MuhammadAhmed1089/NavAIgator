import os
import urllib.request
import json
from PIL import Image, ImageFilter

IMAGES = {
    'la': {
        'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Los_Angeles_Skyline_%288001389775%29.jpg/1200px-Los_Angeles_Skyline_%288001389775%29.jpg',
        'photographer': 'Wikimedia',
        'source': 'Wikimedia Commons'
    },
    'nj': {
        'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Jersey_City_skyline_from_Hudson_River.jpg/1200px-Jersey_City_skyline_from_Hudson_River.jpg',
        'photographer': 'Wikimedia',
        'source': 'Wikimedia Commons'
    },
    'ma': {
        'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Boston_Back_Bay_from_Cambridge.jpg/1200px-Boston_Back_Bay_from_Cambridge.jpg',
        'photographer': 'Wikimedia',
        'source': 'Wikimedia Commons'
    }
}

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public', 'images', 'hero'))
os.makedirs(base_dir, exist_ok=True)

attribution_lines = ["# Image Attribution\n"]

for name, info in IMAGES.items():
    print(f"Downloading {name}...")
    req = urllib.request.Request(info['url'], headers={'User-Agent': 'Mozilla/5.0'})
    img_data = urllib.request.urlopen(req).read()
    
    if len(img_data) < 50000:
        raise Exception(f"Image {name} is too small!")
        
    temp_path = os.path.join(base_dir, f"{name}_temp.jpg")
    with open(temp_path, 'wb') as f:
        f.write(img_data)
        
    try:
        with Image.open(temp_path) as img:
            img = img.convert('RGB')
            # Save original JPG
            jpg_path = os.path.join(base_dir, f"{name}.jpg")
            img.save(jpg_path, 'JPEG', quality=85)
            
            # Save WebP
            webp_path = os.path.join(base_dir, f"{name}.webp")
            img.save(webp_path, 'WEBP', quality=85)
            
            # Save blur placeholder
            blur_path = os.path.join(base_dir, f"{name}_blur.jpg")
            img.resize((20, int(20 * img.height / img.width))).filter(ImageFilter.GaussianBlur(2)).save(blur_path, 'JPEG', quality=50)
            
    except Exception as e:
        raise Exception(f"Failed to process {name}: {e}")
    finally:
        os.remove(temp_path)
        
    attribution_lines.append(f"- **{name.upper()}**: Photo by {info['photographer']} on {info['source']} ({info['url']}) - Free to use under Unsplash License.\n")

with open(os.path.join(base_dir, 'ATTRIBUTION.md'), 'w', encoding='utf-8') as f:
    f.writelines(attribution_lines)

print("Images downloaded and processed successfully!")
