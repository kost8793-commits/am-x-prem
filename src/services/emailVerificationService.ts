/**
 * Advanced Email Verification & Temp-Mail Detection Engine
 * Uses deep Regular Expressions (Regex) and Third-Party API verification
 * to detect disposable email providers, temp-mail, and fake accounts in real-time.
 */

const KNOWN_TEMP_MAIL_DOMAINS = new Set([
  // 1secmail network
  '1secmail.com',
  '1secmail.org',
  '1secmail.net',
  'wwjmp.com',
  'esiix.com',
  'xmail.com',
  // Popular disposable email services
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'guerrillamail.com',
  'guerrillamailblock.com',
  'guerrillamail.info',
  'guerrillamail.biz',
  'guerrillamail.net',
  'guerrillamail.org',
  'sharklasers.com',
  'grr.la',
  'pokemail.net',
  'spam4.me',
  'mailinator.com',
  'mailinator2.com',
  'yopmail.com',
  'yopmail.net',
  'cool.fr.nf',
  'jetable.fr.nf',
  'trashmail.com',
  'trashmail.net',
  'trashmail.me',
  'dispostable.com',
  'fakemail.net',
  'mohmal.com',
  'mohmal.im',
  'generator.email',
  'nada.ltd',
  'getairmail.com',
  'inboxkitten.com',
  'burnermail.io',
  'bccto.me',
  'chacuo.net',
  '0-mail.com',
  'dropmail.me',
  '10minutemail.com',
  '10minutemail.net',
  'minuteinbox.com',
  'crazymailing.com',
  'mytemp.email',
  'tempail.com',
  'emailondeck.com',
  'throwawaymail.com',
  'maildrop.cc',
  'harakirimail.com',
  'fakeinbox.com',
  'tempinbox.com',
  'disposablemail.com',
  'getnada.com',
  'abcvg.com',
  'boximail.com',
  'inboxbear.com',
  'mailcatch.com',
  'mytempmail.com',
  'zillamail.com',
  'guerrillamail.de',
  'sharkmail.com',
  'tempmailaddress.com',
  'tempemail.co',
  'temporary-email.net',
  'crazymail.com',
  'anonaddy.com',
  'duck.com',
  'simplelogin.co',
  'trash-mail.at',
  'trash-mail.com',
  'trash-mail.org',
  'trash-me.com',
  'wegwerfmail.de',
  'wegwerfmail.net',
  'wegwerfmail.org',
]);

// Regex for detecting disposable keywords in domain names
const DISPOSABLE_DOMAIN_REGEX =
  /(?:^|\.)(?:temp(?:mail|inbox|email)?|trash(?:mail)?|fake(?:mail|inbox)?|dispos(?:able)?|throwaway|burner|junk|minute(?:inbox)?|guerrilla(?:mail)?|mohmal|nada|airmail|generator(?:email)?|inboxbear|1sec(?:mail)?|mailcatch|pokemail|sharklaser|dropmail|crazymail|mytemp|tempail|maildrop|harakiri|zillamail|boximail|abcvg|wegwerf)(?:\.[a-z]{2,})+$/i;

// RFC 5322 compliant regex for basic email syntax validation
const EMAIL_RFC_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Strict Gmail username rules regex: 6 to 30 chars, alphanumeric and dots, no dots at ends or consecutive
const GMAIL_ALLOWED_CHARS_REGEX = /^[a-zA-Z0-9.]+$/;

// Synthetic/Bot generator pattern detection regex (e.g. keyboard runs or repeated char spam)
const SYNTHETIC_BOT_REGEX = /([a-z0-9])\1{4,}|^(qwerty|asdfgh|zxcvbn|123456|098765)/i;

export interface EmailVerificationResult {
  isValid: boolean;
  isTempMail: boolean;
  domain: string;
  username: string;
  reason?: string;
  accountType: 'genuine_gmail' | 'workspace_google' | 'temp_mail' | 'invalid';
  checkedVia?: 'regex_instant' | 'third_party_api' | 'dns_mx';
}

export const emailVerificationService = {
  /**
   * Synchronous Deep Regex Check
   * Instant validation for input changes and keystrokes
   */
  verifyEmail(rawEmail: string): EmailVerificationResult {
    const email = rawEmail.trim().toLowerCase();

    // 1. Basic format RFC check using Regex
    if (!EMAIL_RFC_REGEX.test(email)) {
      return {
        isValid: false,
        isTempMail: false,
        domain: '',
        username: '',
        reason: 'Format email tidak valid (harus mengandung @ dan domain yang sah).',
        accountType: 'invalid',
        checkedVia: 'regex_instant',
      };
    }

    const [username, domain] = email.split('@');

    // 2. Blacklist check against known temp-mail database
    if (KNOWN_TEMP_MAIL_DOMAINS.has(domain)) {
      return {
        isValid: true,
        isTempMail: true,
        domain,
        username,
        reason: `Alamat terdeteksi menggunakan domain temp-mail (@${domain}).`,
        accountType: 'temp_mail',
        checkedVia: 'regex_instant',
      };
    }

    // 3. Keyword Pattern Matching via Regular Expressions
    if (DISPOSABLE_DOMAIN_REGEX.test(domain) && !domain.includes('gmail') && !domain.includes('google')) {
      return {
        isValid: true,
        isTempMail: true,
        domain,
        username,
        reason: `Pola domain @${domain} cocok dengan signature email sementara (disposable/temp-mail).`,
        accountType: 'temp_mail',
        checkedVia: 'regex_instant',
      };
    }

    // 4. Strict Google / Gmail Structure Verification via Regex
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      const cleanUser = username.replace(/\./g, '');

      // Rule: Length 6 - 30 chars
      if (cleanUser.length < 6) {
        return {
          isValid: false,
          isTempMail: true,
          domain,
          username,
          reason: 'Gmail tidak valid: Nama akun Gmail asli minimal harus 6 karakter.',
          accountType: 'invalid',
          checkedVia: 'regex_instant',
        };
      }
      if (cleanUser.length > 30) {
        return {
          isValid: false,
          isTempMail: true,
          domain,
          username,
          reason: 'Gmail tidak valid: Nama akun Gmail asli maksimal 30 karakter.',
          accountType: 'invalid',
          checkedVia: 'regex_instant',
        };
      }

      // Rule: Allowed characters only
      if (!GMAIL_ALLOWED_CHARS_REGEX.test(username)) {
        return {
          isValid: false,
          isTempMail: true,
          domain,
          username,
          reason: 'Gmail tidak valid: Hanya huruf (a-z), angka (0-9), dan titik (.) yang diizinkan.',
          accountType: 'invalid',
          checkedVia: 'regex_instant',
        };
      }

      // Rule: Dots placement
      if (username.startsWith('.') || username.endsWith('.') || username.includes('..')) {
        return {
          isValid: false,
          isTempMail: true,
          domain,
          username,
          reason: 'Gmail tidak valid: Titik tidak boleh berada di awal, di akhir, atau berturut-turut.',
          accountType: 'invalid',
          checkedVia: 'regex_instant',
        };
      }

      // Rule: Synthetic spam / bot patterns
      if (SYNTHETIC_BOT_REGEX.test(username) && username.length > 16) {
        return {
          isValid: true,
          isTempMail: true,
          domain,
          username,
          reason: 'Pola email terdeteksi sebagai burner bot generator.',
          accountType: 'temp_mail',
          checkedVia: 'regex_instant',
        };
      }

      return {
        isValid: true,
        isTempMail: false,
        domain,
        username,
        accountType: 'genuine_gmail',
        checkedVia: 'regex_instant',
      };
    }

    // 5. Non-Gmail domain evaluation
    const tld = domain.split('.').pop();
    if (!tld || tld.length < 2) {
      return {
        isValid: false,
        isTempMail: true,
        domain,
        username,
        reason: 'Domain email tidak memiliki TLD yang valid.',
        accountType: 'invalid',
        checkedVia: 'regex_instant',
      };
    }

    const trustedDomains = new Set(['google.com', 'gmail.com', 'googlemail.com']);
    if (!trustedDomains.has(domain)) {
      return {
        isValid: true,
        isTempMail: true,
        domain,
        username,
        reason: `Bukan akun resmi Google/Gmail (@${domain}). Diberikan Class Temp Mail (Limit 1 Akun).`,
        accountType: 'temp_mail',
        checkedVia: 'regex_instant',
      };
    }

    return {
      isValid: true,
      isTempMail: false,
      domain,
      username,
      accountType: 'genuine_gmail',
      checkedVia: 'regex_instant',
    };
  },

  /**
   * Asynchronous Check combining Deep Regex + Third-Party API & DNS MX verification
   */
  async verifyEmailAsync(rawEmail: string): Promise<EmailVerificationResult> {
    // Run instant regex first
    const regexResult = this.verifyEmail(rawEmail);

    // If already invalid or confirmed temp-mail via local database/regex, return immediately
    if (!regexResult.isValid || (regexResult.isTempMail && regexResult.accountType === 'temp_mail')) {
      return regexResult;
    }

    const cleanEmail = rawEmail.trim().toLowerCase();
    const [, domain] = cleanEmail.split('@');

    // Query server-side verification endpoint which runs third-party APIs (Kickbox / Debounce) & DNS MX check
    try {
      const response = await fetch(`/api/verify-email?email=${encodeURIComponent(cleanEmail)}`, {
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const rawText = await response.text();
        if (rawText && !rawText.trim().startsWith('<')) {
          try {
            const apiData = JSON.parse(rawText);
            if (apiData && apiData.isTempMail) {
              return {
                isValid: true,
                isTempMail: true,
                domain,
                username: regexResult.username,
                reason: apiData.reason || `Domain terdeteksi sebagai disposable temp-mail oleh verifikasi API pihak ketiga.`,
                accountType: 'temp_mail',
                checkedVia: 'third_party_api',
              };
            }
            if (apiData && apiData.isValid === false) {
              return {
                isValid: false,
                isTempMail: true,
                domain,
                username: regexResult.username,
                reason: 'Domain email tidak memiliki record MX aktif (tidak dapat menerima email).',
                accountType: 'invalid',
                checkedVia: 'dns_mx',
              };
            }
          } catch {
            // Ignore parse error and proceed to fallback
          }
        }
      }
    } catch {
      // Direct client fallback to Kickbox public API if server route is unavailable
      try {
        const fallbackRes = await fetch(`https://open.kickbox.com/v1/disposable/${encodeURIComponent(domain)}`, {
          signal: AbortSignal.timeout(2000),
        });
        if (fallbackRes.ok) {
          const kickboxData = await fallbackRes.json();
          if (kickboxData && kickboxData.disposable === true) {
            return {
              isValid: true,
              isTempMail: true,
              domain,
              username: regexResult.username,
              reason: 'Domain terdeteksi sebagai disposable temporary email oleh Kickbox API.',
              accountType: 'temp_mail',
              checkedVia: 'third_party_api',
            };
          }
        }
      } catch {
        // Fallback gracefully to regex result
      }
    }

    return regexResult;
  },
};
