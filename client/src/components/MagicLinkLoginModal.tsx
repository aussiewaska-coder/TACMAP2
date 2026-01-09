import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";

interface MagicLinkLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MagicLinkLoginModal({ open, onOpenChange }: MagicLinkLoginModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send magic link');
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      // Reset state when closing
      setTimeout(() => {
        setSent(false);
        setEmail('');
        setError('');
      }, 300); // Wait for animation
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Sign in to TACMAP2
          </DialogTitle>
          <DialogDescription>
            {sent
              ? 'Check your email for a magic link to sign in.'
              : 'Enter your email address and we\'ll send you a magic link to sign in.'}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="rounded-full bg-green-500/10 p-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-medium">Magic link sent!</p>
              <p className="text-sm text-muted-foreground">
                We've sent a magic link to <strong>{email}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                The link will expire in 15 minutes.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
              className="w-full"
            >
              Send another link
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={loading}
                className="w-full"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !email}
              className="w-full"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send magic link
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              We'll email you a secure link that will sign you in instantly.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
