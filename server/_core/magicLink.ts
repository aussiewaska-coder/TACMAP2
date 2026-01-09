import { Resend } from 'resend';
import { customAlphabet } from 'nanoid';
import { getDb } from '../db.js';
import { magicLinkTokens, users } from '../../drizzle/schema.js';
import { eq, and, gt, isNull, lt } from 'drizzle-orm';

const resend = new Resend(process.env.RESEND_API_KEY);
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 32);

const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const FROM_EMAIL = process.env.MAGIC_LINK_FROM_EMAIL || 'noreply@tacmap.com.au';

export interface MagicLinkService {
  sendMagicLink(email: string, redirectUrl?: string): Promise<{ success: boolean; error?: string }>;
  verifyToken(token: string): Promise<{ email: string; isNewUser: boolean } | null>;
}

export class MagicLinkAuthService implements MagicLinkService {
  /**
   * Generate and send a magic link to the user's email
   */
  async sendMagicLink(email: string, redirectUrl: string = '/'): Promise<{ success: boolean; error?: string }> {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email address' };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Generate secure token
    const token = nanoid();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MS);

    try {
      // Store token in database
      const dbInstance = await getDb();
      if (!dbInstance) throw new Error("Database not available");

      await dbInstance.insert(magicLinkTokens).values({
        email: normalizedEmail,
        token,
        expiresAt,
      });

      // Construct magic link URL
      const magicLinkUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/verify?token=${token}&redirect=${encodeURIComponent(redirectUrl)}`;

      // Send email via Resend
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: normalizedEmail,
        subject: 'Sign in to TACMAP2',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Sign in to TACMAP2</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f4f4f4; border-radius: 8px; padding: 30px; margin: 20px 0;">
                <h1 style="color: #2c3e50; margin-top: 0;">Sign in to TACMAP2</h1>
                <p style="font-size: 16px; color: #555;">Click the button below to sign in to your TACMAP2 account. This link will expire in 15 minutes.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${magicLinkUrl}"
                     style="background-color: #3498db; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600;">
                    Sign In to TACMAP2
                  </a>
                </div>
                <p style="font-size: 14px; color: #777; margin-top: 30px;">
                  If you didn't request this email, you can safely ignore it.
                </p>
                <p style="font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
                  This is an automated message from TACMAP2. Please do not reply to this email.
                </p>
              </div>
            </body>
          </html>
        `,
        text: `Sign in to TACMAP2\n\nClick the link below to sign in:\n${magicLinkUrl}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this email, you can safely ignore it.`,
      });

      if (error) {
        console.error('[MagicLink] Failed to send email:', error);
        return { success: false, error: 'Failed to send email' };
      }

      return { success: true };
    } catch (error) {
      console.error('[MagicLink] Error creating magic link:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Verify a magic link token and mark it as used
   */
  async verifyToken(token: string): Promise<{ email: string; isNewUser: boolean } | null> {
    if (!token) {
      return null;
    }

    try {
      const dbInstance = await getDb();
      if (!dbInstance) throw new Error("Database not available");

      // Find valid token (not used, not expired)
      const [tokenRecord] = await dbInstance
        .select()
        .from(magicLinkTokens)
        .where(
          and(
            eq(magicLinkTokens.token, token),
            gt(magicLinkTokens.expiresAt, new Date()),
            isNull(magicLinkTokens.usedAt)  // FIXED: Use isNull() instead of eq(..., null)
          )
        )
        .limit(1);

      if (!tokenRecord) {
        return null;
      }

      // Mark token as used
      await dbInstance
        .update(magicLinkTokens)
        .set({ usedAt: new Date() })
        .where(eq(magicLinkTokens.token, token));

      // Check if user exists
      const [existingUser] = await dbInstance
        .select()
        .from(users)
        .where(eq(users.email, tokenRecord.email))
        .limit(1);

      return {
        email: tokenRecord.email,
        isNewUser: !existingUser,
      };
    } catch (error) {
      console.error('[MagicLink] Error verifying token:', error);
      return null;
    }
  }

  /**
   * Clean up expired tokens (call periodically)
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const dbInstance = await getDb();
      if (!dbInstance) {
        console.warn('[MagicLink] Database not available for cleanup');
        return;
      }

      // FIXED: Delete tokens where expiresAt < now (tokens that have expired)
      await dbInstance
        .delete(magicLinkTokens)
        .where(lt(magicLinkTokens.expiresAt, new Date()));
    } catch (error) {
      console.error('[MagicLink] Error cleaning up expired tokens:', error);
    }
  }
}

export const magicLinkService = new MagicLinkAuthService();
