import { useAuth } from "../../hooks/use-auth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useState } from "react";
import { Link } from "wouter";

const LoginForm = () => {
  const { loginMutation } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(formData);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            placeholder="Enter your username"
            required
            value={formData.username}
            onChange={handleChange}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link 
              href="/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-500 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            required
            value={formData.password}
            onChange={handleChange}
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-6"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? "Logging in..." : "Login"}
        </Button>
        
        {loginMutation.isError && (
          <p className="text-sm text-red-600">
            {(loginMutation.error as Error)?.message || "Invalid username or password."}
          </p>
        )}
      </form>
    </div>
  );
};

export default LoginForm; 