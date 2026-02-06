
import { 
  User, NotionClient, Project, SystemSettings, WebhookConfig, 
  AuditLog, ConfigVersion, GoogleAccount, ImageJob, VideoJob,
  ImageAsset, VideoAsset, MediaAsset, Invoice, Contract, Template,
  EmailMessage, CalendarEvent, Invitation, DashboardStats, UserRole
} from '../types';

const DEFAULT_WEBHOOK: WebhookConfig = {
  enabled: true,
  url: '',
  lastTestedAt: undefined,
  lastTestStatus: undefined,
  lastTestError: undefined
};

class MockDatabase {
  private users: User[] = [
    { 
      id: 'user_1', 
      email: 'pixelenroute@gmail.com', 
      name: 'pixelenroute', 
      role: UserRole.ADMIN, 
      status: 'active', 
      allowedViews: ['dashboard', 'chat', 'clients', 'projects', 'invoices', 'settings', 'admin', 'images', 'videos', 'library', 'prospection', 'news'],
      createdAt: new Date().toISOString() 
    }
  ];
  
  private clients: NotionClient[] = [];
  private projects: Project[] = [];
  private invoices: Invoice[] = [];
  private contracts: Contract[] = [];
  private templates: Template[] = [];
  
  private imageJobs: ImageJob[] = [];
  private videoJobs: VideoJob[] = [];
  private mediaAssets: MediaAsset[] = [];
  
  private auditLogs: AuditLog[] = [];
  private configVersions: ConfigVersion[] = [];
  private invitations: Invitation[] = [];
  
  // Storage for per-user settings/integrations if needed
  private userSettings: Record<string, any> = {}; 
  private googleAccounts: Record<string, GoogleAccount> = {};
  
  // Storage for cached external data
  private emails: Record<string, EmailMessage[]> = {};
  private events: Record<string, CalendarEvent[]> = {};

  private systemSettings: SystemSettings = {
    id: 'sys_1',
    version: 1,
    appMode: 'developer',
    timezone: 'Europe/Paris',
    branding: {
      name: 'Pixel Studio',
      initials: 'PS',
      primaryColor: '#3b82f6',
      secondaryColor: '#64748b'
    },
    storage: { mode: 'local' },
    auth: { invitePageUrl: 'http://localhost:3000/#join' },
    google: { clientId: '', clientSecret: '', redirectUri: '', gmailProvider: 'api' },
    telegram: { enabled: false, botToken: '' },
    aiConfig: { geminiKey: '' },
    contentCreation: { provider: 'gemini' },
    clients: { mode: 'database' },
    invoices: {},
    images: { endpoint: { ...DEFAULT_WEBHOOK, url: 'https://n8n.srv1027050.hstgr.cloud/webhook/image-gen' } },
    videos: { endpoint: { ...DEFAULT_WEBHOOK, url: 'https://n8n.srv1027050.hstgr.cloud/webhook/video-studio' } },
    chat: { provider: 'n8n', value: 'https://n8n.srv1027050.hstgr.cloud/webhook/assistant-multi-agent' },
    library: {},
    webhooks: {
      unified_workspace: { ...DEFAULT_WEBHOOK, enabled: true, url: 'https://n8n.srv1027050.hstgr.cloud/webhook/unified-workspace' },
      chat: { ...DEFAULT_WEBHOOK, enabled: true, url: 'https://n8n.srv1027050.hstgr.cloud/webhook/assistant-multi-agent' },
      images: { ...DEFAULT_WEBHOOK, enabled: true, url: 'https://n8n.srv1027050.hstgr.cloud/webhook/image-gen' },
      videos: { ...DEFAULT_WEBHOOK, enabled: true, url: 'https://n8n.srv1027050.hstgr.cloud/webhook/video-studio' },
      video_editor: { ...DEFAULT_WEBHOOK, enabled: true, url: 'https://n8n.srv1027050.hstgr.cloud/webhook/video-studio' },
      news: { ...DEFAULT_WEBHOOK, enabled: true, url: 'https://n8n.srv1027050.hstgr.cloud/webhook/news-agent' },
      clients: { ...DEFAULT_WEBHOOK, enabled: true, url: 'https://n8n.srv1027050.hstgr.cloud/webhook/crm-clients' },
      invoices: { ...DEFAULT_WEBHOOK, enabled: true, url: 'https://n8n.srv1027050.hstgr.cloud/webhook/invoice-generator' },
      contracts: { ...DEFAULT_WEBHOOK, enabled: true, url: 'https://n8n.srv1027050.hstgr.cloud/webhook/contract-generator' },
      email_sender: { ...DEFAULT_WEBHOOK, enabled: true, url: 'https://n8n.srv1027050.hstgr.cloud/webhook/email-sender' },
      prospection: { ...DEFAULT_WEBHOOK, enabled: true },
      projects: { ...DEFAULT_WEBHOOK, enabled: true, url: 'https://n8n.srv1027050.hstgr.cloud/webhook/projects-manager' },
      google_workspace: { ...DEFAULT_WEBHOOK, enabled: true, url: 'https://n8n.srv1027050.hstgr.cloud/webhook/google-workspace-sync' }
    },
    modules: {}
  };

  constructor() {
    this.load();
  }

  private load() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('mock_db_v2');
      if (stored) {
        const data = JSON.parse(stored);
        this.users = data.users || this.users;
        this.clients = data.clients || [];
        this.projects = data.projects || [];
        this.invoices = data.invoices || [];
        this.contracts = data.contracts || [];
        this.templates = data.templates || [];
        this.imageJobs = data.imageJobs || [];
        this.videoJobs = data.videoJobs || [];
        this.mediaAssets = data.mediaAssets || [];
        this.auditLogs = data.auditLogs || [];
        this.configVersions = data.configVersions || [];
        this.invitations = data.invitations || [];
        this.userSettings = data.userSettings || {};
        this.googleAccounts = data.googleAccounts || {};
        if (data.systemSettings) {
            // Merge to ensure new fields are present
            this.systemSettings = { ...this.systemSettings, ...data.systemSettings };
            if (!this.systemSettings.webhooks.unified_workspace) {
                this.systemSettings.webhooks.unified_workspace = { ...DEFAULT_WEBHOOK };
            }
        }
      }
    } catch (e) {
      console.error("DB Load Error", e);
    }
  }

  private save() {
    if (typeof window === 'undefined') return;
    const data = {
      users: this.users,
      clients: this.clients,
      projects: this.projects,
      invoices: this.invoices,
      contracts: this.contracts,
      templates: this.templates,
      imageJobs: this.imageJobs,
      videoJobs: this.videoJobs,
      mediaAssets: this.mediaAssets,
      auditLogs: this.auditLogs,
      configVersions: this.configVersions,
      invitations: this.invitations,
      userSettings: this.userSettings,
      googleAccounts: this.googleAccounts,
      systemSettings: this.systemSettings
    };
    localStorage.setItem('mock_db_v2', JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('db-updated', { detail: { type: 'all' } }));
  }

  public exportFullState() { return JSON.parse(localStorage.getItem('mock_db_v2') || '{}'); }

  // --- SYSTEM SETTINGS ---
  getSystemSettings() { return this.systemSettings; }
  updateSystemSettings(settings: Partial<SystemSettings>) {
    this.systemSettings = { ...this.systemSettings, ...settings };
    this.save();
    return this.systemSettings;
  }
  
  // --- GLOBAL SETTINGS (Alias for SystemSettings for compatibility) ---
  getGlobalSettings() { return this.getSystemSettings(); }
  updateGlobalSettings(settings: Partial<SystemSettings>, userId: string) {
      this.systemSettings = { ...this.systemSettings, ...settings };
      this.save();
  }

  // --- USERS ---
  getUsers() { return this.users; }
  getUserById(id: string) { return this.users.find(u => u.id === id); }
  createUser(user: User) { this.users.push(user); this.save(); return user; }
  updateUser(id: string, updates: Partial<User>) {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.users[idx] = { ...this.users[idx], ...updates };
      this.save();
    }
  }
  softDeleteUser(id: string) {
      const idx = this.users.findIndex(u => u.id === id);
      if (idx !== -1) {
          this.users[idx].status = 'disabled';
          this.save();
      }
  }

  getUserSettings(userId: string) { return this.userSettings[userId]; }
  upsertUserSettings(userId: string, settings: any) {
      this.userSettings[userId] = { ...this.userSettings[userId], ...settings };
      this.save();
  }

  // --- CLIENTS ---
  getClients() { return this.clients; }
  getClientById(id: string) { return this.clients.find(c => c.id === id); }
  createClient(client: Partial<NotionClient>) {
    const newClient = { ...client, id: client.id || `cli_${Date.now()}` } as NotionClient;
    this.clients.push(newClient);
    this.save();
    return newClient;
  }
  setClients(clients: NotionClient[]) {
      this.clients = clients;
      this.save();
  }
  softDeleteClient(id: string) {
      const idx = this.clients.findIndex(c => c.id === id);
      if (idx !== -1) {
          this.clients[idx].isArchived = true;
          this.save();
      }
  }

  // --- PROJECTS ---
  getProjects() { return this.projects; }
  getProjectsByClientId(clientId: string) { return this.projects.filter(p => p.clientId === clientId); }
  createProject(project: Partial<Project>) {
    const newProject = { ...project, id: project.id || `proj_${Date.now()}`, createdAt: new Date().toISOString() } as Project;
    this.projects.push(newProject);
    this.save();
    return newProject;
  }
  updateProject(id: string, updates: Partial<Project>) {
      const idx = this.projects.findIndex(p => p.id === id);
      if (idx !== -1) {
          this.projects[idx] = { ...this.projects[idx], ...updates };
          this.save();
      }
  }

  // --- MEDIA ---
  getImageJobs(userId: string) { return this.imageJobs.filter(j => j.userId === userId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }
  createImageJob(job: ImageJob) { this.imageJobs.unshift(job); this.save(); }
  updateImageJob(id: string, updates: Partial<ImageJob>) {
      const idx = this.imageJobs.findIndex(j => j.id === id);
      if (idx !== -1) {
          this.imageJobs[idx] = { ...this.imageJobs[idx], ...updates };
          this.save();
      }
  }
  
  getVideoJobs(userId: string) { return this.videoJobs.filter(j => j.userId === userId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }
  createVideoJob(job: VideoJob) { this.videoJobs.unshift(job); this.save(); }
  updateVideoJob(id: string, updates: Partial<VideoJob>) {
      const idx = this.videoJobs.findIndex(j => j.id === id);
      if (idx !== -1) {
          this.videoJobs[idx] = { ...this.videoJobs[idx], ...updates };
          this.save();
      }
  }

  getAssets() { return this.mediaAssets; } // All assets for gallery
  getImageAssets(userId: string) { return this.mediaAssets.filter(a => a.userId === userId && a.type === 'image'); }
  getVideoAssets(userId: string) { return this.mediaAssets.filter(a => a.userId === userId && a.type === 'video'); }
  createImageAsset(asset: ImageAsset) { this.mediaAssets.unshift(asset); this.save(); }
  createVideoAsset(asset: VideoAsset) { this.mediaAssets.unshift(asset); this.save(); }
  addAsset(asset: MediaAsset): MediaAsset { 
      this.mediaAssets.unshift(asset); 
      this.save();
      return asset;
  }

  // --- STATS ---
  getStats(): DashboardStats {
      return {
          totalClients: this.clients.length,
          pendingInvoices: this.invoices.filter(i => i.status === 'draft' || i.status === 'sent').length,
          aiTokensUsed: 125000, // Mocked
          aiTokenLimit: 1000000
      };
  }

  // --- AUDIT LOGS ---
  addAuditLog(log: AuditLog) {
      this.auditLogs.unshift(log);
      if (this.auditLogs.length > 500) this.auditLogs.pop();
      this.save();
      window.dispatchEvent(new CustomEvent('db-updated', { detail: { type: 'logs' } }));
  }
  getAuditLogs() { return this.auditLogs; }
  getRecentActivity(limit: number) { return this.auditLogs.slice(0, limit); }

  // --- CONFIG VERSIONS ---
  addConfigVersion(v: ConfigVersion) {
      this.configVersions.unshift(v);
      this.save();
  }
  getConfigVersions() { return this.configVersions; }
  getConfigVersionById(id: string) { return this.configVersions.find(v => v.id === id); }
  updateConfigVersion(id: string, updates: Partial<ConfigVersion>) {
      const idx = this.configVersions.findIndex(v => v.id === id);
      if (idx !== -1) {
          this.configVersions[idx] = { ...this.configVersions[idx], ...updates };
          this.save();
      }
  }

  // --- INVITATIONS ---
  getInvitations() { return this.invitations; }
  createInvitation(inv: Invitation) { this.invitations.push(inv); this.save(); }
  updateInvitation(id: string, updates: Partial<Invitation>) {
      const idx = this.invitations.findIndex(i => i.id === id);
      if (idx !== -1) {
          this.invitations[idx] = { ...this.invitations[idx], ...updates };
          this.save();
      }
  }

  // --- GOOGLE ACCOUNTS ---
  getGoogleAccount(userId: string) { return this.googleAccounts[userId]; }
  saveGoogleAccount(userId: string, account: GoogleAccount) {
      this.googleAccounts[userId] = account;
      this.save();
  }
  disconnectGoogleAccount(userId: string) {
      delete this.googleAccounts[userId];
      this.save();
  }

  // --- INVOICES & CONTRACTS ---
  getInvoices() { return this.invoices; }
  createInvoice(inv: Partial<Invoice>) { 
      const newInv = { ...inv, id: inv.id || `inv_${Date.now()}`, created_at: new Date().toISOString(), number: `INV-${Date.now()}` } as Invoice;
      this.invoices.push(newInv);
      this.save();
      return newInv;
  }
  updateInvoice(id: string, updates: Partial<Invoice>) {
      const idx = this.invoices.findIndex(i => i.id === id);
      if (idx !== -1) {
          this.invoices[idx] = { ...this.invoices[idx], ...updates };
          this.save();
      }
  }

  getContracts() { return this.contracts; }
  createContract(c: Partial<Contract>) {
      const newC = { ...c, id: c.id || `ctr_${Date.now()}`, created_at: new Date().toISOString() } as Contract;
      this.contracts.push(newC);
      this.save();
      return newC;
  }
  updateContract(id: string, updates: Partial<Contract>) {
      const idx = this.contracts.findIndex(c => c.id === id);
      if (idx !== -1) {
          this.contracts[idx] = { ...this.contracts[idx], ...updates };
          this.save();
      }
  }

  getTemplates() { return this.templates; }
  addTemplate(t: Template) { this.templates.push(t); this.save(); }

  // --- ENCRYPTION HELPER ---
  encrypt(text: string) { return btoa(encodeURIComponent(text)); } // Simple base64 for mock
  decrypt(text: string) { return decodeURIComponent(atob(text)); }

  // --- TEMP CACHE FOR EMAILS/EVENTS ---
  setEmails(userId: string, emails: EmailMessage[]) { this.emails[userId] = emails; }
  getEmails(userId: string) { return this.emails[userId] || []; }
  setEvents(userId: string, events: CalendarEvent[]) { this.events[userId] = events; }
  getEvents(userId: string) { return this.events[userId] || []; }
}

export const db = new MockDatabase();
