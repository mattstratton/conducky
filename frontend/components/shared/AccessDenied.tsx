import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, LogIn } from "lucide-react";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showLoginButton?: boolean;
  loginRedirectPath?: string;
  showBackButton?: boolean;
}

export function AccessDenied({
  title = "Access Denied",
  message = "You do not have permission to access this page.",
  showLoginButton = true,
  loginRedirectPath,
  showBackButton = true,
}: AccessDeniedProps) {
  const router = useRouter();
  
  // Auto-detect the current path for login redirect if not provided
  const redirectPath = loginRedirectPath || router.asPath;
  const loginUrl = `/login?next=${encodeURIComponent(redirectPath)}`;

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <ShieldAlert className="h-16 w-16 text-red-500" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <p className="text-muted-foreground">{message}</p>
          </div>
          
          <div className="space-y-3">
            {showLoginButton && (
              <Button asChild className="w-full">
                <Link href={loginUrl}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In to Continue
                </Link>
              </Button>
            )}
            
            {showBackButton && (
              <Button 
                variant="outline" 
                onClick={() => router.back()} 
                className="w-full"
              >
                Go Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 