# Instructions -- Workflow n8n RH, CRM, Facturation & Projets

**Entreprise : Pixel en Route**

## 1. Objectif du workflow

Créer un système **centralisé et automatisé** dans n8n pour : - Gestion
RH (clients, prestataires) - CRM Notion - Projets Notion (CRUD
complet) - Devis & Factures via Qonto - Contrats via Google Docs
(template) - Relances de paiement automatiques (Gmail) - Stockage
automatique sur Google Drive

------------------------------------------------------------------------

## 2. Architecture générale

### Outils utilisés

-   **n8n (self‑hosted)**
-   **Notion API**
-   **Qonto API**
-   **Google Docs API**
-   **Google Drive API**
-   **Gmail API**

------------------------------------------------------------------------

## 3. Bases Notion

### 3.1 CRM Notion

Base CRM utilisée comme **source de vérité** : - Client - Email -
Adresse - SIREN / TVA - Conditions de paiement - Statut client

### 3.2 Projets Notion

Chaque projet doit contenir : - Client (relation CRM) - Statut (Devis /
En cours / Facturé / Payé) - Montant - Date début / fin - Lien Drive -
ID Qonto (facture/devis)

------------------------------------------------------------------------

## 4. Workflows n8n à créer

------------------------------------------------------------------------

## WORKFLOW 1 -- Synchronisation CRM Notion

**Trigger** - Notion Trigger (création / modification client)

**Actions** - Validation des champs obligatoires - Normalisation des
données (email, TVA) - Log interne (Google Sheet ou Notion Log)

------------------------------------------------------------------------

## WORKFLOW 2 -- Gestion des projets Notion (CRUD)

**Trigger** - Webhook (app web) - Notion Trigger (changement statut)

**Actions** - Create / Update / Delete Project - Lien automatique vers
CRM - Création dossier Google Drive - Stockage ID dossier dans Notion

------------------------------------------------------------------------

## WORKFLOW 3 -- Génération Devis & Factures (Qonto)

**Trigger** - Changement statut projet → "À facturer"

**Actions** 1. HTTP Request → Qonto API (devis ou facture) 2.
Récupération PDF 3. Upload sur Google Drive 4. Mise à jour Notion (ID +
lien)

------------------------------------------------------------------------

## WORKFLOW 4 -- Génération contrat Google Docs

**Trigger** - Nouveau projet validé

**Actions** 1. Copie du template Google Docs 2. Remplacement variables
: - Nom client - Adresse - Montant - Dates 3. Export PDF 4. Stockage
Drive 5. Lien ajouté dans Notion

------------------------------------------------------------------------

## WORKFLOW 5 -- Envoi client automatique

**Trigger** - Devis / Contrat / Facture généré

**Actions** - Gmail Node - Pièce jointe PDF - Email personnalisé -
Historique stocké Notion

------------------------------------------------------------------------

## WORKFLOW 6 -- Relance de paiement automatique

**Trigger** - Cron (quotidien)

**Conditions** - Facture non payée - +7 / +14 / +30 jours

**Actions** - Email de relance Gmail - Ton progressif - Tag "Relancé"
dans Notion

------------------------------------------------------------------------

## 5. Sécurité & conformité

-   OAuth2 pour Google
-   Token sécurisé Qonto
-   Permissions Notion minimales
-   Logs d'exécution n8n

------------------------------------------------------------------------

## 6. Bonnes pratiques

-   1 workflow = 1 responsabilité
-   Toujours stocker les IDs externes
-   Tester chaque API séparément
-   Utiliser des variables d'environnement
-   Versionner les workflows

------------------------------------------------------------------------

## 7. Résultat final attendu

✔ CRM centralisé\
✔ Projets automatisés\
✔ Facturation sans erreur\
✔ Contrats générés automatiquement\
✔ Relances clients sans intervention\
✔ Archivage propre Google Drive

------------------------------------------------------------------------

**Auteur : N8N A.I Assistant -- by Nskha**
