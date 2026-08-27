import { ClubLeadership, LeadershipRole, LeadershipMember } from '../types';
import { formatInterviewerDisplayName } from '../components/ObserverDashboard';

/**
 * Clean and normalize interviewer name for role comparison
 */
export function normalizeInterviewerName(name: string): string {
  if (!name) return '';
  return formatInterviewerDisplayName(name).trim().toLowerCase();
}

/**
 * Determine whether a given person name is Captain, Vice-Captain, or regular interviewer
 */
export function getLeadershipRole(
  nameOrObj?: string | { name?: string; interviewerName?: string; senderName?: string } | null,
  leadership?: ClubLeadership | null
): LeadershipRole {
  if (!nameOrObj || !leadership) return 'NONE';

  let rawName = '';
  if (typeof nameOrObj === 'string') {
    rawName = nameOrObj;
  } else {
    rawName = nameOrObj.name || nameOrObj.interviewerName || nameOrObj.senderName || '';
  }

  const cleanTarget = normalizeInterviewerName(rawName);
  if (!cleanTarget) return 'NONE';

  // Check Captain
  if (leadership.captain && leadership.captain.name) {
    if (normalizeInterviewerName(leadership.captain.name) === cleanTarget) {
      return 'CAPTAIN';
    }
  }

  // Check Vice Captains
  if (Array.isArray(leadership.viceCaptains)) {
    for (const vc of leadership.viceCaptains) {
      if (vc && vc.name && normalizeInterviewerName(vc.name) === cleanTarget) {
        return 'VICE_CAPTAIN';
      }
    }
  }

  return 'NONE';
}

/**
 * Get display badge configuration for leadership role
 */
export function getLeadershipBadgeConfig(role: LeadershipRole): {
  isLeader: boolean;
  label: string;
  shortLabel: string;
  icon: string;
  color: 'amber' | 'purple' | 'slate';
  badgeClass: string;
  pillClass: string;
  tagClass: string;
} {
  if (role === 'CAPTAIN') {
    return {
      isLeader: true,
      label: 'SmartLab 기장',
      shortLabel: '기장',
      icon: '👑',
      color: 'amber',
      badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs',
      pillClass: 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-xs',
      tagClass: 'bg-amber-50 text-amber-800 border border-amber-300 font-bold'
    };
  }

  if (role === 'VICE_CAPTAIN') {
    return {
      isLeader: true,
      label: 'SmartLab 부기장',
      shortLabel: '부기장',
      icon: '⭐',
      color: 'purple',
      badgeClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs',
      pillClass: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black shadow-xs',
      tagClass: 'bg-purple-50 text-purple-800 border border-purple-300 font-bold'
    };
  }

  return {
    isLeader: false,
    label: '',
    shortLabel: '',
    icon: '',
    color: 'slate',
    badgeClass: '',
    pillClass: '',
    tagClass: ''
  };
}
