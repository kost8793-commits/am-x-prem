import { AccountQuotaInfo, QuotaCheckResult } from '../types';

const QUOTA_STORAGE_KEY = 'am_bot_account_quotas';
const MAX_LIMIT_PER_ACCOUNT = 5;
const COOLDOWN_DURATION_MS = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds (48 hours)

export const quotaService = {
  /**
   * Format milliseconds into human-readable Indonesian time string (e.g., "1 hari 18 jam", "47 jam 30 menit")
   */
  formatDuration(ms: number): string {
    if (ms <= 0) return '0 menit';
    const totalSeconds = Math.floor(ms / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    const remainingMinutes = totalMinutes % 60;

    if (days > 0) {
      return `${days} hari ${remainingHours} jam ${remainingMinutes} menit`;
    }
    if (totalHours > 0) {
      return `${totalHours} jam ${remainingMinutes} menit`;
    }
    return `${Math.max(1, remainingMinutes)} menit`;
  },

  /**
   * Get all stored quota records from localStorage
   */
  getAllQuotas(): Record<string, AccountQuotaInfo> {
    try {
      const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse account quotas:', e);
    }
    return {};
  },

  /**
   * Save quotas back to localStorage
   */
  saveQuotas(data: Record<string, AccountQuotaInfo>): void {
    try {
      localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save account quotas:', e);
    }
  },

  /**
   * Get quota record for a specific email
   */
  getAccountQuota(rawEmail: string): AccountQuotaInfo {
    const email = rawEmail.trim().toLowerCase();
    const all = this.getAllQuotas();
    let record = all[email];

    const now = Date.now();

    if (!record) {
      record = {
        email,
        usageCount: 0,
        maxLimit: MAX_LIMIT_PER_ACCOUNT,
        history: [],
      };
      all[email] = record;
      this.saveQuotas(all);
      return record;
    }

    // Check if 2-day cooldown has expired!
    if (record.lockedUntil && now >= record.lockedUntil) {
      // 2 days have passed! Auto-reset the count!
      record.usageCount = 0;
      record.lockedUntil = undefined;
      all[email] = record;
      this.saveQuotas(all);
    }

    return record;
  },

  /**
   * Check if an account is eligible to be activated
   */
  checkEligibility(rawEmail: string, isVip: boolean): QuotaCheckResult {
    const email = rawEmail.trim().toLowerCase();
    if (!email) {
      return {
        allowed: false,
        usageCount: 0,
        maxLimit: MAX_LIMIT_PER_ACCOUNT,
        remaining: 0,
        isLocked: false,
        isVipBypass: false,
        reason: 'Email belum diisi.',
      };
    }

    const quota = this.getAccountQuota(email);
    const now = Date.now();

    // VIP and VIP++ users bypass all limits and cooldowns!
    if (isVip) {
      return {
        allowed: true,
        usageCount: quota.usageCount,
        maxLimit: MAX_LIMIT_PER_ACCOUNT,
        remaining: 999,
        isLocked: false,
        isVipBypass: true,
        reason: 'VIP / VIP++ Aktif: Bebas Limit 5x & Tanpa Cooldown 2 Hari.',
      };
    }

    // Check if locked in 2-day cooldown
    if (quota.lockedUntil && now < quota.lockedUntil) {
      const cooldownRemainingMs = quota.lockedUntil - now;
      const cooldownFormatted = this.formatDuration(cooldownRemainingMs);
      return {
        allowed: false,
        usageCount: quota.usageCount,
        maxLimit: MAX_LIMIT_PER_ACCOUNT,
        remaining: 0,
        isLocked: true,
        lockedUntil: quota.lockedUntil,
        cooldownRemainingMs,
        cooldownFormatted,
        isVipBypass: false,
        reason: `Batas limit 5x untuk akun ${email} telah tercapai. Harap tunggu 2 hari (${cooldownFormatted}) atau upgrade ke VIP/VIP++ untuk bypass.`,
      };
    }

    // Check if usageCount reached max limit (5)
    if (quota.usageCount >= MAX_LIMIT_PER_ACCOUNT) {
      // Set 2 days lock starting now
      const lockedUntil = now + COOLDOWN_DURATION_MS;
      quota.lockedUntil = lockedUntil;
      const all = this.getAllQuotas();
      all[email] = quota;
      this.saveQuotas(all);

      const cooldownFormatted = this.formatDuration(COOLDOWN_DURATION_MS);
      return {
        allowed: false,
        usageCount: quota.usageCount,
        maxLimit: MAX_LIMIT_PER_ACCOUNT,
        remaining: 0,
        isLocked: true,
        lockedUntil,
        cooldownRemainingMs: COOLDOWN_DURATION_MS,
        cooldownFormatted,
        isVipBypass: false,
        reason: `Batas limit 5x untuk akun ${email} telah tercapai. Harap tunggu 2 hari (${cooldownFormatted}) atau gunakan VIP/VIP++.`,
      };
    }

    const remaining = MAX_LIMIT_PER_ACCOUNT - quota.usageCount;
    return {
      allowed: true,
      usageCount: quota.usageCount,
      maxLimit: MAX_LIMIT_PER_ACCOUNT,
      remaining,
      isLocked: false,
      isVipBypass: false,
    };
  },

  /**
   * Record a successful activation for an account
   */
  recordActivation(rawEmail: string, codeOrder: string, isVip: boolean): AccountQuotaInfo {
    const email = rawEmail.trim().toLowerCase();
    const all = this.getAllQuotas();
    let record = all[email] || {
      email,
      usageCount: 0,
      maxLimit: MAX_LIMIT_PER_ACCOUNT,
      history: [],
    };

    const now = Date.now();
    record.usageCount += 1;
    record.lastActivatedAt = now;
    if (!record.history) record.history = [];
    record.history.push({ code: codeOrder, timestamp: now });

    // If regular user reached 5x, start 2-day cooldown!
    if (!isVip && record.usageCount >= MAX_LIMIT_PER_ACCOUNT) {
      record.lockedUntil = now + COOLDOWN_DURATION_MS;
    }

    all[email] = record;
    this.saveQuotas(all);
    return record;
  },

  /**
   * Reset quota for an email (e.g., admin action or key upgrade)
   */
  resetAccount(rawEmail: string): void {
    const email = rawEmail.trim().toLowerCase();
    const all = this.getAllQuotas();
    if (all[email]) {
      all[email].usageCount = 0;
      all[email].lockedUntil = undefined;
      this.saveQuotas(all);
    }
  },
};
