import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Mail, ArrowLeft } from 'lucide-react';

interface ApiResponse {
  error?: string;
  message?: string;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      const data: ApiResponse = await response.json();

      if (response.ok) {
        setIsEmailSent(true);
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (err) {
      setIsLoading(false);
      if (process.env.NODE_ENV === 'development') {
        console.error('Forgot password error:', err);
      }
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  if (isEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>
              We&apos;ve sent password reset instructions to {email}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>If an account with that email exists, you&apos;ll receive a password reset link within a few minutes.</p>
              <p>The link will expire in 1 hour for security reasons.</p>
              <p>Don&apos;t see the email? Check your spam folder.</p>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-3">
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
            
            <button
              onClick={() => {
                setIsEmailSent(false);
                setEmail('');
              }}
              className="text-sm text-primary hover:underline"
            >
              Try a different email address
            </button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isLoading}
                autoFocus
                className="w-full"
              />
            </div>
            
            {error && (
              <div className="text-destructive text-sm font-semibold text-center bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending Reset Link...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reset Link
                </>
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-3">
          <div className="text-sm text-muted-foreground text-center">
            Remember your password?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Back to Login
            </Link>
          </div>
          
          <div className="text-sm text-muted-foreground text-center">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 