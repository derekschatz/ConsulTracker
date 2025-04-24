import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export type BusinessInfoValues = {
  companyName: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phoneNumber?: string;
  taxId?: string;
  companyLogo?: string | null;
};

// Default business info for new users
const defaultBusinessInfo: BusinessInfoValues = {
  companyName: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  phoneNumber: "",
  taxId: "",
};

export function useBusinessInfo() {
  const { user } = useAuth();
  
  return useQuery<BusinessInfoValues>({
    queryKey: ["/api/business-info"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/business-info");
        if (res.ok) {
          return await res.json();
        }
        return defaultBusinessInfo;
      } catch (error) {
        console.error("Error fetching business info:", error);
        return defaultBusinessInfo;
      }
    },
    enabled: !!user,
  });
} 