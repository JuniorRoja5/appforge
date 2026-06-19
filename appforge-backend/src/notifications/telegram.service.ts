import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Reusable Telegram notification channel. Today wired only to new-user
 * registration alerts (auth.service); reusable for future operational
 * notifications (payment failures, APK build finished, etc.) by injecting
 * this service in their respective modules.
 *
 * Configuration via env vars (NOT in #6 fail-fast list — these are not
 * critical; missing config makes sendMessage a silent no-op so dev/local
 * environments without Telegram don't break):
 *   TELEGRAM_BOT_TOKEN   — bot token from @BotFather
 *   TELEGRAM_CHAT_ID     — chat id where alerts are sent
 *
 * Observability:
 *   - onModuleInit logs ONE warn at boot if either env var is missing,
 *     so the operator notices in production (vs silently never sending).
 *   - Each sendMessage logs ONE warn on network failure or non-OK response,
 *     never rethrows. The caller (e.g. auth.service.notifyNewRegistration)
 *     is fire-and-forget: a failed Telegram alert must not break the
 *     business flow it's observing (registration must succeed even if
 *     Telegram is down).
 */
@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private token: string | undefined;
  private chatId: string | undefined;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    this.chatId = this.config.get<string>('TELEGRAM_CHAT_ID');
    if (!this.token || !this.chatId) {
      this.logger.warn(
        'TelegramService not configured — sendMessage will be a no-op. ' +
          'Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env to enable notifications.',
      );
    }
  }

  /**
   * Sends a plain-text message to the configured chat. Always resolves to
   * void; never rethrows. Callers should NOT await unless they actually
   * need the timing (none do today — registration uses fire-and-forget
   * `void this.telegram.sendMessage(...)`).
   */
  async sendMessage(text: string): Promise<void> {
    if (!this.token || !this.chatId) return;
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: this.chatId, text }),
        },
      );
      if (!res.ok) {
        this.logger.warn(
          `Telegram sendMessage non-OK: HTTP ${res.status} ${res.statusText}`,
        );
      }
    } catch (err: any) {
      this.logger.warn(`Telegram sendMessage threw: ${err?.message ?? err}`);
    }
  }
}
