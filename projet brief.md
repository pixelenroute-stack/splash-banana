&nbsp;🚀 Projet : Splash Banana - Plateforme SaaS de Production Vidéo



\*\*Date :\*\* 27 Octobre 2023

\*\*Client :\*\* Agence de Montage Vidéo "Splash Banana"

\*\*Objet :\*\* Développement d'une application web interne (SaaS) "All-in-One"



---



\## 1. Vision \& Objectifs

Je dirige une agence de montage vidéo et je perds trop de temps à jongler entre 10 outils différents (Gmail, Notion, Drive, Midjourney, ChatGPT, Excel...).



\*\*Mon objectif :\*\* Centraliser toute mon activité dans une seule interface web ultra-moderne. Je veux une "Tour de Contrôle" qui permet de gérer mes clients, mes factures, mais surtout de \*\*produire du contenu grâce à l'IA\*\* (scripts, images, vidéos) et d'automatiser mes tâches administratives.



L'application doit être \*\*rapide\*\*, \*\*sécurisée\*\* et avoir un \*\*design "Dark Mode" immersif\*\* (style logiciel de montage pro / Netflix).



---



\## 2. Stack Technique Imposée

Je veux que l'application soit construite sur des bases solides et modernes pour pouvoir évoluer plus tard.



\*   \*\*Frontend :\*\* React 19, Next.js 15 (App Router), TypeScript, TailwindCSS.

\*   \*\*Backend / Base de données :\*\* Supabase (PostgreSQL + Auth + Storage). Je veux que les données soient persistantes.

\*   \*\*Automatisation \& IA :\*\*

&nbsp;   \*   \*\*Google Gemini\*\* (via API) pour l'intelligence textuelle et l'analyse.

&nbsp;   \*   \*\*n8n\*\* (Orchestrateur) pour gérer les workflows complexes (génération d'images, sync CRM, scraping).

\*   \*\*Intégrations :\*\* Google Workspace (Gmail, Calendar, Drive).



---



\## 3. Fonctionnalités Requises (Scope MVP)



\### A. Authentification \& Sécurité

\*   Page de login sécurisée (Email/Mot de passe).

\*   Système de rôles : \*\*Admin\*\* (Moi, accès total), \*\*Collaborateur\*\* (Monteurs, accès limité).

\*   \*Optionnel :\* Login via Google.



\### B. Dashboard "Cockpit"

\*   Vue d'ensemble de l'activité en temps réel.

\*   Statistiques clés (CA, Factures en attente, Tokens IA consommés).

\*   Aperçu rapide des derniers emails non lus et des événements à venir.



\### C. Le "Chat Studio" (Cœur du système)

\*   Une interface de chat conversationnel avec une IA spécialisée "Assistant de Production".

\*   L'IA doit être capable d'exécuter des actions (Tool Calling) : créer un client, lancer une génération d'image, analyser un fichier PDF.

\*   Support du Drag \& Drop de fichiers pour analyse.



\### D. Studio Créatif (IA Generative)

Je veux des interfaces dédiées pour la création, pas juste du chat.

1\.  \*\*Générateur de Scripts :\*\* Formulaires pour créer des scripts viraux (TikTok/Shorts) basés sur une analyse de tendance.

2\.  \*\*Studio Image (Banana) :\*\* Interface pour générer des images via IA (Flux/Midjourney via n8n), avec historique et galerie.

3\.  \*\*Studio Vidéo (Veo) :\*\* Interface pour générer des clips vidéos courts via Google Veo.



\### E. Gestion \& CRM

\*   \*\*Clients :\*\* Liste des clients, synchronisée si possible avec un Google Sheet ou Notion. Fiches détaillées avec contacts sociaux.

\*   \*\*Projets :\*\* Suivi type Kanban ou Liste (À faire, En cours, Validé).

\*   \*\*Facturation :\*\* Génération de devis et factures PDF, suivi des paiements.



\### F. Google Workspace Intégré

Je ne veux plus ouvrir mes onglets Google. Tout doit être là :

\*   \*\*Gmail :\*\* Lire et répondre aux mails.

\*   \*\*Calendar :\*\* Voir mon planning et créer des RDV.

\*   \*\*Drive :\*\* Naviguer dans mes dossiers de rushs et uploader des fichiers.



\### G. Administration

\*   Une console admin pour gérer les clés API (Gemini, n8n, etc.) sans redéployer le code.

\*   Logs d'audit pour voir qui a fait quoi.



---



\## 4. Design \& UX

\*   \*\*Ambiance :\*\* Dark mode obligatoire. Couleurs accent : Bleu électrique (#3b82f6) et Violet.

\*   \*\*Navigation :\*\* Sidebar latérale gauche fixe repliable.

\*   \*\*Réactivité :\*\* L'interface doit être fluide, pas de rechargement de page intempestif (SPA).



---



\## 5. Livrables Attendus

1\.  Code source complet (Repo Git).

2\.  Script de configuration de la base de données (SQL Supabase).

3\.  Guide d'installation (Comment lancer le projet, configurer les variables d'environnement).

4\.  L'application fonctionnelle déployable sur Vercel ou Hostinger.



---



\*\*Note pour le développeur :\*\*

Je suis prêt à utiliser des données "Mock" (fictives) pour les parties qui nécessitent des API payantes complexes (comme Veo ou certaines fonctions n8n) si tu n'as pas les accès, mais l'architecture doit être prête pour la production.



Fais-moi rêver !



