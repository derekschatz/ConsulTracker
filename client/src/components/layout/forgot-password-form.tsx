import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const ForgotPasswordForm = () => {
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
        toast({
          title: "Success",
          description: "If an account with that email exists, you'll receive password reset instructions.",
        });
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
      <div className="space-y-4 text-center">
        <h3 className="text-lg font-medium">Check Your Email</h3>
        <p className="text-sm text-gray-500">
          If an account with that email exists, we've sent password reset instructions.
          Please check your email inbox and spam folder.
        </p>
        <Button 
          className="w-full" 
          variant="outline"
          onClick={() => setIsSubmitted(false)}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-primary-600 hover:bg-primary-700 text-white py-6"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Sending..." : "Send Reset Link"}
      </Button>
    </form>
  );
};

export default ForgotPasswordForm; 