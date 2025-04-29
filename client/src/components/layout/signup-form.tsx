import { useState } from "react";
import { useAuth } from "../../hooks/use-auth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { useToast } from "../ui/use-toast";

const SignupForm = () => {
  const { registerMutation } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    acceptTerms: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      acceptTerms: checked,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.acceptTerms) {
      toast({
        title: "Terms & Conditions",
        description: "Please accept the terms and conditions to continue.",
        variant: "destructive",
      });
      return;
    }
    
    registerMutation.mutate({
      username: formData.username,
      password: formData.password,
      name: formData.name,
      email: formData.email,
    });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            placeholder="johnsmith"
            required
            value={formData.username}
            onChange={handleChange}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="name">Full Name (Optional)</Label>
          <Input
            id="name"
            name="name"
            placeholder="John Smith"
            value={formData.name}
            onChange={handleChange}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email (Optional)</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="john.smith@example.com"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            minLength={6}
            value={formData.password}
            onChange={handleChange}
          />
          <p className="text-xs text-gray-500">
            Password must be at least 6 characters long
          </p>
        </div>
        
        <div className="flex items-start space-x-2">
          <Checkbox 
            id="acceptTerms" 
            checked={formData.acceptTerms}
            onCheckedChange={handleCheckboxChange}
          />
          <Label 
            htmlFor="acceptTerms" 
            className="text-sm font-normal leading-tight cursor-pointer"
          >
            I agree to the{" "}
            <a href="#" className="text-primary-600 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-primary-600 hover:underline">
              Privacy Policy
            </a>
          </Label>
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-6"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? "Creating account..." : "Create account"}
        </Button>
        
        {registerMutation.isError && (
          <p className="text-sm text-red-600">
            {(registerMutation.error as Error)?.message || "An error occurred during registration."}
          </p>
        )}
      </form>
    </div>
  );
};

export default SignupForm; 