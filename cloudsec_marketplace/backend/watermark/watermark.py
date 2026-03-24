from PIL import Image, ImageFilter

def full_watermark(
    input_image_path: str,
    watermark_path: str,
    output_image_path: str,
    opacity: float = 0.70
):              #Change values above as needed
    base = Image.open(input_image_path).convert("RGBA")
    base = base.filter(ImageFilter.GaussianBlur(radius=1.5))
    watermark = Image.open(watermark_path).convert("RGBA")

    watermark = watermark.resize(base.size, Image.LANCZOS)
    if opacity < 1.0:
        alpha = watermark.getchannel("A")
        alpha = alpha.point(lambda p: int(p * opacity))
        watermark.putalpha(alpha)
    
    result = Image.alpha_composite(base, watermark)

    if output_image_path.lower().endswith((".jpg", ".jpeg")):
        result = result.convert("RGB")
    
    result.save(output_image_path)
    print(f"Successfully saved watermarked image to: {output_image_path}")


#Example ----------------------------------------------------------------------------------------------------------------------------------------
#This is how you call this function

#Uncomment:
#full_watermark(input_image_path="frog.jpg", watermark_path="slime_watermark.png", output_image_path="preview.jpg")

#End Example-------------------------------------------------------------------------------------------------------------------------------------