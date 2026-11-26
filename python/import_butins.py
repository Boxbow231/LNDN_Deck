import csv
import os
from pathlib import Path
import pymysql

# === CONFIGURATION MARIADB ===
# Tu peux définir ces variables d'environnement ou renseigner les valeurs par défaut en local
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER", "lndn_app"),
    "password": os.getenv("DB_PASSWORD", "TON_MOT_DE_PASSE_SOLIDE"),
    "database": os.getenv("DB_NAME", "lndn_deck"),
    "charset": "utf8mb4",
}

BASE_DIR = Path(__file__).resolve().parent.parent
TSV_FILE = BASE_DIR / "LNDN_carte" / "data NN table carte simple - butins.tsv"


def to_int_or_default(val, default=None):
    if val is None:
        return default
    val = val.strip().replace(",", ".")
    if not val:
        return default
    try:
        return int(float(val))
    except ValueError:
        return default


def to_str_or_none(val):
    if val is None:
        return None
    val = val.strip()
    return val if val else None


def importer_cartes():
    print(f"--- Lecture de {TSV_FILE} ---")

    with open(TSV_FILE, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter="\t")
        cartes = list(reader)

    print(f"{len(cartes)} lignes détectées. Connexion à MariaDB...")

    sql = """
        INSERT INTO cartes_butins (
            cote, nom, zone, exemplaire, effet, texte_ambiance,
            valeur, prix, prix_achat_foire, type, type_2, pv
        )
        VALUES (
            %(cote)s, %(nom)s, %(zone)s, %(exemplaire)s, %(effet)s, %(texte_ambiance)s,
            %(valeur)s, %(prix)s, %(prix_achat_foire)s, %(type)s, %(type_2)s, %(pv)s
        )
        ON DUPLICATE KEY UPDATE
            nom = VALUES(nom),
            zone = VALUES(zone),
            exemplaire = VALUES(exemplaire),
            effet = VALUES(effet),
            texte_ambiance = VALUES(texte_ambiance),
            valeur = VALUES(valeur),
            prix = VALUES(prix),
            prix_achat_foire = VALUES(prix_achat_foire),
            type = VALUES(type),
            type_2 = VALUES(type_2),
            pv = VALUES(pv)
    """

    lignes_a_inserer = []
    ignorees = 0

    for c in cartes:
        cote = to_str_or_none(c.get("COTE"))
        if not cote:
            ignorees += 1
            continue

        lignes_a_inserer.append({
            "cote": cote,
            "nom": to_str_or_none(c.get("Nom de la carte")) or "Sans nom",
            "zone": to_str_or_none(c.get("zone")),
            "exemplaire": to_int_or_default(c.get("exemplaire"), default=1),
            "effet": to_str_or_none(c.get("Effet")),
            "texte_ambiance": to_str_or_none(c.get("Texte d'ambiance")),
            "valeur": to_int_or_default(c.get("Valeur"), default=0),
            "prix": to_int_or_default(c.get("Prix"), default=None),
            "prix_achat_foire": to_int_or_default(c.get("Prix d'achat foire"), default=None),
            "type": to_str_or_none(c.get("Type")),
            "type_2": to_str_or_none(c.get("type 2")),
            "pv": to_int_or_default(c.get("PV"), default=None),
        })

    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            cursor.executemany(sql, lignes_a_inserer)
        conn.commit()
        print(f"Terminé ! {len(lignes_a_inserer)} cartes insérées/mises à jour ({ignorees} lignes vides ignorées).")
    except Exception as e:
        conn.rollback()
        print(f"Erreur SQL, annulation complète (rollback) : {e}")
    finally:
        conn.close()


if __name__ == "__main__":
    importer_cartes()