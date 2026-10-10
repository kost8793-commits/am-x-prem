export type VipTier = 'free' | 'vip' | 'vip_plus' | 'owner' | 'temp_mail';

export interface VipConfig {
  tier: VipTier;
  key?: string;
  name: string;
  price: number; // 0 for free/temp_mail, 10000 for vip, 15000 for vip_plus, 0 for owner
  batchLimit: number; // 1 for temp_mail, 5 for free, 10 for vip, 20 for vip_plus, 50 for owner
  isUnlimited: boolean;
  parallelSpeed: boolean;
  expiryDate?: string;
  features: string[];
}

export interface CreatedAmAccount {
  id: string;
  email: string;
  password?: string;
  tempMailToken?: string;
  createdAt: string;
  status: 'created' | 'magic_link_sent' | 'premium_active' | 'failed';
  magicLink?: string;
  oobCode?: string;
  orderCode?: string;
  autoLoginUrl?: string;
  deeplinkAm?: string;
  premiumExpiresAt?: string;
}

export interface UserProfile {
  uid?: string;
  idToken?: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isLoggedIn: boolean;
  tier: VipTier;
  loginAt: string;
  totalActivations: number;
  isTempMail?: boolean;
}

export interface AccountQuotaInfo {
  email: string;
  usageCount: number; // Max 5 for free tier
  maxLimit: number; // 5
  lockedUntil?: number; // timestamp ms when 2-day cooldown expires
  lastActivatedAt?: number; // timestamp ms
  history?: Array<{
    code: string;
    timestamp: number;
  }>;
}

export interface QuotaCheckResult {
  allowed: boolean;
  usageCount: number;
  maxLimit: number;
  remaining: number;
  isLocked: boolean;
  lockedUntil?: number;
  cooldownRemainingMs?: number;
  cooldownFormatted?: string;
  isVipBypass: boolean;
  reason?: string;
}

export interface ServerConnectionConfig {
  endpoint: string;
  autoConnect: boolean;
  timeoutMs: number;
  proxyMode: boolean;
  isConnected: boolean;
  latencyMs?: number;
  lastChecked?: string;
}

export interface BotHealth {
  status: 'online' | 'error' | 'checking';
  target: string;
  httpStatus?: number;
  latencyMs?: number;
  server?: string;
  cfRay?: string;
  timestamp?: string;
  error?: string;
}

export interface ActivationHistoryItem {
  id: string;
  email: string;
  code: string;
  date: string;
  rawResponse?: any;
}

export interface BatchQueueItem {
  id: string;
  email: string;
  status: 'idle' | 'sending' | 'waiting_link' | 'verifying' | 'success' | 'failed';
  magicLinkSentAt?: string;
  magicLinkUrl?: string;
  codeOrder?: string;
  error?: string;
  expiresAt?: number;
  inboxUrl?: string;
  sidToken?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'request';
  message: string;
  detail?: string;
}

export interface UrlInspectionResult {
  valid: boolean;
  extractedUrl?: string;
  hostname?: string;
  isAlightMotionApp?: boolean;
  oobCode?: string | null;
  apiKey?: string | null;
  mode?: string | null;
  continueUrl?: string | null;
  message?: string;
  error?: string;
}
