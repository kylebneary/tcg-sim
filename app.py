from flask import Flask, render_template, request, abort
from PIL import Image
import io, time, base64, random

app = Flask(__name__)

@app.get("/")
def index():
    return render_template("index.html")

@app.post("/identify")
def identify():
    file = request.files.get("frame")
    slot_id = request.form.get("slot_id")  # which grid cell to fill
    if not file or not slot_id:
        abort(400, "Missing frame or slot_id")

    # Read image & make a tiny thumbnail (client sent a full frame)
    img = Image.open(io.BytesIO(file.read())).convert("RGB")
    img.thumbnail((300, 300))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    thumb_b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    data_url = f"data:image/jpeg;base64,{thumb_b64}"

    # ----- stubbed identification result -----
    # Replace this with your model inference.
    demo_cards = [
        ("Ivysaur","Base Set 2","30/130"),
        ("Magnemite","Obsidian Flames","68/197"),
        ("Kilowattrel","Paldea Evolved","078/193"),
        ("Pikachu","Scarlet & Violet Promo","SVP001"),
        ("Charizard","Obsidian Flames","125/197"),
        ("Bulbasaur","Pokémon GO","001/078"),
        ("Gengar","Lost Origin","066/196"),
        ("Mew","Celebrations","011/025"),
        ("Eevee","Hidden Fates","048/068"),
        ("Squirtle","Pokémon GO","007/078"),
    ]
    name, set_name, number = random.choice(demo_cards)
    confidence = round(random.uniform(0.80, 0.97), 2)

    return render_template(
        "_card_tile.html",
        slot_id=slot_id,
        image_url=data_url,
        name=name,
        set_name=set_name,
        number=number,
        confidence=confidence,
        ts=int(time.time())
    )

if __name__ == "__main__":
    app.run(debug=True)
