import csv
import json
from pathlib import Path
import urllib.error
import urllib.request

API_URL = "http://127.0.0.1:8090/api/collections/cartes_butins/records"

# Chemin absolu calculé automatiquement :
# Path(__file__).resolve().parent correspond au dossier "python/"
# .parent remonte dans "LNDN_Deck"
BASE_DIR = Path(__file__).resolve().parent.parent
TSV_FILE = BASE_DIR / "LNDN_carte" / "data NN table carte simple - butins.tsv"
def to_int_or_none(val):
    val = val.strip()
    return int(float(val)) if val else None

def importer_cartes():
    print(f"--- Lecture de {TSV_FILE} ---")
    
    with open(TSV_FILE, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        cartes = list(reader)

    print(f"{len(cartes)} cartes détectées. Début de l'importation vers PocketBase...\n")

    reussies = 0
    erreurs = 0

    for index, c in enumerate(cartes, start=1):
        payload = {
            "cote": c.get("COTE", "").strip(),
            "nom": c.get("Nom de la carte", "").strip(),
            "zone": c.get("zone", "").strip(),
            "exemplaire": to_int_or_none(c.get("exemplaire", "")),
            "effet": c.get("Effet", "").strip(),
            "texte_ambiance": c.get("Texte d'ambiance", "").strip(),
            "valeur": to_int_or_none(c.get("Valeur", "")),
            "prix": to_int_or_none(c.get("Prix", "")),
            "prix_achat_foire": to_int_or_none(c.get("Prix d'achat foire", "")),
            "type": c.get("Type", "").strip(),
            "type_2": c.get("type 2", "").strip(),
            "pv": to_int_or_none(c.get("PV", ""))
        }

        # Nettoyage des clés vides/None pour PocketBase
        payload = {k: v for k, v in payload.items() if v is not None}

        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            API_URL, 
            data=data_bytes, 
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req) as resp:
                if resp.status == 200:
                    reussies += 1
                    print(f"[{index}/{len(cartes)}] OK : {payload.get('nom', 'Carte')}")
        except urllib.error.HTTPError as e:
            erreurs += 1
            err_msg = e.read().decode("utf-8")
            print(f"[{index}/{len(cartes)}] ERREUR sur {payload.get('nom')} : {err_msg}")
        except Exception as e:
            erreurs += 1
            print(f"[{index}/{len(cartes)}] ERREUR : {e}")

    print(f"\nTerminé ! {reussies} cartes importées avec succès ({erreurs} échecs).")

if __name__ == "__main__":
    importer_cartes()