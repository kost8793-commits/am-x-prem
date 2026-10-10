/**
 * Account Security & Password Protection Service
 * Protects Google accounts & VIP Classes with SHA-256 cryptographic hashing
 * to prevent unauthorized access, class-hijacking, and hacking.
 */

export interface StoredAccountAuth {
  email: string;
  passwordHash: string;
  createdAt: number;
  updatedAt?: number;
}

export interface PasswordStrength {
  score: number; // 0 to 3
  label: 'Terlalu Pendek' | 'Lemah' | 'Sedang' | 'Kuat';
  color: string;
  feedback: string;
}

export const accountSecurityService = {
  /**
   * Hashes a password using browser standard Web Crypto API (SHA-256) + salt
   */
  async hashPassword(password: string, email: string): Promise<string> {
    const cleanEmail = email.toLowerCase().trim();
    const encoder = new TextEncoder();
    const salt = 'am_bot_secure_shield_v2026';
    const data = encoder.encode(`${cleanEmail}:${password}:${salt}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Checks if an email account has already created a security password
   */
  hasPassword(email: string): boolean {
    if (!email) return false;
    const key = `am_user_auth_${email.toLowerCase().trim()}`;
    const stored = localStorage.getItem(key);
    return Boolean(stored);
  },

  /**
   * Registers a new security password for an email account
   */
  async registerPassword(email: string, password: string): Promise<boolean> {
    if (!email || !password || password.length < 6) return false;
    const cleanEmail = email.toLowerCase().trim();
    const hash = await this.hashPassword(password, cleanEmail);
    const authData: StoredAccountAuth = {
      email: cleanEmail,
      passwordHash: hash,
      createdAt: Date.now(),
    };
    const key = `am_user_auth_${cleanEmail}`;
    localStorage.setItem(key, JSON.stringify(authData));
    return true;
  },

  /**
   * Verifies an entered password against the stored SHA-256 hash
   */
  async verifyPassword(email: string, password: string): Promise<boolean> {
    if (!email || !password) return false;
    const cleanEmail = email.toLowerCase().trim();
    const key = `am_user_auth_${cleanEmail}`;
    const raw = localStorage.getItem(key);
    if (!raw) return false;

    try {
      const parsed: StoredAccountAuth = JSON.parse(raw);
      const computedHash = await this.hashPassword(password, cleanEmail);
      return computedHash === parsed.passwordHash;
    } catch {
      return false;
    }
  },

  /**
   * Resets / updates the password for an existing account
   */
  async resetPassword(email: string, newPassword: string): Promise<boolean> {
    if (!email || !newPassword || newPassword.length < 6) return false;
    const cleanEmail = email.toLowerCase().trim();
    const hash = await this.hashPassword(newPassword, cleanEmail);
    const key = `am_user_auth_${cleanEmail}`;
    const raw = localStorage.getItem(key);
    const prevCreated = raw ? JSON.parse(raw)?.createdAt || Date.now() : Date.now();

    const authData: StoredAccountAuth = {
      email: cleanEmail,
      passwordHash: hash,
      createdAt: prevCreated,
      updatedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(authData));
    return true;
  },

  /**
   * Calculates password strength
   */
  checkPasswordStrength(password: string): PasswordStrength {
    if (!password || password.length < 6) {
      return {
        score: 0,
        label: 'Terlalu Pendek',
        color: 'text-neutral-500',
        feedback: 'Minimal 6 karakter diperlukan.',
      };
    }

    let score = 1;
    const hasNumbers = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (hasNumbers && (hasUpper || hasSpecial) && password.length >= 8) {
      score = 3;
    } else if (hasNumbers || hasUpper || hasSpecial) {
      score = 2;
    }

    if (score === 3) {
      return {
        score: 3,
        label: 'Kuat',
        color: 'text-emerald-400',
        feedback: 'Kombinasi password sangat baik & aman dari retasan.',
      };
    } else if (score === 2) {
      return {
        score: 2,
        label: 'Sedang',
        color: 'text-amber-400',
        feedback: 'Tambahkan angka/simbol untuk kekuatan maksimal.',
      };
    } else {
      return {
        score: 1,
        label: 'Lemah',
        color: 'text-rose-400',
        feedback: 'Terlalu mudah ditebak, gunakan huruf kapital/angka.',
      };
    }
  },
};
