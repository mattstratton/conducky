import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Check, X } from 'lucide-react';

interface PasswordStrength {
  score: number;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

interface ApiResponse {
  error?: string;
  message?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
    }
  });
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const router = useRouter();

  // Password strength calculation
  useEffect(() => {
    const { password } = formData;
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    };
    
    const score = Object.values(requirements).filter(Boolean).length;
    setPasswordStrength({ score, requirements });
  }, [formData.password]);

  // Email availability check (debounced)
  useEffect(() => {
    const { email } = formData;
    if (!email || !email.includes('@')) {
      setEmailAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/check-email?email=${encodeURIComponent(email)}`,
          { credentials: 'include' }
        );
        if (response.ok) {
          const data = await response.json();
          setEmailAvailable(data.available);
        }
      } catch (error) {
        console.error('Email check failed:', error);
      }
      setCheckingEmail(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.email]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field-specific errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    } else if (emailAvailable === false) {
      newErrors.email = 'This email address is already registered';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (passwordStrength.score < 5) {
      newErrors.password = 'Password must meet all requirements';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms acceptance
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms of service to register';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
          }),
        }
      );

      const data: ApiResponse = await response.json();

      if (response.ok) {
        // Registration successful - redirect to login with success message
        router.push('/login?message=Registration successful! Please log in to continue.');
      } else {
        // Handle server errors
        if (data.error) {
          if (data.error.includes('Email already registered')) {
            setErrors({ email: 'This email address is already registered' });
          } else {
            setErrors({ general: data.error });
          }
        } else {
          setErrors({ general: 'Registration failed. Please try again.' });
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score < 2) return 'bg-destructive';
    if (passwordStrength.score < 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength.score < 2) return 'Weak';
    if (passwordStrength.score < 4) return 'Medium';
    return 'Strong';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background transition-colors duration-200 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Create your account</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Join Conducky to manage code of conduct incidents
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* General Error */}
            {errors.general && (
              <div className="text-destructive text-sm font-semibold text-center bg-destructive/10 p-2 rounded">
                {errors.general}
              </div>
            )}

            {/* Full Name */}
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Full Name *
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Your full name"
                className={errors.name ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address *
              </label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="you@example.com"
                  className={errors.email ? 'border-destructive' : ''}
                  disabled={isLoading}
                />
                {checkingEmail && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className="animate-spin h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full" />
                  </div>
                )}
                {!checkingEmail && emailAvailable === true && formData.email && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                )}
                {!checkingEmail && emailAvailable === false && formData.email && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <X className="h-4 w-4 text-destructive" />
                  </div>
                )}
              </div>
              {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password *
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="••••••••"
                  className={errors.password ? 'border-destructive' : ''}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {getPasswordStrengthText()}
                    </span>
                  </div>

                  {/* Password Requirements */}
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <div className={`flex items-center gap-1 ${passwordStrength.requirements.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {passwordStrength.requirements.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      At least 8 characters
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordStrength.requirements.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        Uppercase letter
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.lowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordStrength.requirements.lowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        Lowercase letter
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.number ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordStrength.requirements.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        Number
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.special ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordStrength.requirements.special ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        Special character
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="grid gap-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirm Password *
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  className={errors.confirmPassword ? 'border-destructive' : ''}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-destructive text-xs">{errors.confirmPassword}</p>}
            </div>

            {/* Terms of Service */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="acceptTerms"
                checked={formData.acceptTerms}
                onCheckedChange={(checked) => handleInputChange('acceptTerms', !!checked)}
                disabled={isLoading}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="acceptTerms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I accept the terms of service *
                </label>
                <p className="text-xs text-muted-foreground">
                  By creating an account, you agree to our terms of service and privacy policy.
                </p>
                {errors.acceptTerms && <p className="text-destructive text-xs">{errors.acceptTerms}</p>}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || checkingEmail || emailAvailable === false}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Creating account...
                </div>
              ) : (
                'Create account'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 items-center">
          <span className="text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </span>
        </CardFooter>
      </Card>
    </div>
  );
} 