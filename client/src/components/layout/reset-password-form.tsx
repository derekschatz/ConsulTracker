import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface ResetPasswordFormProps {
  token: string;
}

const ResetPasswordForm = ({ token }: ResetPasswordFormProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [isResetComplete, setIsResetComplete] = useState(false);
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  // Validate the token on component mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await apiRequest("GET", `/api/reset-password/${token}`);
        setIsTokenValid(response.ok);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          toast({
            title: "Invalid Reset Link",
            description: errorData.message || "Your password reset link is invalid or has expired.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Token validation failed:", error);
        setIsTokenValid(false);
        toast({
          title: "Error",
          description: "Failed to validate your reset link. Please try again.",
          variant: "destructive",
        });
      }
    };

    validateToken();
  }, [token, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest("POST", `/api/reset-password/${token}`, { password });
      
      if (response.ok) {
        setIsResetComplete(true);
        toast({
          title: "Success",
          description: "Your password has been reset successfully. You can now log in with your new password.",
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "Error",
          description: errorData.message || "Failed to reset your password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Password reset failed:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isTokenValid === null) {
    return (
      <div className="text-center p-4">
        <p>Validating your reset link...</p>
      </div>
    );
  }

  if (isTokenValid === false) {
    return (
      <div className="space-y-4 text-center">
        <h3 className="text-lg font-medium text-red-600">Invalid Reset Link</h3>
        <p className="text-sm text-gray-500">
          Your password reset link is invalid or has expired.
          Please request a new password reset link.
        </p>
        <Button 
          className="w-full" 
          onClick={() => setLocation("/login?tab=forgot-password")}
        >
          Request New Reset Link
        </Button>
      </div>
    );
  }

  if (isResetComplete) {
    return (
      <div className="space-y-4 text-center">
        <h3 className="text-lg font-medium text-green-600">Password Reset Complete!</h3>
        <p className="text-sm text-gray-500">
          Your password has been reset successfully.
          You can now log in with your new password.
        </p>
        <Button 
          className="w-full" 
          onClick={() => setLocation("/login")}
        >
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your new password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-gray-500">
          Password must be at least 8 characters long.
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Confirm your new password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-primary-600 hover:bg-primary-700 text-white py-6"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Resetting Password..." : "Reset Password"}
      </Button>
    </form>
  );
};

export default ResetPasswordForm; 