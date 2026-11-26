CREATE DATABASE IF NOT EXISTS lndn_deck
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE lndn_deck;

-- ============================================================
-- 1. UTILISATEURS
-- ============================================================
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    verified TINYINT(1) NOT NULL DEFAULT 0,
    email_visibility TINYINT(1) NOT NULL DEFAULT 0,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 2. AMIS
-- ============================================================
CREATE TABLE amis (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    demandeur_id INT UNSIGNED NOT NULL,
    receveur_id INT UNSIGNED NOT NULL,
    statut ENUM('en_attente', 'accepte', 'refuse') NOT NULL DEFAULT 'en_attente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_amitie (demandeur_id, receveur_id),
    CONSTRAINT chk_amis_diff CHECK (demandeur_id <> receveur_id),
    CONSTRAINT fk_amis_demandeur FOREIGN KEY (demandeur_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_amis_receveur FOREIGN KEY (receveur_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 3. CATALOGUE DES CARTES BUTINS
-- ============================================================
CREATE TABLE cartes_butins (
    cote VARCHAR(20) PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    zone VARCHAR(100) DEFAULT NULL,
    exemplaire INT UNSIGNED NOT NULL DEFAULT 1,
    effet TEXT,
    texte_ambiance TEXT,
    valeur INT NOT NULL DEFAULT 0,
    prix INT DEFAULT NULL,
    prix_achat_foire INT DEFAULT NULL,
    type VARCHAR(50) DEFAULT NULL,
    type_2 VARCHAR(50) DEFAULT NULL,
    pv INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cartes_zone (zone),
    INDEX idx_cartes_nom (nom)
) ENGINE=InnoDB;

-- ============================================================
-- 4. AVENTURES
-- ============================================================
CREATE TABLE aventures (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(150) NOT NULL,
    createur_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_aventures_createur FOREIGN KEY (createur_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 5. PARTICIPANTS (Droits par aventure)
-- ============================================================
CREATE TABLE participants (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    aventure_id INT UNSIGNED NOT NULL,
    utilisateur_id INT UNSIGNED NOT NULL,
    permission ENUM('spectateur', 'deck', 'admin') NOT NULL DEFAULT 'spectateur',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_participant (aventure_id, utilisateur_id),
    CONSTRAINT fk_participants_aventure FOREIGN KEY (aventure_id) REFERENCES aventures(id) ON DELETE CASCADE,
    CONSTRAINT fk_participants_user FOREIGN KEY (utilisateur_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 6. JOUEURS / HÉROS (Les 4 emplacements d'une aventure)
-- ============================================================
CREATE TABLE joueurs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    aventure_id INT UNSIGNED NOT NULL,
    utilisateur_id INT UNSIGNED NOT NULL,
    vrai_compte_id INT UNSIGNED DEFAULT NULL,
    nom_provisoire VARCHAR(100) NOT NULL,
    emplacement TINYINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_aventure_slot (aventure_id, emplacement),
    CONSTRAINT chk_emplacement CHECK (emplacement BETWEEN 1 AND 4),
    CONSTRAINT fk_joueurs_aventure FOREIGN KEY (aventure_id) REFERENCES aventures(id) ON DELETE CASCADE,
    CONSTRAINT fk_joueurs_user FOREIGN KEY (utilisateur_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_joueurs_vrai_compte FOREIGN KEY (vrai_compte_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 7. DECKS (Cartes possédées par chaque héros)
-- ============================================================
CREATE TABLE deck_cartes (
    joueur_id INT UNSIGNED NOT NULL,
    carte_cote VARCHAR(20) NOT NULL,
    quantite INT UNSIGNED NOT NULL DEFAULT 1,
    PRIMARY KEY (joueur_id, carte_cote),
    CONSTRAINT chk_deck_quantite CHECK (quantite > 0),
    CONSTRAINT fk_deck_joueur FOREIGN KEY (joueur_id) REFERENCES joueurs(id) ON DELETE CASCADE,
    CONSTRAINT fk_deck_carte FOREIGN KEY (carte_cote) REFERENCES cartes_butins(cote) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 8. LA FOIRE DE FARCIMINIS (3 slots communs par aventure)
-- ============================================================
CREATE TABLE aventure_foire (
    aventure_id INT UNSIGNED NOT NULL,
    slot TINYINT UNSIGNED NOT NULL,
    carte_cote VARCHAR(20) NOT NULL,
    PRIMARY KEY (aventure_id, slot),
    CONSTRAINT chk_foire_slot CHECK (slot BETWEEN 1 AND 3),
    CONSTRAINT fk_foire_aventure FOREIGN KEY (aventure_id) REFERENCES aventures(id) ON DELETE CASCADE,
    CONSTRAINT fk_foire_carte FOREIGN KEY (carte_cote) REFERENCES cartes_butins(cote) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 9. ZONE DE BANNISSEMENT (Comptage par exemplaire)
-- ============================================================
CREATE TABLE aventure_bannissements (
    aventure_id INT UNSIGNED NOT NULL,
    carte_cote VARCHAR(20) NOT NULL,
    quantite INT UNSIGNED NOT NULL DEFAULT 1,
    PRIMARY KEY (aventure_id, carte_cote),
    CONSTRAINT chk_ban_quantite CHECK (quantite > 0),
    CONSTRAINT fk_ban_aventure FOREIGN KEY (aventure_id) REFERENCES aventures(id) ON DELETE CASCADE,
    CONSTRAINT fk_ban_carte FOREIGN KEY (carte_cote) REFERENCES cartes_butins(cote) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 10. INVITATIONS AUX AVENTURES
-- ============================================================
CREATE TABLE invitations_aventures (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    aventure_id INT UNSIGNED NOT NULL,
    demandeur_id INT UNSIGNED NOT NULL,
    receveur_id INT UNSIGNED NOT NULL,
    emplacement TINYINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_invit_slot (aventure_id, emplacement),
    CONSTRAINT chk_invit_slot CHECK (emplacement BETWEEN 1 AND 4),
    CONSTRAINT fk_invit_aventure FOREIGN KEY (aventure_id) REFERENCES aventures(id) ON DELETE CASCADE,
    CONSTRAINT fk_invit_demandeur FOREIGN KEY (demandeur_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_invit_receveur FOREIGN KEY (receveur_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 11. GRIMOIRE DES MALÉDICTIONS (Signalement de bugs)
-- ============================================================
CREATE TABLE maledictions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    auteur VARCHAR(100) DEFAULT NULL,
    reponse TEXT DEFAULT NULL,
    resolu TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;