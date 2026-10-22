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

def vider_collection():
    print("--- Nettoyage de la base de données (Drop) ---")
    supprimes = 0
    
    while True:
        # On récupère les cartes par lots de 500 pour aller plus vite
        req = urllib.request.Request(f"{API_URL}?perPage=500", method="GET")
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                items = data.get("items", [])
                
                if not items:
                    break # Plus aucune carte à supprimer, on sort de la boucle
                
                # On supprime chaque carte trouvée
                for item in items:
                    id_carte = item["id"]
                    delete_url = f"{API_URL}/{id_carte}"
                    del_req = urllib.request.Request(delete_url, method="DELETE")
                    urllib.request.urlopen(del_req)
                    supprimes += 1
                    print(f"Suppression en cours... ({supprimes})", end="\r")
                    
        except Exception as e:
            print(f"\nErreur lors du nettoyage : {e}")
            break
            
    print(f"\nNettoyage terminé ! {supprimes} anciennes cartes ont été effacées.\n")

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
    vider_collection()
    importer_cartes()