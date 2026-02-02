
export enum UserRole {
  ADMIN = 'ADMIN',
  COLLABORATOR = 'COLLABORATOR',
  VIEWER = 'VIEWER',
}

// --- SYSTEM CONFIGURATION TYPES ---
export type StorageMode = 'local' | 'supabase';
export type ChatProvider = 'n8n' | 'perplexity' | 'gemini' | 'openai' | 'anthropic' | 'deepseek';
export type MediaProvider = 'n8n' | 'gemini' | 'google-ai' | 'kie-ai';
export type ClientSourceMode = 'n8n' | 'notion' | 'sheets'; 
export type GoogleSyncProvider = 'n8n' | 'google-api';
export type SyncMode = 'manual' | 'polling' | 'webhook';

export type ProjectStatus = 'À faire' | 'En cours' | 'Montage' | 'Validation' | 'Terminé' | 'Archivé';
export type ProjectType = 'Shorts' | 'Long-form' | 'Publicité' | 'TikTok' | 'Instagram' | 'Autre';

// --- API ROUTER TYPES ---
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  meta?: {
    executionTime: number;
    cached: boolean;
    provider: string;
  };
}

export type RequestType = 
  | 'chat_simple'
  | 'vision_analysis'
  | 'moodboard_generation'
  | 'tutorial_generation'
  | 'viral_trends_research'
  | 'code_analysis'
  | 'news_generation';

export interface APIRequest {
  type: RequestType;
  prompt: string;
  context?: any;
  qualityRequired?: 'low' | 'medium' | 'high';
}

// --- CONFIG MANAGEMENT TYPES ---
export interface WebhookConfig {
  url: string;
  enabled: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'error';
  lastTestError?: string;
}

export interface ConfigVersion {
  id: string;
  settingsId: string;
  version: number;
  snapshot: SystemSettings;
  changedBy: string;
  changedByName: string;
  changedAt: string;
  changeReason?: string;
  status: 'active' | 'rolled_back' | 'archived';
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}

// --- NEWS & WEATHER TYPES ---
export type NewsCategory = 'politics' | 'tech' | 'editing' | 'motion';

export interface NewsArticle {
    id: string;
    title: string;
    summary: string;
    category: NewsCategory;
    source: string;
    date: string;
    imageUrl?: string;
    url?: string;
}

export interface WeatherData {
    city: string;
    currentTemp: number;
    condition: 'Sunny' | 'Cloudy' | 'Rain' | 'Storm' | 'Snow';
    humidity: number;
    windSpeed: number;
    forecast: Array<{
        day: string;
        temp: number;
        icon: string;
    }>;
}

// --- DIAGNOSTIC REPORT TYPES ---
export interface CodeDiagnostic {
    file: string;
    line: string; // Ex: "45-50"
    functionName: string;
    errorType: string;
    snippet: string; // Le code problématique
    suggestion: string;
}

export interface TestResult {
    module: string;
    testName: string;
    status: 'pass' | 'fail' | 'warning';
    duration: number;
    apiProvider?: string; 
    details?: any;
    error?: string;
    // Link to exact code location if fail
    codeLocation?: CodeDiagnostic; 
}

export interface SystemReport {
    id: string;
    timestamp: string;
    environment: string;
    totalDuration: number;
    passCount: number;
    failCount: number;
    results: TestResult[];
    aiAnalysis?: string; 
    diagnostics?: CodeDiagnostic[]; // Liste agrégée des problèmes de code
}

// --- PROSPECTION TYPES ---
export type LeadSource = 'linkedin' | 'google_maps' | 'instagram' | 'manual';
export type LeadStatus = 'new' | 'qualified' | 'contacted' | 'negotiation' | 'converted' | 'lost';

export interface Lead {
  id: string;
  name: string;
  company: string;
  role: string;
  email?: string;
  source: LeadSource;
  status: LeadStatus;
  location?: string;
  website?: string;
  socials: {
    linkedin?: string;
    instagram?: string;
    youtube?: string;
  };
  metrics?: {
    videoFrequency: 'high' | 'medium' | 'low' | 'none'; 
    estimatedBudget?: string;
    engagementRate?: string;
  };
  score: number; 
  lastScrapedAt: string;
  notes?: string;
}

export interface ScrapingSession {
  id: string;
  platform: LeadSource;
  keyword: string;
  location: string;
  totalFound: number;
  date: string;
}

export interface Project {
  id: string;
  notionPageId?: string;
  clientId: string;
  clientName?: string;
  title: string;
  status: ProjectStatus;
  type: ProjectType;
  rawFilesUrl?: string;
  deliveryUrl?: string;
  price?: number;
  startDate?: string;
  endDate?: string;
  comments?: string;
  createdAt: string;
}

export type ModuleId = 'chat' | 'images' | 'videos' | 'invoices' | 'clients' | 'prospection';

export interface ModuleConfig {
    enabled: boolean;
    n8n: {
        webhookUrl?: string;
        enabledEvents: string[];
    };
}

export interface SystemSettings {
  id?: string; // Added for versioning tracking
  version?: number;
  updatedAt?: string;
  updatedBy?: string;

  timezone: string;
  appMode: 'production' | 'developer';
  branding: {
    name: string;
    initials: string;
    logoUrl?: string;
    // NOUVEAUX CHAMPS DE PERSONNALISATION
    primaryColor?: string;
    secondaryColor?: string;
    loginBackgroundUrl?: string;
    welcomeMessage?: string;
    welcomeSubtitle?: string;
  };
  storage: {
    mode: StorageMode;
  };
  // Configuration IA Unifiée (Expanded)
  aiConfig: {
    geminiKey: string;     // Google AI
    openaiKey: string;     // OpenAI GPT
    perplexityKey: string; // Perplexity Sonar
    anthropicKey: string;  // Claude
    deepseekKey: string;   // DeepSeek
  };
  
  // NEW: Granular Webhook Configuration
  webhooks: {
    chat: WebhookConfig;
    images: WebhookConfig;
    videos: WebhookConfig;
    clients: WebhookConfig;
    invoices: WebhookConfig;
    news?: WebhookConfig;
    prospection?: WebhookConfig;
    projects?: WebhookConfig;
  };

  // Legacy fields (kept for backward compat until full migration)
  chat: {
    provider: ChatProvider;
    value: string; 
    status?: 'success' | 'error' | 'idle';
    lastTestedAt?: string;
  };
  telegram: {
    enabled: boolean;
    botToken: string;
    allowedUsernames: string;
    lastUpdateId?: number;
    webAppUrl?: string;
  };
  contentCreation: {
    provider: 'n8n' | 'gemini';
    value: string; 
    status?: 'success' | 'error' | 'idle';
    lastTestedAt?: string;
  };
  drive: {
    syncFolderUrl: string;
  };
  google: {
    gmailProvider: GoogleSyncProvider;
    gmailValue: string;
    calendarProvider: GoogleSyncProvider;
    calendarValue: string;
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
  };
  clients: {
    mode: ClientSourceMode;
    n8nUrl?: string;
    notionDbUrl?: string;
    notionApiKey?: string;
    notionProjectsUrl?: string;
    spreadsheetId?: string;
    sheetName?: string;
    syncMode?: SyncMode;
    status?: 'success' | 'error' | 'idle';
    lastTestedAt?: string;
  };
  library: {
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseServiceKey: string;
  };
  scripts: {
    placeholder?: string;
    n8nUrl?: string;
  };
  images: {
    provider: MediaProvider;
    endpoint: string; 
  };
  videos: {
    provider: MediaProvider;
    endpoint: string; 
  };
  invoices: {
    n8nUrl: string;
    n8nUrlContracts?: string;
    invoiceSheetUrl?: string; // New: URL Google Sheet Factures
    quoteSheetUrl?: string;   // New: URL Google Sheet Devis
    contractSheetUrl?: string;// New: URL Google Sheet Contrats
  };
  modules: Record<string, ModuleConfig>;
  mcp: { 
    enabled: boolean;
    serverPort: number;
    exposeGoogle: boolean;
    exposeNotion: boolean;
    exposeSupabase: boolean;
  };
  auth: {
    invitePageUrl: string;
  };
  notionTokenEncrypted?: string;
  notionDatabaseId?: string;
  notionStatus?: IntegrationStatusMeta;
  airtableConfigEncrypted?: string;
  airtableStatus?: IntegrationStatusMeta;
  supabaseConfigEncrypted?: string;
  supabaseStatus?: IntegrationStatusMeta;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  toolResponse?: { id: string, name: string, result: any };
  modelUsed?: string;
  isLoading?: boolean;
  source?: 'web' | 'telegram'; 
  telegramChatId?: string;     
}

export interface NotionClient {
  id: string;
  notionPageId?: string; 
  spreadsheetRow?: number; 
  name: string;
  companyName?: string;
  email?: string;
  isArchived: boolean;
  lastSyncedAt: string;
  notionUrl?: string;
  notionProjectUrl?: string; 
  leadStatus?: string;
  emailOrSite?: string;
  postalAddress?: string;
  youtubeChannel?: string;
  instagramAccount?: string;
  serviceType?: string;
  contactDate?: string;
  isContacted?: boolean;
  giftSent?: boolean;
  comments?: string;
}

export interface MediaAsset {
  id: string;
  type: 'image' | 'video' | 'file';
  publicUrl: string;
  downloadUrl?: string;
  prompt: string;
  createdAt: string;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  jobId?: string;
  tags?: string[];
  mimeType?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | 'disabled' | 'invited' | 'pending_admin';
  allowedViews: string[];
  avatar?: string;
  passwordHash?: string;
  passwordPlain?: string;
  disabledAt?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalClients: number;
  pendingInvoices: number;
  aiTokensUsed: number;
  aiTokenLimit: number;
}

export enum TemplateType {
  INVOICE = 'INVOICE',
  CONTRACT = 'CONTRACT'
}

export interface Template {
  id: string;
  airtableRecordId: string;
  baseId: string;
  name: string;
  type: TemplateType;
  contentMarkdown: string;
  version: number;
  updatedAt: string;
}

export interface Contract {
  id: string;
  clientId: string;
  templateId: string;
  contentSnapshot: string;
  status: ContractStatus;
  created_at: string;
  clients?: { name: string };
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  SIGNED = 'SIGNED',
  ARCHIVED = 'ARCHIVED'
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  amountHT: number;
  status: string;
  items: any[];
  created_at: string;
  clients?: { name: string };
}

export interface IntegrationStatusMeta {
  enabled: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'error';
  lastErrorMessage?: string | null;
}

export interface IntegrationState {
  service: string;
  configured: boolean;
  source: 'user' | 'admin' | 'none';
  isOverridden: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'error';
  lastErrorMessage?: string | null;
}

export interface SupabaseDbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  mode: 'direct' | 'transaction';
}

export interface AirtableConfig {
  pat: string;
  invoiceBaseId?: string;
  contractBaseId?: string;
}

export interface AirtableBase {
  id: string;
  name: string;
  permissionLevel: string;
}

export interface AirtableTable {
  id: string;
  name: string;
}

export interface GoogleAccount {
  id?: string;
  userId: string;
  googleUserId: string;
  email: string;
  
  // Security: Tokens are encrypted at rest
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  
  tokenExpiryDate: number;
  scopes: string[];
  lastSyncedAt: string;
  status: 'connected' | 'error' | 'expired';
}

export interface EmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  isRead: boolean;
  hasAttachments: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string; 
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
  size?: number;
  owners?: { displayName: string; emailAddress: string }[];
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  type: 'NEW_ACCOUNT' | 'PASSWORD_RESET';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt: string;
  expiresAt: string;
  createdBy: string;
  acceptedAt?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetId?: string;
  metadata?: any;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
}

export interface AccountHistoryItem {
  email: string;
  name: string;
  avatar?: string;
  lastUsedAt: string;
}

export type ImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '4:5';
export type ImageResolution = '1K' | '2K' | '4K';

export interface ImageGenerationParams {
  prompt: string;
  aspectRatio: ImageAspectRatio;
  resolution: ImageResolution;
  numberOfImages: number;
  seed?: number;
  referenceImageUrl?: string;
}

export interface ImageJob {
  id: string;
  userId: string;
  provider: string;
  modelId: string;
  type: 'TXT2IMG' | 'IMG2IMG';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  params: ImageGenerationParams;
  costTokens: number;
  createdAt: string;
  errorMessage?: string;
}

export interface ImageAsset {
  id: string;
  jobId: string;
  userId: string;
  storagePath: string;
  publicUrl: string;
  width?: number;
  height?: number;
  mimeType: string;
  promptCopy: string;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
}

export type VideoAspectRatio = '16:9' | '9:16';
export type VideoResolution = '720p' | '1080p';
export type VideoDuration = '5s' | '10s' | '20s';
export type VideoFps = '24' | '30' | '60';

export interface VideoGenerationParams {
  prompt: string;
  aspectRatio: VideoAspectRatio;
  resolution: VideoResolution;
  duration: VideoDuration;
  fps: VideoFps;
  negativePrompt?: string;
}

export interface VideoJob {
  id: string;
  userId: string;
  provider: string;
  modelId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  params: VideoGenerationParams;
  progress: number;
  createdAt: string;
  errorMessage?: string;
}

export interface VideoAsset {
  id: string;
  jobId: string;
  userId: string;
  publicUrl: string;
  thumbnailUrl?: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  mimeType: string;
  promptCopy: string;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
}

export interface MediaFilterParams {
  type: 'all' | 'image' | 'video' | 'file';
  search: string;
  page: number;
  pageSize: number;
  
}

export type PerplexityModel = 'llama-3-sonar-small-32k-online' | 'llama-3-sonar-large-32k-online';

export interface ResolvedNotionConfig {
  source: 'user' | 'admin';
  token: string;
  databaseId: string;
}

export interface ResolvedAirtableConfig {
  source: 'user' | 'admin';
  config: AirtableConfig;
}

export interface ResolvedSupabaseConfig {
  source: 'user' | 'admin' | 'env';
  config: SupabaseDbConfig;
  connectionString: string;
}

export interface ResolvedPerplexityConfig {
  apiKey: string;
}

export type N8NProcessingType = 'image_generation' | 'video_processing' | 'text_transformation' | 'file_handling';

export interface N8NResult {
  success: boolean;
  data: any;
  error?: string;
  cached?: boolean;
  executionTime?: number;
}

export interface N8NLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  type?: string;
}

export interface DiagnosticResult {
    serviceName: string;
    status: 'success' | 'error' | 'warning' | 'unconfigured';
    message: string;
    details?: string;
}

// 1. MOODBOARD (Inspiration & Direction)
export interface MoodboardData {
    concept: {
        title: string;
        description: string;
    };
    colors: {
        dominant: string;
        skin: string;
        accents: string;
        description: string;
        paletteHex?: string[];
    };
    typography: {
        style: string;
        animation: string;
        effects: string;
    };
    editing: {
        pacing: string; 
        transitions: string;
        broll: string; 
        style: string;
    };
    sound: {
        music: string;
        sfx: string;
    };
    grading: {
        look: string;
        reference: string;
    };
    critique: {
        hypothesis: string;
        counterpoint: string;
        flaw: string;
        differentiation: string;
    };
    visual_prompts: string[];
    generated_visuals?: string[];
}

// 2. CREATIVE ANALYSIS (Execution & Technical Tutorial)
export interface TimelineSuggestion {
    time: string;
    phrase: string;
    visual: string; 
    technicalGuide: string;
}

// Updated Type for Tutorial Generation
export interface TutorialSetting {
    name: string; 
    value: string;
    unit?: string;
}

export interface DetailedStep {
    order: number;
    category: string; // "Préparation", "Effets", "Animation"
    action: string;
    tool?: string; // Effet exact
    keyboard?: string; // Raccourci
    settings?: TutorialSetting[];
    tip?: string;
    explanation: string;
}

export interface AdvancedTechnique {
    id: string;
    title: string;
    software: 'After Effects' | 'Premiere Pro' | 'Photoshop' | 'Illustrator';
    difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Expert';
    estimatedTime: string;
    description: string;
    steps: DetailedStep[];
    validationErrors?: string[];
}

export interface CreativeAnalysisData {
    sourceVideoName?: string;
    artDirectionSummary: string;
    suggestions: TimelineSuggestion[];
    advancedTechniques: AdvancedTechnique[];
}

// --- SYNC ORCHESTRATION ---
export interface SyncOperation {
  platform: 'supabase' | 'sheets' | 'notion';
  action: 'create' | 'update' | 'delete';
  data: any;
  rollback?: () => Promise<void>;
}

export interface SyncResult {
  success: boolean;
  completedOperations: SyncOperation[];
  failedOperation?: SyncOperation;
  error?: Error;
}
