from flask import Flask, request, jsonify, send_file
from rdkit import Chem
from rdkit.Chem import Draw
import io, base64

app = Flask(__name__)

@app.route("/render", methods=["GET"])
def render():
    name = request.args.get("name")
    if not name:
        return jsonify({"error": "Missing ?name=<molecule> parameter"}), 400

    mol = None
    try:
        mol = Chem.MolFromSmiles(name)
        if mol is None:
            # naive: try lowercased SMILES (not always helpful)
            mol = Chem.MolFromSmiles(name.lower())
    except Exception:
        mol = None

    if mol is None:
        return jsonify({"error": "Unable to parse molecule. Use SMILES or valid chemical name."}), 400

    img = Draw.MolToImage(mol, size=(400, 300))
    bio = io.BytesIO()
    img.save(bio, format="PNG")
    bio.seek(0)
    b64 = base64.b64encode(bio.read()).decode("utf-8")

    return jsonify({
        "url": f"data:image/png;base64,{b64}",
        "name": name
    })

@app.route("/health")
def health():
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
