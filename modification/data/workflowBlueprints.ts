
export const WORKFLOW_BLUEPRINTS = {
  // --- 1. GÉNÉRAL ---
  chat_orchestrator: {
    title: "1. Chat Agent (Orchestrator)",
    category: "Général",
    description: "Cerveau central haute performance. Il utilise une mémoire vectorielle Supabase pour le contexte long terme (RAG) et route intelligemment les demandes vers les sous-systèmes.",
    n8n_nodes: [
      "1. Webhook (POST /chat)",
      "2. Supabase Vector Store (Retrieve Context)",
      "3. AI Agent (LangChain) - Model: gemini-3-pro-preview",
      "4. Tool: Memory Buffer (Supabase Postgres)",
      "5. Router Switch (Router vers: Image, Video, Gestion, Web)",
      "6. Response Webhook (Streaming supporté)"
    ],
    json_structure: `{
  "action": "chat",
  "sessionId": "session_user_1",
  "message": "Analyse ce contrat et crée une facture de 500€",
  "history": [...]
}`,
    tips: [
      "Utilisez 'gemini-3-pro-preview' pour le raisonnement complexe et le routing.",
      "Stockez l'historique de chat dans une table 'chat_history' sur Supabase pour la persistance cross-session."
    ]
  },

  news_agent: {
    title: "2. News & Veille",
    category: "Général",
    description: "Système de veille complet. Récupère les actualités du jour sur les axes : À la une, Politique & Législation, Technologie & IA, Montage Vidéo, Motion Design, et la Météo locale.",
    n8n_nodes: [
      "1. Schedule Trigger (Every morning) OR Webhook",
      "2. Parallel Branches (Multi-source Fetching)",
      "   ├── Branch A: Google News (Headlines, Politique)",
      "   ├── Branch B: NewsAPI/Perplexity (Tech, IA)",
      "   ├── Branch C: GNews/Youtube (Montage, Motion)",
      "   └── Branch D: OpenWeatherMap (Météo)",
      "3. AI Summarize & Format (gemini-3-flash)",
      "4. Supabase: Insert (Table 'news_feed')"
    ],
    json_structure: `{
  "type": "news_generation",
  "categories": ["headline", "politics", "tech", "editing", "motion"],
  "location": "Paris"
}`,
    tips: [
      "Utilisez Perplexity pour les sujets de niche comme le 'Motion Design' pour avoir des sources plus pertinentes.",
      "La météo doit être récupérée en parallèle pour ne pas ralentir le flux d'actualités."
    ]
  },

  // --- 3. CREATOR IA ---
  video_editor: {
    title: "3. Monteur Vidéo (Script, Rushs & Tutos)",
    category: "Creator IA",
    description: "Assistant de post-production complet. 1) Analyse la DA et scanne les rushs bruts pour identifier les 'Golden Moments' et les emplacements d'illustrations/animations. 2) Génère des scripts viraux basés sur ces rushs. 3) Crée des tutoriels techniques étape par étape pour After Effects, Premiere, Photoshop, Illustrator et Blender.",
    n8n_nodes: [
      "1. Webhook (POST /video_editor)",
      "2. Switch (Action: analyze_rush | generate_script | generate_tutorial)",
      "3. [Branche Rush] Google Drive Download -> Gemini 1.5 Pro (Vision 2M) -> Output JSON (Timecodes & DA)",
      "4. [Branche Script] Gemini 3 Pro (Viral Copywriting) -> Output JSON (Hook, Retention)",
      "5. [Branche Tuto] Gemini 3 Pro (Technical Expert) -> Output JSON (Steps, Shortcuts)",
      "6. Response Webhook"
    ],
    json_structure: `{
  "action": "analyze_rush", // ou 'generate_script', 'generate_tutorial'
  "fileId": "DRIVE_FILE_ID", // Requis pour analyze_rush
  "software": "After Effects", // Requis pour generate_tutorial
  "context": "Vlog voyage dynamique, style MrBeast"
}`,
    tips: [
      "Utilisez 'gemini-1.5-pro-002' pour l'analyse vidéo (fenêtre contextuelle de 2M tokens indispensable pour les longs rushs).",
      "Pour les tutoriels, forcez une structure JSON stricte pour l'affichage dans l'UI (étapes, raccourcis, paramètres).",
      "Le mode 'Script Viral' doit utiliser l'analyse des rushs comme contexte d'entrée."
    ]
  },

  social_factory: {
    title: "4. Social Factory",
    category: "Creator IA",
    description: "Usine de contenu automatisée. 1) Crée du contenu (Texte + Visuel) et le poste sur Instagram et LinkedIn. 2) Pour YouTube, génère spécifiquement des vignettes (Thumbnails) virales.",
    n8n_nodes: [
      "1. Webhook (POST /social)",
      "2. Switch (Platform)",
      "   ├── Case 'Instagram/LinkedIn': AI Text + Image -> API Social (Post)",
      "   └── Case 'YouTube': AI Thumbnail Prompt -> Banana/Flux (Generate Image) -> Drive/Supabase",
      "3. Supabase: Log Publication / Asset"
    ],
    json_structure: `{
  "topic": "L'IA en 2025",
  "platform": "instagram", // ou 'linkedin', 'youtube'
  "action": "publish" // ou 'generate_thumbnail'
}`,
    tips: [
      "Pour les vignettes YouTube, utilisez un modèle spécialisé texte-dans-image (comme Flux Pro) pour gérer le titrage.",
      "Sur Instagram/LinkedIn, prévoyez une étape de validation humaine (via Slack/Email) avant le post final."
    ]
  },

  image_gen: {
    title: "5. Images (Banana/Gemini)",
    category: "Creator IA",
    description: "Pipeline de génération d'images haute qualité. Gère le prompt engineering et l'upload vers le stockage.",
    n8n_nodes: [
      "1. Webhook (POST /images)",
      "2. AI Image Gen (gemini-2.5-flash-image) - Prompt Enhancer",
      "3. HTTP Request (Get Binary)",
      "4. Supabase Storage: Upload (Bucket 'assets')",
      "5. Supabase DB: Insert (Table 'media_generations')",
      "6. Response: URL publique signée"
    ],
    json_structure: `{
  "prompt": "Portrait studio cyberpunk",
  "aspectRatio": "16:9",
  "userId": "user_1"
}`,
    tips: [
      "Utilisez gemini-2.5-flash-image pour sa rapidité et sa qualité photoréaliste.",
      "Sauvegardez toujours les métadonnées (prompt, seed) dans Supabase pour pouvoir réitérer."
    ]
  },

  video_gen: {
    title: "6. Vidéos (Veo)",
    category: "Creator IA",
    description: "Génération vidéo asynchrone via Veo. Gère le polling long et la notification de complétion.",
    n8n_nodes: [
      "1. Webhook (POST /videos)",
      "2. HTTP Request: Vertex AI (veo-3.1-fast-generate-preview)",
      "3. Wait Node (Loop conditionnel sur statut 'Done')",
      "4. HTTP Request: Download MP4",
      "5. Supabase Storage: Upload (Bucket 'assets')",
      "6. Supabase DB: Update Job Status"
    ],
    json_structure: `{
  "prompt": "Drone view over mountains",
  "duration": "5s",
  "resolution": "1080p"
}`,
    tips: [
      "Le modèle 'veo-3.1-fast' est recommandé pour les prévisualisations rapides.",
      "Implémentez un Webhook de retour (Callback) vers l'app pour notifier l'utilisateur."
    ]
  },

  // --- 7. GESTION & WORKSPACE ---
  prospection: {
    title: "7. Prospection Hub",
    category: "Gestion",
    description: "Machine de guerre commerciale. Scrape, enrichit, score et synchronise les leads vers le CRM Notion.",
    n8n_nodes: [
      "1. Webhook (POST /prospection)",
      "2. HTTP Request: PhantomBuster / ScrapingBee (LinkedIn Search)",
      "3. HTTP Request: Dropcontact/Hunter (Enrichissement Email)",
      "4. AI Scoring (gemini-3-flash) - Analyse pertinence 0-100",
      "5. Notion Node: Create/Update Database Item (CRM)",
      "6. Supabase: Log Lead"
    ],
    json_structure: `{
  "keyword": "Directeur Marketing",
  "location": "Lyon",
  "source": "linkedin"
}`,
    tips: [
      "Vérifiez l'existence du lead dans Supabase avant de payer un enrichissement email.",
      "Le scoring IA doit se baser sur la description de l'entreprise et le poste."
    ]
  },

  unified_workspace: {
    title: "8. Workspace (CRM/RH/Qonto)",
    category: "Gestion",
    description: "Workflow critique Master. Synchronise Qonto (Banque), Notion (Projets/CRM) et gère la facturation.",
    n8n_nodes: [
      "1. Webhook (POST /unified_workspace)",
      "2. Switch (Action Type)",
      "   ├── Case 'sync_bank': HTTP Request (Qonto API v2) -> Supabase (Match Invoices)",
      "   ├── Case 'create_invoice': Generate PDF (HTML to PDF) -> Email (Gmail) -> Qonto (Create Invoice)",
      "   ├── Case 'sync_crm': Supabase <-> Notion (Bidirectionnel via UpdatedAt)",
      "   └── Case 'project_update': Notion (Get Status) -> Supabase (Update)"
    ],
    json_structure: `{
  "action": "create_invoice",
  "payload": {
    "clientId": "uuid",
    "items": [{ "desc": "Montage", "price": 500 }]
  }
}`,
    tips: [
      "Pour Qonto : Utilisez l'API pour réconcilier automatiquement les paiements reçus avec les factures 'Sent'.",
      "Utilisez les Webhooks de Notion pour déclencher ce workflow en temps réel lors d'une modif CRM."
    ]
  }
};
