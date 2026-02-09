
export enum UserRole {
  ADMIN = 'ADMIN',
  COLLABORATOR = 'COLLABORATOR',
  VIEWER = 'VIEWER'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | 'invited' | 'disabled' | 'pending_admin';
  passwordHash?: string;
  passwordPlain?: string; // For mock/dev
  avatar?: string;
  allowedViews?: string[];
  createdAt: string;
}

export interface WebhookConfig {
  enabled: boolean;
  url: string;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'error';
  lastTestError?: string;
}

export interface SystemSettings {
  id: string;
  version: number;
  appMode: 'production' | 'developer' | 'maintenance';
  timezone?: string;
  branding: {
    name: string;
    logoUrl?: string;
    initials: string;
    primaryColor: string;
    secondaryColor: string;
    loginBackgroundUrl?: string;
    welcomeMessage?: string;
    welcomeSubtitle?: string;
  };
  storage: {
    mode: 'local' | 'supabase';
  };
  auth: {
    invitePageUrl: string;
  };
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    gmailProvider: 'api' | 'n8n';
  };
  telegram: {
    enabled: boolean;
    botToken: string;
    chatId?: string;
    allowedUsernames?: string;
    lastUpdateId?: number;
  };
  aiConfig: {
    geminiKey?: string;
    openaiKey?: string;
    anthropicKey?: string;
    perplexityKey?: string;
    deepseekKey?: string;
  };
  
  // --- NOUVELLES CONFIGURATIONS API SPÉCIFIQUES ---
  
  // 1. Actualités & Veille
  newsConfig: {
    newsApiKey?: string;       // NewsAPI.org
    gnewsApiKey?: string;      // GNews.io
    openWeatherApiKey?: string;// OpenWeatherMap
  };

  // 2. Prospection (Growth)
  prospectionConfig: {
    apifyApiToken?: string;    // Apify (Scraping LinkedIn/Maps)
  };

  // 3. CRM & Production (Notion Centralisé)
  notionConfig: {
    apiKey?: string;           // Internal Integration Token
    clientsDatabaseId?: string;
    projectsDatabaseId?: string;
  };

  // 4. Service RH & Billing (Qonto + Google Docs)
  billingConfig: {
    qontoLogin?: string;       // ID / Slug
    qontoSecretKey?: string;   // Secret Key
    googleDocInvoiceTemplateId?: string; // ID du fichier Google Doc pour template facture
    googleDocQuoteTemplateId?: string;   // ID du fichier Google Doc pour template devis
  };

  // Legacy / Encrypted Global Fields
  notionTokenEncrypted?: string;
  notionDatabaseId?: string;
  airtableConfigEncrypted?: string;
  supabaseConfigEncrypted?: string;

  contentCreation: {
    provider: 'gemini' | 'openai' | 'anthropic';
    value?: string;
  };
  chat: {
    provider?: string;
    value?: string;
  };
  images: {
    endpoint: { url: string; };
  };
  videos: {
    endpoint: { url: string; };
  };
  clients: {
    mode: 'sheets' | 'database';
    spreadsheetId?: string;
    notionApiKey?: string;
    notionProjectsUrl?: string;
    n8nUrl?: string;
  };
  invoices: {
    invoiceSheetUrl?: string;
    quoteSheetUrl?: string;
    contractSheetUrl?: string;
    n8nUrl?: string;
  };
  library: {
    supabaseUrl?: string;
    supabaseAnonKey?: string;
  };
  modules: Record<string, any>;
  webhooks: Record<string, WebhookConfig>;
  
  // Integration Status Fields (Legacy / Status reporting)
  notionStatus?: IntegrationStatusMeta;
  supabaseStatus?: IntegrationStatusMeta;
  airtableStatus?: IntegrationStatusMeta;
}

export interface IntegrationStatusMeta {
  enabled: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'error';
  lastErrorMessage?: string | null;
}

export interface NotionClient {
  id: string;
  notionPageId?: string;
  spreadsheetRow?: number;
  name: string;
  companyName?: string;
  email?: string;
  leadStatus: string;
  serviceType?: string;
  contactDate?: string;
  comments?: string;
  isContacted: boolean;
  isArchived?: boolean;
  lastSyncedAt?: string;
  giftSent?: boolean;
  postalAddress?: string;
  youtubeChannel?: string;
  instagramAccount?: string;
  notionProjectUrl?: string;
}

export interface Project {
  id: string;
  clientId: string;
  clientName?: string;
  title: string;
  type: ProjectType;
  status: ProjectStatus;
  createdAt: string;
  updatedAt?: string;
  notionPageId?: string;
  price?: number;
  deliveryUrl?: string;
  rawFilesUrl?: string;
  comments?: string;
}

export type ProjectStatus = 'À faire' | 'En cours' | 'Montage' | 'Validation' | 'Terminé';
export type ProjectType = 'Shorts' | 'Long-form' | 'Publicité' | 'TikTok' | 'Autre';

export interface DashboardStats {
  totalClients: number;
  pendingInvoices: number;
  aiTokensUsed: number;
  aiTokenLimit: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  modelUsed?: string;
  source?: 'web' | 'telegram' | 'whatsapp';
  isLoading?: boolean;
  toolResponse?: {
    id: string;
    name: string;
    result: any;
  };
}

export interface MoodboardData {
  concept: { title: string; description: string };
  colors: { paletteHex: string[]; dominant: string; description: string };
  typography: { style: string; animation: string };
  editing: { pacing: string; transitions: string; style: string };
}

export interface CreativeAnalysisData {
  visualStyle: string;
  technicalNotes: string;
  recommendations: string[];
}

export interface ImageGenerationParams {
  prompt: string;
  aspectRatio: ImageAspectRatio;
  resolution: ImageResolution;
  numberOfImages?: number;
  seed?: number;
  referenceImageUrl?: string;
}

export interface VideoGenerationParams {
  prompt: string;
  aspectRatio: VideoAspectRatio;
  resolution: VideoResolution;
  duration: VideoDuration;
  fps?: VideoFps;
  negativePrompt?: string;
}

export type ImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:5' | '3:4';
export type ImageResolution = '1K' | '2K' | '4K';
export type VideoAspectRatio = '16:9' | '9:16';
export type VideoResolution = '720p' | '1080p';
export type VideoDuration = '5s' | '10s' | '20s';
export type VideoFps = '24' | '30' | '60';

export interface ImageJob {
  id: string;
  userId: string;
  provider: string;
  modelId: string;
  type: 'TXT2IMG' | 'IMG2IMG' | 'INPAINT';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  params: ImageGenerationParams;
  errorMessage?: string;
  costTokens?: number;
  createdAt: string;
}

export interface VideoJob {
  id: string;
  userId: string;
  provider: string;
  modelId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  params: VideoGenerationParams;
  progress?: number;
  errorMessage?: string;
  createdAt: string;
}

export interface MediaAsset {
  id: string;
  type: 'image' | 'video' | 'file';
  publicUrl: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  prompt?: string;
  width?: number;
  height?: number;
  duration?: number; // seconds
  fps?: number;
  mimeType?: string;
  jobId?: string; // Link to generation job
  userId?: string;
  createdAt: string;
  isFavorite?: boolean;
  tags?: string[];
}

export type ImageAsset = MediaAsset & { type: 'image' };
export type VideoAsset = MediaAsset & { type: 'video' };

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
  iconLink?: string;
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
  size?: number;
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  amountHT: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  items: { description: string; price: number }[];
  created_at: string;
  clients?: { name: string };
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
  SENT = 'SENT',
  SIGNED = 'SIGNED'
}

export interface Template {
  id: string;
  airtableRecordId?: string;
  baseId: string;
  name: string;
  type: TemplateType;
  contentMarkdown: string;
  version: number;
  updatedAt: string;
}

export enum TemplateType {
  INVOICE = 'INVOICE',
  CONTRACT = 'CONTRACT',
  EMAIL = 'EMAIL'
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

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  type: 'NEW_ACCOUNT' | 'PASSWORD_RESET';
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
  expiresAt: string;
  createdBy: string;
  acceptedAt?: string;
}

export interface ConfigVersion {
  id: string;
  settingsId: string;
  version: number;
  snapshot: SystemSettings;
  changedBy: string;
  changedByName: string;
  changedAt: string;
  changeReason: string;
  status: 'active' | 'archived' | 'rolled_back';
  changes: { field: string; oldValue: any; newValue: any }[];
}

export interface GoogleAccount {
  userId: string;
  googleUserId: string;
  email: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  tokenExpiryDate: number;
  scopes: string[];
  lastSyncedAt: string;
  status: 'connected' | 'error' | 'expired';
}

export interface AccountHistoryItem {
  email: string;
  name: string;
  avatar?: string;
  lastUsedAt: string;
}

// Integration Configuration Types
export interface ResolvedNotionConfig {
  source: 'user' | 'admin' | 'env';
  token: string;
  databaseId: string;
}

export interface ResolvedAirtableConfig {
  source: 'user' | 'admin' | 'env';
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

export interface SupabaseDbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  mode: 'transaction' | 'session' | 'direct';
}

export interface IntegrationState {
  service: 'notion' | 'airtable' | 'supabase' | 'google' | 'perplexity';
  configured: boolean;
  source: 'user' | 'admin' | 'none';
  isOverridden: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'error';
  lastErrorMessage?: string | null;
}

// Prospection
export interface Lead {
  id: string;
  name: string;
  company: string;
  role: string;
  source: LeadSource;
  status: LeadStatus;
  location: string;
  website?: string;
  email?: string;
  socials: {
      linkedin?: string;
      instagram?: string;
      youtube?: string;
  };
  metrics?: {
      videoFrequency?: string;
      engagementRate?: string;
  };
  score: number;
  lastScrapedAt: string;
}

export type LeadSource = 'linkedin' | 'google_maps' | 'instagram' | 'manual';
export type LeadStatus = 'new' | 'contacted' | 'interested' | 'converted' | 'lost';

// News & Weather
export type NewsCategory = 'headline' | 'politics' | 'tech' | 'editing' | 'motion' | 'general';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  date: string;
  imageUrl?: string;
}

export interface WeatherData {
  city: string;
  currentTemp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  forecast: any[];
}

export interface SystemReport {
  id: string;
  timestamp: string;
  environment: string;
  totalDuration: number;
  passCount: number;
  failCount: number;
  results: TestResult[];
  diagnostics: CodeDiagnostic[];
  aiAnalysis: string;
}

export interface TestResult {
  module: string;
  testName: string;
  status: 'pass' | 'fail';
  duration: number;
  apiProvider?: string;
  error?: string;
  codeLocation?: CodeDiagnostic;
}

export interface CodeDiagnostic {
  file: string;
  line: string;
  functionName: string;
  errorType: string;
  snippet: string;
  suggestion: string;
}

export interface APIRequest {
  type: string;
  prompt: string;
  qualityRequired?: 'low' | 'high';
  context?: string;
}

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

export interface DiagnosticResult {
  serviceName: string;
  status: 'success' | 'error' | 'warning' | 'unconfigured';
  message: string;
  details?: string;
}

// Other types needed for components
export type ModuleId = 'chat' | 'images' | 'videos' | 'clients' | 'invoices' | 'projects' | 'google_workspace' | 'video_editor' | 'news_generation' | 'file_handling';

// Tutorial types
export interface DetailedStep {
    order: number;
    category: string;
    action: string;
    tool?: string;
    settings?: { name: string, value: string, unit?: string }[];
    explanation?: string;
    keyboard?: string;
    tip?: string;
}

export interface AdvancedTechnique {
    id?: string;
    software: string;
    title: string;
    difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Expert';
    estimatedTime: string;
    description: string;
    steps: DetailedStep[];
    validationErrors?: string[];
}

export interface TutorialSetting {
    name: string;
    value: string;
    unit?: string;
}

export type PerplexityModel = 'sonar-pro' | 'sonar-small';

export interface MediaFilterParams {
  type: 'all' | 'image' | 'video' | 'file';
  search: string;
  page: number;
  pageSize: number;
}

export interface SyncResult {
    success: boolean;
    localChanges?: number;
    remoteChanges?: number;
    errors?: any[];
    timestamp?: string;
    data?: any;
    message?: string;
    completedOperations?: SyncOperation[];
    failedOperation?: SyncOperation;
    error?: Error;
}

export interface SyncOperation {
    platform: 'supabase' | 'sheets' | 'notion';
    action: 'create' | 'update' | 'delete';
    data: any;
    rollback?: () => Promise<void>;
}

export type N8NProcessingType = 'chat' | 'image_generation' | 'video_processing' | 'text_transformation' | 'file_handling' | 'social_factory' | 'news_generation' | 'video_generation' | 'prospection' | 'clients' | 'projects' | 'invoices' | 'google_workspace' | 'video_editor';

export interface N8NResult {
  success: boolean;
  data?: any;
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

export interface WorkflowExecution {
  id: string;
  workflowType: string;
  status: 'success' | 'error';
  inputPayload: any;
  outputResponse: any;
  timestamp: string;
  latency: number;
  cached: boolean;
}
