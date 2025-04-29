import React, { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest("POST", "/api/forgot-password", { email });
      
      if (response.ok) {
        setIsSubmitted(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "Error",
          description: errorData.message || "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Forgot password request failed:", error);
      toast({
        title: "Error",
        description: "Failed to submit request. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription>
            If an account with that email exists, we've sent password reset instructions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Please check your email inbox and follow the link in the email to reset your password.
            The link will expire in 1 hour.
          </p>
          <p className="text-sm text-muted-foreground">
            If you don't see the email, check your spam folder.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Return to Login</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Forgot Password</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to Login</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
} 