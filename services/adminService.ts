
import { db } from './mockDatabase';
import { User, UserRole, Invitation, AuditLog } from '../types';
import { authService } from './authService';

export class AdminService {
  
  private currentUserId = 'user_1';
  private currentUserName = 'Admin Pixel';

  private logAction(action: string, targetId?: string, metadata?: any, level: 'info' | 'warn' | 'error' = 'info') {
    db.addAuditLog({
      id: `log_${Date.now()}`,
      actorId: this.currentUserId,
      actorName: this.currentUserName,
      action,
      targetId,
      metadata,
      timestamp: new Date().toISOString(),
      level
    });
  }

  // --- INVITATION FLOW ---

  async inviteNewUser(email: string) {
      const emailLower = email.toLowerCase();
      const existing = db.getUsers().find(u => u.email === emailLower);
      if (existing) throw new Error("Cet utilisateur existe déjà");

      // 1. Créer l'entrée utilisateur temporaire (Invité)
      const newUser: User = {
          id: `u_${Date.now()}`,
          name: "Invité en attente",
          email: emailLower,
          role: UserRole.COLLABORATOR,
          status: 'invited',
          allowedViews: [],
          createdAt: new Date().toISOString()
      };
      db.createUser(newUser);

      // 2. Générer le jeton unique
      const invitation = await this.createInvitation(emailLower, UserRole.COLLABORATOR, 'NEW_ACCOUNT');
      
      // 3. Simuler l'envoi d'email avec l'URL paramétrée
      const settings = db.getSystemSettings();
      const inviteUrl = `${settings.auth.invitePageUrl}?token=${invitation.token}`;
      
      console.log(`[MAIL SIMULATION] To: ${emailLower} | Link: ${inviteUrl}`);

      this.logAction('USER_INVITED', newUser.id, { emailLower, inviteUrl }, 'info');
      
      return { success: true, inviteUrl };
  }

  async finalizeUserRegistration(token: string, data: { name: string, passwordPlain: string }) {
      const inv = db.getInvitations().find(i => i.token === token && i.status === 'pending');
      if (!inv) throw new Error("Invitation invalide ou expirée");

      const user = db.getUsers().find(u => u.email === inv.email);
      if (!user) throw new Error("Profil utilisateur corrompu");

      const passwordHash = await authService.hashPassword(data.passwordPlain);
      
      // Passer en attente de validation admin
      db.updateUser(user.id, { 
          name: data.name,
          status: 'pending_admin', 
          passwordHash,
          passwordPlain: data.passwordPlain
      });

      db.updateInvitation(inv.id, { status: 'accepted', acceptedAt: new Date().toISOString() });
      
      // NOTIFICATION ADMIN (Simulée via log et un flag)
      this.logAction('REGISTRATION_COMPLETE_NOTIFY_ADMIN', user.id, { 
          message: `Nouvel utilisateur inscrit : ${data.name} (${user.email}). En attente de validation.`,
          adminEmail: db.getUserById(this.currentUserId)?.email
      }, 'warn');

      return user;
  }

  async adminValidateUser(userId: string, allowedViews: string[]) {
      const user = db.getUserById(userId);
      if (!user) throw new Error("Utilisateur introuvable");

      db.updateUser(userId, { 
          status: 'active',
          allowedViews 
      });

      this.logAction('USER_VALIDATED_BY_ADMIN', userId, { allowedViews }, 'info');
      return true;
  }

  async getUsers() {
    return db.getUsers();
  }

  async createInvitation(email: string, role: UserRole, type: 'NEW_ACCOUNT' | 'PASSWORD_RESET' = 'NEW_ACCOUNT') {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const token = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const invitation: Invitation = {
      id: `inv_${Date.now()}`,
      email, role, token, type,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdBy: this.currentUserId
    };
    db.createInvitation(invitation);
    return invitation;
  }

  async getInvitations() { return db.getInvitations(); }
  async getAuditLogs() { return db.getAuditLogs(); }

  async deleteUser(userId: string) {
      db.softDeleteUser(userId);
      this.logAction('USER_DELETE', userId, undefined, 'error');
  }
}

export const adminService = new AdminService();
