/**
 * Flay Omni - Team Management
 * Gestion d'equipes, roles, permissions
 */

const crypto = require('crypto');

class TeamManager {
    constructor() {
        this.teams = new Map();
        this.members = new Map();
        this.invitations = new Map();
        this.roles = {
            owner: { label: 'Proprietaire', permissions: ['all'] },
            admin: { label: 'Admin', permissions: ['edit_profile', 'manage_members', 'view_analytics', 'manage_reservations', 'manage_payments'] },
            editor: { label: 'Editeur', permissions: ['edit_profile', 'view_analytics'] },
            viewer: { label: 'Lecteur', permissions: ['view_analytics'] }
        };
    }

    createTeam(ownerId, data) {
        const id = `team_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const team = {
            id, ownerId,
            name: data.name || 'Mon equipe',
            plan: 'free',
            createdAt: new Date().toISOString()
        };
        this.teams.set(id, team);
        this.addMember(id, ownerId, { role: 'owner', name: data.ownerName || '' });
        return team;
    }

    addMember(teamId, userId, data = {}) {
        const id = `member_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const member = {
            id, teamId, userId,
            role: data.role || 'viewer',
            name: data.name || '',
            email: data.email || '',
            joinedAt: new Date().toISOString(),
            active: true
        };
        this.members.set(id, member);
        return member;
    }

    removeMember(memberId) {
        this.members.delete(memberId);
    }

    updateMemberRole(memberId, role) {
        const member = this.members.get(memberId);
        if (member) member.role = role;
        return member;
    }

    getTeamMembers(teamId) {
        const members = [];
        for (const [, m] of this.members) {
            if (m.teamId === teamId) members.push(m);
        }
        return members;
    }

    getUserTeams(userId) {
        const teams = [];
        for (const [, m] of this.members) {
            if (m.userId === userId && m.active) {
                const team = this.teams.get(m.teamId);
                if (team) teams.push({ ...team, role: m.role });
            }
        }
        return teams;
    }

    hasPermission(teamId, userId, permission) {
        for (const [, m] of this.members) {
            if (m.teamId === teamId && m.userId === userId && m.active) {
                const role = this.roles[m.role];
                return role?.permissions.includes('all') || role?.permissions.includes(permission);
            }
        }
        return false;
    }

    inviteMember(teamId, email, role, invitedBy) {
        const id = `inv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const invite = {
            id, teamId, email, role,
            invitedBy,
            token: crypto.randomBytes(32).toString('hex'),
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        this.invitations.set(id, invite);
        return invite;
    }

    acceptInvite(inviteId, userId) {
        const invite = this.invitations.get(inviteId);
        if (!invite || invite.status !== 'pending') return null;
        invite.status = 'accepted';
        return this.addMember(invite.teamId, userId, { role: invite.role, email: invite.email });
    }

    getPendingInvites(teamId) {
        const invites = [];
        for (const [, inv] of this.invitations) {
            if (inv.teamId === teamId && inv.status === 'pending') invites.push(inv);
        }
        return invites;
    }

    getTeamStats(teamId) {
        const members = this.getTeamMembers(teamId);
        return {
            totalMembers: members.length,
            activeMembers: members.filter(m => m.active).length,
            roles: members.reduce((acc, m) => { acc[m.role] = (acc[m.role] || 0) + 1; return acc; }, {})
        };
    }
}

module.exports = new TeamManager();
