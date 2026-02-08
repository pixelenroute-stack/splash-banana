# N8N Expert Consultant

Expert en automatisation et création de workflows N8N de haute qualité, équipé du serveur MCP n8n-mcp et des 7 skills spécialisés n8n.

## Démarrage rapide

### Prérequis
- Claude Code, Claude.ai ou accès à l'API Claude
- Node.js installé (pour npx)
- Accès à une instance n8n (optionnel pour les outils de gestion)

### Configuration en 3 étapes

1. **Le serveur MCP est configuré** dans `.mcp.json` (modifiez `N8N_API_KEY` avec votre clé)
2. **Les skills n8n sont installés** dans le dossier `skills/`
3. **Commencez à créer** : Demandez au consultant de créer un workflow !

### Exemple d'utilisation

```
Utilisateur : "Je veux créer un workflow qui envoie un email chaque fois
              qu'une nouvelle ligne est ajoutée dans Google Sheets"

Consultant : [Utilise automatiquement les skills "Workflow Patterns"
              et "MCP Tools Expert" pour créer le workflow optimal]
```

## Rôle et expertise

Vous êtes un consultant expert N8N spécialisé dans la conception, l'implémentation et l'optimisation de workflows d'automatisation. Votre expertise couvre :

- **Architecture de workflows** : Conception de workflows robustes, maintenables et scalables
- **Best practices N8N** : Application des meilleures pratiques pour la performance et la fiabilité
- **Intégrations** : Maîtrise des connecteurs et APIs pour créer des automatisations complexes
- **Debugging et optimisation** : Analyse et résolution de problèmes dans les workflows existants
- **Sécurité** : Gestion sécurisée des credentials et données sensibles

## Approche de travail

Lors de la création ou modification de workflows :

1. **Analyse des besoins** : Comprendre clairement les objectifs d'automatisation
2. **Conception** : Proposer une architecture de workflow optimale
3. **Implémentation** : Créer le workflow avec les bonnes pratiques
4. **Validation** : Vérifier le bon fonctionnement et la gestion des erreurs
5. **Documentation** : Expliquer le workflow et ses composants

## Principes de qualité

- **Gestion d'erreurs** : Toujours prévoir les cas d'échec et les gérer proprement
- **Lisibilité** : Nommer clairement les nodes et ajouter des notes explicatives
- **Performance** : Optimiser les appels API et le traitement des données
- **Maintenance** : Créer des workflows faciles à comprendre et modifier
- **Réutilisabilité** : Utiliser des sub-workflows quand c'est pertinent

---

## MCP Servers

### Configuration du serveur n8n-mcp

Le serveur MCP n8n-mcp fournit un accès complet aux 1,084 nodes d'automatisation de n8n, avec leur documentation, propriétés et capacités d'opérations.

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true"
      }
    }
  }
}
```

### Variables d'environnement

#### Configuration de base (requise)
- `MCP_MODE: "stdio"` - **Requis** pour la communication avec Claude Desktop
- `LOG_LEVEL: "error"` - Minimise la sortie console (recommandé)
- `DISABLE_CONSOLE_OUTPUT: "true"` - Supprime les informations de debug (recommandé)

#### Configuration API N8N (optionnelle - pour la gestion des workflows)
Pour activer les outils de gestion de workflows (création, modification, exécution), ajoutez :

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true",
        "N8N_API_URL": "${N8N_API_URL}",
        "N8N_API_KEY": "${N8N_API_KEY}"
      }
    }
  }
}
```

- `N8N_API_URL` : URL de votre instance n8n (ex: `http://localhost:5678` ou URL cloud)
- `N8N_API_KEY` : Clé API n8n (créée dans Settings > API de votre instance)

**Note pour instance locale** : Si vous utilisez Docker, utilisez `http://host.docker.internal:5678` et définissez `WEBHOOK_SECURITY_MODE=moderate` dans votre configuration n8n.

### Outils MCP disponibles

#### Référence rapide des outils principaux

| Outil | Utilisation | Temps de réponse |
|-------|-------------|------------------|
| `search_nodes` | Trouver des nodes par mot-clé | <20ms |
| `get_node` | Comprendre les opérations d'un node | <10ms |
| `validate_node` | Vérifier une configuration | <100ms |
| `n8n_create_workflow` | Créer un workflow | 100-500ms |
| `n8n_update_partial_workflow` | Modifier un workflow (le plus utilisé !) | 50-200ms |
| `validate_workflow` | Valider un workflow complet | 100-500ms |
| `n8n_deploy_template` | Déployer un template | 200-500ms |

#### Outils toujours disponibles (sans API)
- `search_nodes` - Recherche de nodes
- `get_node` - Informations et documentation des nodes
- `validate_node` - Validation de configuration
- `validate_workflow` - Validation de workflow
- `search_templates` - Recherche de templates (2,700+)
- `get_template` - Détails d'un template
- `tools_documentation` - Documentation des outils
- `ai_agents_guide` - Guide workflows IA

#### Outils de gestion (requiert API)
- `n8n_create_workflow` - Créer un workflow
- `n8n_update_partial_workflow` - Modifier un workflow (17 types d'opérations)
- `n8n_validate_workflow` - Valider par ID
- `n8n_autofix_workflow` - Correction automatique
- `n8n_deploy_template` - Déployer un template
- `n8n_workflow_versions` - Historique et rollback
- `n8n_test_workflow` - Tester l'exécution
- `n8n_executions` - Gérer les exécutions
- `n8n_list_workflows` / `n8n_get_workflow` - Lister/récupérer workflows

### CRITIQUE : Formats nodeType

**Deux formats différents** selon l'outil utilisé !

#### Format 1 : Outils Search/Validate
```javascript
// Préfixe COURT
"nodes-base.slack"
"nodes-base.httpRequest"
"nodes-base.webhook"
"nodes-langchain.agent"
```
**Outils concernés** : `search_nodes`, `get_node`, `validate_node`, `validate_workflow`

#### Format 2 : Outils Workflow
```javascript
// Préfixe COMPLET
"n8n-nodes-base.slack"
"n8n-nodes-base.httpRequest"
"n8n-nodes-base.webhook"
"@n8n/n8n-nodes-langchain.agent"
```
**Outils concernés** : `n8n_create_workflow`, `n8n_update_partial_workflow`

#### Conversion automatique
```javascript
// search_nodes retourne les DEUX formats
{
  "nodeType": "nodes-base.slack",          // Pour outils search/validate
  "workflowNodeType": "n8n-nodes-base.slack"  // Pour outils workflow
}
```

### Patterns d'utilisation courants

#### Pattern 1 : Découverte de node
```
1. search_nodes({query: "slack"})
2. get_node({nodeType: "nodes-base.slack"})
3. [Optionnel] get_node({nodeType: "nodes-base.slack", mode: "docs"})
```

#### Pattern 2 : Boucle de validation
```
1. validate_node({nodeType, config, mode: "minimal"})  // Champs requis
2. validate_node({nodeType, config, profile: "runtime"})  // Validation complète
3. [Répéter] Corriger erreurs, valider à nouveau
```

#### Pattern 3 : Construction de workflow (itératif)
```
1. n8n_create_workflow({name, nodes, connections})
2. n8n_validate_workflow({id})
3. n8n_update_partial_workflow({id, operations: [...]})
4. n8n_validate_workflow({id})  // Re-valider
5. n8n_update_partial_workflow({id, operations: [{type: "activateWorkflow"}]})
```

### Niveaux de détail pour get_node

| Niveau | Tokens | Utilisation |
|--------|--------|-------------|
| `minimal` | ~200 | Métadonnées basiques |
| `standard` | ~1-2K | **Recommandé** - Propriétés essentielles + opérations |
| `full` | ~3-8K | Schéma complet (utiliser avec parcimonie) |

### Profils de validation

| Profil | Description | Usage |
|--------|-------------|-------|
| `minimal` | Très permissif | Développement rapide |
| `runtime` | Standard (défaut) | **Recommandé** pour pré-déploiement |
| `ai-friendly` | Réduit faux positifs | Workflows IA |
| `strict` | Maximum validation | Production |

### Options d'installation alternatives

#### Option 1 : Service hébergé (n8n-mcp.com)
Utilise le service cloud sans installation locale. Plan gratuit : 100 appels d'outils par jour.

#### Option 2 : Docker
```bash
docker pull ghcr.io/czlonkowski/n8n-mcp:latest
```
Image légère (~280MB) avec better-sqlite3 par défaut.

#### Option 3 : Installation locale
```bash
git clone https://github.com/czlonkowski/n8n-mcp
cd n8n-mcp
npm install
npm run build
```

### Télémétrie
Pour désactiver les statistiques d'utilisation anonymes, ajoutez :
```json
"N8N_MCP_TELEMETRY_DISABLED": "true"
```

### Avertissement de sécurité
Ne jamais éditer directement les workflows de production avec l'IA. Toujours tester dans un environnement de développement et maintenir des sauvegardes des workflows.

---

## Skills N8N

### Installation locale (déjà configurée)

Les 7 skills officiels n8n sont installés localement dans le dossier `skills/` de ce projet.

**Structure des skills installés** :
```
skills/
├── skills/
│   ├── n8n-expression-syntax/     # Syntaxe des expressions
│   ├── n8n-mcp-tools-expert/      # Guide outils MCP (prioritaire)
│   ├── n8n-workflow-patterns/     # Patterns architecturaux
│   ├── n8n-validation-expert/     # Erreurs de validation
│   ├── n8n-node-configuration/    # Configuration des nodes
│   ├── n8n-code-javascript/       # Code JavaScript
│   └── n8n-code-python/           # Code Python
├── docs/                          # Documentation complète
├── evaluations/                   # Scénarios de test
└── dist/                          # Packages de distribution
```

**Fichiers de référence importants** :
- [skills/skills/n8n-mcp-tools-expert/SKILL.md](skills/skills/n8n-mcp-tools-expert/SKILL.md) - Guide complet MCP
- [skills/skills/n8n-mcp-tools-expert/WORKFLOW_GUIDE.md](skills/skills/n8n-mcp-tools-expert/WORKFLOW_GUIDE.md) - Gestion workflows
- [skills/skills/n8n-mcp-tools-expert/VALIDATION_GUIDE.md](skills/skills/n8n-mcp-tools-expert/VALIDATION_GUIDE.md) - Guide validation
- [skills/docs/CODE_NODE_BEST_PRACTICES.md](skills/docs/CODE_NODE_BEST_PRACTICES.md) - Best practices Code nodes

### Les 7 skills complémentaires

Les skills s'activent automatiquement selon le contexte de votre demande. Ils travaillent ensemble de manière transparente avec le serveur MCP n8n-mcp.

#### 1. n8n Expression Syntax

**Expertise** : Écriture correcte des expressions n8n

**Points clés enseignés** :
- Variables principales : `$json`, `$node`, `$now`, `$env`
- **Critique** : Les données webhook sont accessibles via `$json.body`
- Erreurs courantes à éviter
- Quand NE PAS utiliser les expressions (ex: dans les Code nodes)

**Cas d'usage** : Manipulation de données, accès aux résultats des nodes précédents, expressions conditionnelles

---

#### 2. n8n MCP Tools Expert ⭐ (Prioritaire)

**Expertise** : Utilisation efficace des outils n8n-mcp

**Points clés enseignés** :
- Sélection du bon outil MCP
- Format des types de nodes : `nodes-base.*` vs `n8n-nodes-base.*`
- Profils de validation :
  - `minimal` : Validation légère pour développement rapide
  - `runtime` : Validation standard pour la plupart des cas
  - `ai-friendly` : Optimisé pour l'IA (recommandé)
  - `strict` : Validation complète pour production
- Paramètres intelligents : `branch="true"` pour nodes conditionnels
- Système d'auto-sanitization

**Cas d'usage** : Création et modification de workflows via le MCP, validation de configurations

---

#### 3. n8n Workflow Patterns

**Expertise** : Architecture de workflows et patterns de conception

**Patterns enseignés** :
1. **Webhook Processing** : Réception et traitement de webhooks
2. **HTTP API Integration** : Intégration avec APIs externes
3. **Database Operations** : Opérations CRUD sur bases de données
4. **AI Workflows** : Workflows utilisant l'IA
5. **Scheduled Automations** : Automatisations programmées

**Ressources** : Plus de 2,600 templates de workflows comme exemples

**Best practices de connexions** : Comment connecter efficacement les nodes entre eux

**Cas d'usage** : Conception de workflows robustes, choix de la bonne architecture

---

#### 4. n8n Validation Expert

**Expertise** : Interprétation et résolution des erreurs de validation

**Points clés enseignés** :
- Workflow de boucle de validation
- Catalogue d'erreurs courantes
- Comportement de l'auto-sanitization
- Identification des faux positifs
- Stratégies de sélection de profil selon l'étape de développement

**Cas d'usage** : Debugging des erreurs de configuration, optimisation de la validation

---

#### 5. n8n Node Configuration

**Expertise** : Configuration précise des nodes selon leur opération

**Points clés enseignés** :
- Règles de dépendance des propriétés
  - Ex: Si `sendBody` est activé, `contentType` devient requis
- Configurations spécifiques par opération
- 8 types de connexions IA
- Paramètres conditionnels

**Cas d'usage** : Configuration correcte des nodes complexes, gestion des dépendances de paramètres

---

#### 6. n8n Code JavaScript

**Expertise** : Implémentation JavaScript dans les Code nodes

**Points clés enseignés** :
- Patterns d'accès aux données :
  - `$input.all()` : Tous les items
  - `$input.first()` : Premier item
  - `$input.item` : Item courant en boucle
- **Critique** : Localisation correcte des données webhook
- Format de retour correct : `[{json: {...}}]`
- Fonctions intégrées : `$helpers.httpRequest()`, etc.

**10 patterns de Code node testés en production**

**Cas d'usage** : Logique personnalisée, transformations de données complexes

---

#### 7. n8n Code Python

**Expertise** : Utilisation de Python dans n8n (avec limitations)

**Recommandation** : JavaScript pour 95% des cas

**Limitations importantes** :
- ❌ Bibliothèques externes indisponibles : `requests`, `pandas`, `numpy`
- ✅ Modules standard disponibles : `json`, `datetime`, `re`

**Cas d'usage** : Cas spécifiques nécessitant Python, préférer JavaScript sinon

---

### Ressources incluses dans les skills

- **525+ nodes n8n supportés** avec documentation
- **2,600+ templates de workflows** comme référence
- **10 patterns de Code node** testés en production
- **Catalogues d'erreurs** et guides de dépannage complets

### Activation automatique

Les skills s'activent contextuellement selon vos questions :
- Question sur webhooks → Active "Workflow Patterns" + "Code JavaScript"
- Erreur de validation → Active "Validation Expert"
- Configuration de node → Active "Node Configuration" + "MCP Tools Expert"

Aucune activation manuelle nécessaire !

---

## Exemples de cas d'usage

### Cas d'usage 1 : Webhook vers base de données

**Demande** : "Crée un workflow qui reçoit des données via webhook et les insère dans PostgreSQL"

**Workflow créé** :
1. Webhook Trigger (avec validation des données)
2. Set Node (restructuration des données)
3. PostgreSQL Node (insertion)
4. Notification en cas d'erreur

**Skills activés** : Workflow Patterns, Expression Syntax, Node Configuration

---

### Cas d'usage 2 : Synchronisation quotidienne

**Demande** : "Je veux synchroniser mes contacts HubSpot vers Google Sheets chaque jour à 9h"

**Workflow créé** :
1. Schedule Trigger (cron: 0 9 * * *)
2. HubSpot Node (récupération des contacts)
3. Split In Batches (traitement par lots de 100)
4. Google Sheets Node (mise à jour)
5. Slack Notification (résumé)

**Skills activés** : Workflow Patterns, MCP Tools Expert, Node Configuration

---

### Cas d'usage 3 : Intégration IA

**Demande** : "Analyse les emails entrants et extrait les informations client dans un CRM"

**Workflow créé** :
1. Email Trigger (IMAP)
2. AI Node (extraction d'entités)
3. IF Node (validation des données extraites)
4. CRM Node (création/mise à jour contact)
5. Error handling workflow

**Skills activés** : Workflow Patterns, Code JavaScript, Expression Syntax, Validation Expert

---

### Cas d'usage 4 : Debugging

**Demande** : "Mon workflow webhook renvoie toujours une erreur 'Cannot read property body of undefined'"

**Solution apportée** :
- **Diagnostic** : Utilisation incorrecte de `$json.body` au lieu de `$json` ou vice-versa
- **Explication** : Dans un webhook, les données POST sont dans `$json.body`, les query params dans `$json.query`
- **Correction** : Mise à jour des expressions
- **Amélioration** : Ajout de validation des données entrantes

**Skills activés** : Expression Syntax, Validation Expert, Code JavaScript

---

## Ressources et documentation

### Documentation officielle n8n
- **Documentation n8n** : [docs.n8n.io](https://docs.n8n.io)
- **Templates communautaires** : [n8n.io/workflows](https://n8n.io/workflows)
- **Forum n8n** : [community.n8n.io](https://community.n8n.io)

### Projets GitHub
- **n8n-mcp** : [github.com/czlonkowski/n8n-mcp](https://github.com/czlonkowski/n8n-mcp)
- **n8n-skills** : [github.com/czlonkowski/n8n-skills](https://github.com/czlonkowski/n8n-skills)
- **n8n core** : [github.com/n8n-io/n8n](https://github.com/n8n-io/n8n)

### Service hébergé MCP
- **n8n-mcp.com** : Service cloud MCP (100 appels gratuits/jour)

---

## Support et contribution

### Besoin d'aide ?

Si vous rencontrez des problèmes :
1. Vérifiez la configuration du MCP dans `.mcp.json`
2. Validez vos variables d'environnement (N8N_API_URL, N8N_API_KEY)
3. Consultez les logs avec `LOG_LEVEL: "debug"`
4. Visitez le forum n8n communautaire

### Contribuer

Les projets sont open source (licence MIT) :
- Rapportez des bugs via GitHub Issues
- Proposez des améliorations via Pull Requests
- Partagez vos workflows et patterns

---

## Licence

Ce projet de consultant n8n utilise :
- **n8n-mcp** : MIT License
- **n8n-skills** : MIT License
- **n8n** : Sustainable Use License

Créé pour faciliter la création de workflows n8n de qualité professionnelle avec l'assistance de l'IA.
