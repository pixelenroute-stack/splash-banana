
import { User, UserRole, SystemSettings, NotionClient, MediaAsset, Invitation, AuditLog, EmailMessage, CalendarEvent, DriveFile, ImageJob, ImageAsset, VideoJob, VideoAsset, Contract, Invoice, Template, Project, ConfigVersion, WebhookConfig } from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'pixel_agency_settings',
  USERS: 'pixel_agency_users',
  CLIENTS: 'pixel_agency_clients',
  PROJECTS: 'pixel_agency_projects',
  ASSETS: 'pixel_agency_assets',
  LOGS: 'pixel_agency_logs',
  CONFIG_VERSIONS: 'pixel_agency_config_versions'
};

const DEFAULT_WEBHOOK: WebhookConfig = {
    url: '',
    enabled: false
};

// CLEANED DEFAULT SETTINGS - DEFAULTING TO SUPABASE STORAGE MODE
const DEFAULT_SETTINGS: SystemSettings = {
  id: 'sys_1',
  version: 1,
  timezone: 'Europe/Paris',
  appMode: 'production', 
  branding: {
    name: 'Pixel En Route',
    initials: 'PE',
    primaryColor: '#3b82f6', 
    secondaryColor: '#64748b',
    welcomeMessage: 'Bon retour',
    welcomeSubtitle: 'Connectez-vous à votre espace Pixel En Route.'
  },
  storage: { mode: 'supabase' }, // CHANGED: FORCE SUPABASE
  aiConfig: {
    geminiKey: '',     
    openaiKey: '',
    perplexityKey: '',
    anthropicKey: '',
    deepseekKey: ''
  },
  webhooks: {
      chat: { ...DEFAULT_WEBHOOK, enabled: true },
      images: { ...DEFAULT_WEBHOOK, enabled: true },
      videos: { ...DEFAULT_WEBHOOK, enabled: true },
      clients: { ...DEFAULT_WEBHOOK, enabled: true },
      invoices: { ...DEFAULT_WEBHOOK, enabled: true },
      news: { ...DEFAULT_WEBHOOK, enabled: true },
      prospection: { ...DEFAULT_WEBHOOK, enabled: true },
      projects: { ...DEFAULT_WEBHOOK, enabled: true }
  },
  chat: { provider: 'n8n', value: '' },
  contentCreation: { provider: 'gemini', value: '' },
  telegram: { 
      enabled: false, 
      botToken: '',
      allowedUsernames: '', 
      webAppUrl: '' 
  },
  drive: { syncFolderUrl: '' },
  google: {
    gmailProvider: 'n8n',
    gmailValue: '',
    calendarProvider: 'google-api',
    calendarValue: '',
    clientId: '',
    clientSecret: '',
    redirectUri: '',
  },
  clients: { 
    mode: 'sheets',
    spreadsheetId: '',
    n8nUrl: '',
    notionApiKey: '', 
    notionDbUrl: '',
    notionProjectsUrl: ''
  },
  notionTokenEncrypted: '',
  
  // SUPABASE CONFIG (Env variables should pre-fill this in real app, here manual or env)
  library: { 
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '', 
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', 
    supabaseServiceKey: ''
  },
  scripts: { n8nUrl: '' },
  images: { provider: 'n8n', endpoint: '' },
  videos: { provider: 'n8n', endpoint: '' },
  invoices: { 
      n8nUrl: '',
      n8nUrlContracts: '',
      invoiceSheetUrl: '',
      quoteSheetUrl: '',
      contractSheetUrl: ''
  },
  modules: {
      news: { enabled: true, n8n: { webhookUrl: '', enabledEvents: [] } },
      projects: { enabled: true, n8n: { webhookUrl: '', enabledEvents: [] } },
      prospection: { enabled: true, n8n: { webhookUrl: '', enabledEvents: [] } }
  },
  mcp: { 
    enabled: false,
    serverPort: 3000,
    exposeGoogle: false,
    exposeNotion: false,
    exposeSupabase: false
  },
  auth: {
    invitePageUrl: typeof window !== 'undefined' ? window.location.origin + '/#join' : '/#join'
  }
};

const load = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
            // Merge pour s'assurer que la structure est à jour
            if (key === STORAGE_KEYS.SETTINGS) {
               return { ...fallback, ...parsed, webhooks: { ...(fallback as any).webhooks, ...parsed.webhooks } };
            }
            return parsed;
        }
    }
    return fallback;
  } catch (e) {
    return fallback;
  }
};

const save = (key: string, data: any) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
};

let systemSettings: SystemSettings = load(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);

// Force basic consistency
if (!systemSettings || !systemSettings.appMode) systemSettings = { ...DEFAULT_SETTINGS };

let users: User[] = load(STORAGE_KEYS.USERS, [
  { 
    id: 'user_1', 
    name: 'Admin Pixel', 
    email: 'pixelenroute@gmail.com', 
    role: UserRole.ADMIN, 
    status: 'active',
    allowedViews: ['dashboard', 'chat', 'drive', 'clients', 'projects', 'library', 'scripts', 'images', 'videos', 'invoices', 'settings', 'admin'],
    passwordPlain: 'Victoria&8530',
    createdAt: new Date().toISOString()
  }
]);

let configVersions: ConfigVersion[] = load(STORAGE_KEYS.CONFIG_VERSIONS, []);
let localClients: NotionClient[] = load(STORAGE_KEYS.CLIENTS, []);
let localProjects: Project[] = load(STORAGE_KEYS.PROJECTS, []);
let localAssets: MediaAsset[] = load(STORAGE_KEYS.ASSETS, []);
let auditLogs: AuditLog[] = load(STORAGE_KEYS.LOGS, []);

let aiTokensUsed = 0;
const AI_TOKEN_LIMIT = 20000; 
let templates: Template[] = [];
let invitations: Invitation[] = load('sb_invitations', []);
let googleAccounts = new Map<string, any>();
let emails = new Map<string, EmailMessage[]>();
let events = new Map<string, CalendarEvent[]>();
let driveFiles: DriveFile[] = [];
let imageJobs: ImageJob[] = [];
let imageAssets: ImageAsset[] = [];
let videoJobs: VideoJob[] = [];
let videoAssets: VideoAsset[] = [];
let localInvoices: Invoice[] = [];
let localContracts: Contract[] = [];
let userSettingsMap = new Map<string, any>();

const notifyUpdate = (dataType: string) => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('db-updated', { detail: { type: dataType } }));
    }
};

export const db = {
  getSystemSettings: () => systemSettings,
  getGlobalSettings: () => systemSettings,
  
  updateSystemSettings: (patch: Partial<SystemSettings>) => {
    systemSettings = { ...systemSettings, ...patch };
    // Synchro legacy
    if (patch.webhooks) {
        if (patch.webhooks.chat) systemSettings.chat.value = patch.webhooks.chat.url;
        if (patch.webhooks.images) systemSettings.images.endpoint = patch.webhooks.images.url;
    }
    save(STORAGE_KEYS.SETTINGS, systemSettings);
    notifyUpdate('settings');
    return systemSettings;
  },

  updateGlobalSettings: (patch: any, actorId: string) => {
    systemSettings = { ...systemSettings, ...patch };
    save(STORAGE_KEYS.SETTINGS, systemSettings);
    notifyUpdate('settings');
    return systemSettings;
  },
  
  getConfigVersions: () => configVersions,
  addConfigVersion: (version: ConfigVersion) => {
      configVersions.unshift(version);
      if (configVersions.length > 50) configVersions.pop();
      save(STORAGE_KEYS.CONFIG_VERSIONS, configVersions);
  },
  getConfigVersionById: (id: string) => configVersions.find(v => v.id === id),
  updateConfigVersion: (id: string, patch: Partial<ConfigVersion>) => {
      const idx = configVersions.findIndex(v => v.id === id);
      if (idx !== -1) {
          configVersions[idx] = { ...configVersions[idx], ...patch };
          save(STORAGE_KEYS.CONFIG_VERSIONS, configVersions);
      }
  },
  
  getUsers: () => users,
  getUserById: (id: string) => users.find(u => u.id === id),
  createUser: (u: User) => {
      users.push(u);
      save(STORAGE_KEYS.USERS, users);
      notifyUpdate('users');
  },
  updateUser: (id: string, patch: Partial<User>) => {
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
        users[idx] = { ...users[idx], ...patch };
        save(STORAGE_KEYS.USERS, users);
        notifyUpdate('users');
    }
  },
  softDeleteUser: (id: string) => {
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
        users[idx].status = 'disabled';
        save(STORAGE_KEYS.USERS, users);
        notifyUpdate('users');
    }
  },

  getClients: () => localClients,
  getClientById: (id: string) => localClients.find(c => c.id === id || c.notionPageId === id),
  createClient: (data: any) => { 
    const c = { id: `c${Date.now()}`, notionPageId: data.notionPageId || `npg_${Date.now()}`, isArchived: false, lastSyncedAt: new Date().toISOString(), ...data }; 
    localClients.push(c); 
    save(STORAGE_KEYS.CLIENTS, localClients);
    notifyUpdate('clients');
    return c; 
  },
  softDeleteClient: (id: string) => {
    const c = localClients.find(c => c.id === id);
    if (c) {
        c.isArchived = true;
        save(STORAGE_KEYS.CLIENTS, localClients);
        notifyUpdate('clients');
    }
  },
  setClients: (newClients: NotionClient[]) => {
      localClients = newClients;
      save(STORAGE_KEYS.CLIENTS, localClients);
      notifyUpdate('clients');
  },

  getProjects: () => localProjects,
  getProjectsByClientId: (clientId: string) => localProjects.filter(p => p.clientId === clientId),
  createProject: (data: any) => {
    const p: Project = { id: `p${Date.now()}`, createdAt: new Date().toISOString(), status: 'À faire', type: 'Shorts', ...data };
    localProjects.unshift(p);
    save(STORAGE_KEYS.PROJECTS, localProjects);
    notifyUpdate('projects');
    return p;
  },
  updateProject: (id: string, patch: Partial<Project>) => {
    const idx = localProjects.findIndex(p => p.id === id);
    if (idx !== -1) {
      localProjects[idx] = { ...localProjects[idx], ...patch };
      save(STORAGE_KEYS.PROJECTS, localProjects);
      notifyUpdate('projects');
    }
  },

  getAssets: () => localAssets,
  addAsset: (a: any) => { 
    const asset = { ...a, id: `a${Date.now()}`, createdAt: new Date().toISOString() };
    localAssets.unshift(asset); 
    save(STORAGE_KEYS.ASSETS, localAssets);
    notifyUpdate('assets');
    return asset;
  },

  addAuditLog: (log: AuditLog) => {
      auditLogs.unshift(log);
      if (auditLogs.length > 100) auditLogs.pop();
      save(STORAGE_KEYS.LOGS, auditLogs);
      notifyUpdate('logs');
  },
  getAuditLogs: () => auditLogs,
  getRecentActivity: (limit: number = 5) => auditLogs.slice(0, limit),

  getInvitations: () => invitations,
  createInvitation: (i: Invitation) => { invitations.push(i); save('sb_invitations', invitations); },
  updateInvitation: (id: string, patch: any) => {
    const idx = invitations.findIndex(inv => inv.id === id);
    if (idx !== -1) { invitations[idx] = { ...invitations[idx], ...patch }; save('sb_invitations', invitations); }
  },

  getTemplates: () => templates,
  addTemplate: (t: Template) => templates.push(t),
  getUserSettings: (userId: string) => userSettingsMap.get(userId) || {},
  upsertUserSettings: (userId: string, patch: any) => {
    const current = userSettingsMap.get(userId) || {};
    userSettingsMap.set(userId, { ...current, ...patch });
  },
  getGoogleAccount: (userId: string) => googleAccounts.get(userId),
  saveGoogleAccount: (userId: string, acc: any) => googleAccounts.set(userId, acc),
  disconnectGoogleAccount: (userId: string) => googleAccounts.delete(userId),
  getEmails: (userId: string) => emails.get(userId) || [],
  createEmail: (userId: string, mail: EmailMessage) => {
    const current = emails.get(userId) || [];
    emails.set(userId, [mail, ...current]);
    notifyUpdate('emails');
  },
  setEmails: (userId: string, msgs: EmailMessage[]) => { emails.set(userId, msgs); notifyUpdate('emails'); },
  updateEmailLabel: (id: string, label: string, action: 'add'|'remove') => {
    emails.forEach((list) => {
        const mail = list.find(m => m.id === id);
        if (mail) {
            if (action === 'add' && !mail.labelIds.includes(label)) mail.labelIds.push(label);
            if (action === 'remove') mail.labelIds = mail.labelIds.filter(l => l !== label);
        }
    });
    notifyUpdate('emails');
  },
  getEvents: (userId: string) => events.get(userId) || [],
  createEvent: (userId: string, evt: CalendarEvent) => {
    const current = events.get(userId) || [];
    events.set(userId, [evt, ...current]);
    notifyUpdate('calendar');
  },
  setEvents: (userId: string, evts: CalendarEvent[]) => { events.set(userId, evts); notifyUpdate('calendar'); },
  getDriveFiles: (parentId: string) => driveFiles.filter(f => !parentId || f.parents?.includes(parentId)),
  createDriveFile: (f: DriveFile) => driveFiles.push(f),
  setDriveFiles: (files: DriveFile[]) => { driveFiles = files; notifyUpdate('drive'); },
  createImageJob: (j: ImageJob) => { imageJobs.push(j); aiTokensUsed += j.costTokens; notifyUpdate('jobs'); },
  updateImageJob: (id: string, patch: any) => {
    const idx = imageJobs.findIndex(j => j.id === id);
    if (idx !== -1) imageJobs[idx] = { ...imageJobs[idx], ...patch };
    notifyUpdate('jobs');
  },
  createImageAsset: (a: ImageAsset) => { imageAssets.push(a); notifyUpdate('assets'); },
  getImageJobs: (userId: string) => imageJobs.filter(j => j.userId === userId),
  getImageAssets: (userId: string) => imageAssets.filter(a => a.userId === userId),
  createVideoJob: (j: VideoJob) => { videoJobs.push(j); const durationSec = parseInt(j.params.duration) || 5; aiTokensUsed += (durationSec * 250); notifyUpdate('jobs'); },
  updateVideoJob: (id: string, patch: any) => {
    const idx = videoJobs.findIndex(v => v.id === id);
    if (idx !== -1) videoJobs[idx] = { ...videoJobs[idx], ...patch };
    notifyUpdate('jobs');
  },
  createVideoAsset: (a: VideoAsset) => { videoAssets.push(a); notifyUpdate('assets'); },
  getVideoJobs: (userId: string) => videoJobs.filter(v => v.userId === userId),
  getVideoAssets: (userId: string) => videoAssets.filter(a => a.userId === userId),
  getInvoices: () => localInvoices,
  createInvoice: (i: any) => {
    const inv = { id: `inv${Date.now()}`, created_at: new Date().toISOString(), ...i };
    localInvoices.push(inv);
    notifyUpdate('invoices');
    return inv;
  },
  updateInvoice: (id: string, patch: any) => {
    const idx = localInvoices.findIndex(i => i.id === id);
    if (idx !== -1) { localInvoices[idx] = { ...localInvoices[idx], ...patch }; notifyUpdate('invoices'); }
  },
  getContracts: () => localContracts,
  createContract: (c: any) => {
    const contract = { id: `con${Date.now()}`, created_at: new Date().toISOString(), ...c };
    localContracts.push(contract);
    notifyUpdate('contracts');
    return contract;
  },
  updateContract: (id: string, patch: any) => {
    const idx = localContracts.findIndex(c => c.id === id);
    if (idx !== -1) { localContracts[idx] = { ...localContracts[idx], ...patch }; notifyUpdate('contracts'); }
  },
  encrypt: (t: string) => btoa(t),
  decrypt: (t: string) => atob(t),
  incrementTokens: (amount: number) => { aiTokensUsed += amount; },
  getStats: () => ({
    totalClients: localClients.length,
    pendingInvoices: localInvoices.filter(i => i.status === 'draft').length,
    aiTokensUsed: aiTokensUsed,
    aiTokenLimit: AI_TOKEN_LIMIT
  }),
  exportFullState: () => {
      return {
          timestamp: new Date().toISOString(),
          settings: systemSettings,
          users,
          clients: localClients,
          projects: localProjects,
          logs: auditLogs,
          invoices: localInvoices,
          contracts: localContracts
      };
  }
};
