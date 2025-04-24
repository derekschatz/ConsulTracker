import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Schema for business information
const businessInfoSchema = z.object({
  companyName: z.string().min(1, { message: "Company name is required" }),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phoneNumber: z.string().optional(),
  taxId: z.string().optional(),
  companyLogo: z.string().nullable().optional(),
});

type BusinessInfoValues = z.infer<typeof businessInfoSchema>;

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

const BusinessInfoTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Fetch business info
  const { data: businessInfo, isLoading } = useQuery<BusinessInfoValues>({
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

  const form = useForm<BusinessInfoValues>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: businessInfo || defaultBusinessInfo,
    mode: "onChange",
  });

  // Update form values when business info is loaded
  useEffect(() => {
    if (businessInfo) {
      console.log("Business info loaded/changed, resetting form:", businessInfo);
      
      // Make sure all required fields are present
      const formValues = {
        ...defaultBusinessInfo, // Start with defaults
        ...businessInfo, // Override with loaded values
        // Ensure required field is present and valid
        companyName: businessInfo.companyName || defaultBusinessInfo.companyName,
      };
      
      console.log("Resetting form with values:", formValues);
      
      // Reset the form with the current business info
      form.reset(formValues, {
        keepErrors: false, // Clear any existing errors
        keepDirty: false, // Mark fields as pristine
        keepValues: false, // Use the new values
        keepDefaultValues: false, // Update default values
      });
    }
  }, [businessInfo, form]);

  // Store original values to use when canceling
  const [originalValues, setOriginalValues] = useState<BusinessInfoValues | null>(null);
  
  // Update original values when business info is loaded
  useEffect(() => {
    if (businessInfo) {
      setOriginalValues(businessInfo);
    }
  }, [businessInfo]);

  const saveBusinessInfoMutation = useMutation({
    mutationFn: async (data: BusinessInfoValues) => {
      console.log("Submitting business info:", data);
      try {
        const res = await apiRequest("PUT", "/api/business-info", data);
        console.log("Business info save response:", res.status, res.statusText);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Business info save error:", errorText);
          throw new Error(errorText || "Failed to update business information");
        }
        
        const responseData = await res.json();
        console.log("Business info save success:", responseData);
        return responseData;
      } catch (error) {
        console.error("Business info save exception:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/business-info"], data);
      
      // If we have a logo file, upload it separately
      if (logoFile) {
        console.log("Logo file detected, triggering logo upload mutation");
        console.log("Logo file details:", {
          name: logoFile.name,
          type: logoFile.type,
          size: logoFile.size,
        });
        
        uploadLogoMutation.mutate(logoFile);
      } else {
        console.log("No logo file to upload");
        toast({
          title: "Success",
          description: "Business information updated successfully",
        });
        setIsEditing(false);
      }
    },
    onError: (error: Error) => {
      console.error("Business info mutation error:", error);
      toast({
        title: "Update failed",
        description: error.message || "An error occurred while saving business information",
        variant: "destructive",
      });
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log("Starting logo upload mutation with file:", file);
      
      // Create a new FormData instance
      const formData = new FormData();
      formData.append('logo', file);
      
      console.log("FormData created with logo file");
      
      try {
        console.log("Sending POST request to NEW /api/upload-logo endpoint");
        const res = await fetch('/api/upload-logo', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        console.log(`Response received: ${res.status} ${res.statusText}`);
        console.log(`Content-Type: ${res.headers.get('content-type')}`);
        
        // Check if response is JSON before attempting to parse
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          // If not JSON, read as text and throw error
          const text = await res.text();
          console.error("Non-JSON response:", text.substring(0, 150) + "...");
          throw new Error(`Server returned non-JSON response. Status: ${res.status}`);
        }
        
        const responseData = await res.json();
        
        if (!res.ok) {
          throw new Error(responseData.error || "Failed to upload logo");
        }
        
        console.log("Logo upload successful:", responseData);
        return responseData;
      } catch (error) {
        console.error("Logo upload exception:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Logo upload success callback with data:", data);
      
      // Update the business info in the query cache with the new logo
      const currentBusinessInfo = queryClient.getQueryData<BusinessInfoValues>(["/api/business-info"]);
      if (currentBusinessInfo && data.filename) {
        queryClient.setQueryData(["/api/business-info"], {
          ...currentBusinessInfo,
          companyLogo: data.filename
        });
      }
      
      // Also invalidate the business info query to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/business-info"] });
      
      toast({
        title: "Success",
        description: "Business information and logo updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      console.error("Logo upload error callback:", error);
      toast({
        title: "Logo upload failed",
        description: error.message,
        variant: "destructive",
      });
      // Business info was already saved, so exit edit mode
      setIsEditing(false);
    },
  });

  function onSubmit(data: BusinessInfoValues) {
    console.log("Form submitted with data:", data);
    
    // Add detailed validation logging
    console.log("Form validation state:", {
      isValid: form.formState.isValid,
      isDirty: form.formState.isDirty,
      errors: form.formState.errors,
      touchedFields: form.formState.touchedFields,
      dirtyFields: form.formState.dirtyFields
    });
    
    // Check what fields are causing validation issues
    if (Object.keys(form.formState.errors).length > 0) {
      Object.keys(form.formState.errors).forEach(fieldName => {
        // Type safe field name access
        const field = fieldName as keyof typeof form.formState.errors;
        console.error(`Validation error in field "${fieldName}":`, form.formState.errors[field]);
      });
      
      // Show toast for validation error
      toast({
        title: "Validation Error",
        description: "Please fix the highlighted issues in the form.",
        variant: "destructive",
      });
      return;
    }
    
    // Make a copy of the data to ensure we're sending a clean object
    const submissionData = {
      companyName: data.companyName,
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      zip: data.zip || "",
      phoneNumber: data.phoneNumber || "",
      taxId: data.taxId || ""
    };
    
    console.log("Clean submission data:", submissionData);
    saveBusinessInfoMutation.mutate(submissionData);
  }

  const handleEdit = () => {
    console.log("Edit button clicked: Entering edit mode");
    console.log("Current form values before edit:", form.getValues());
    
    // Ensure we're just toggling edit mode, not triggering any submissions
    // Store a snapshot of current values to revert to if canceled
    if (businessInfo) {
      setOriginalValues({...businessInfo});
      
      // Reset the form to ensure clean edit state
      form.reset(businessInfo, {
        keepValues: true,
        keepDirty: false,
        keepErrors: false,
        keepTouched: false
      });
    }
    
    // Only change the edit state flag
    setIsEditing(true);
  };

  const handleCancel = () => {
    console.log("Cancel clicked: Resetting form to original values");
    console.log("Original values:", originalValues || defaultBusinessInfo);
    
    // Force reset to original values
    form.reset(originalValues || defaultBusinessInfo);
    setLogoFile(null);
    setLogoPreview(null);
    setIsEditing(false);
    
    console.log("Form values after reset:", form.getValues());
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Logo file input change detected");
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log("Selected file:", {
        name: file.name,
        type: file.type,
        size: file.size,
      });
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.error("Invalid file type:", file.type);
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPEG, PNG, etc.)",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.error("File too large:", file.size);
        toast({
          title: "File too large",
          description: "Image must be smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      console.log("File validation passed, setting logo file");
      setLogoFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log("Preview created");
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      console.log("No file selected or file selection canceled");
    }
  };

  if (isLoading) {
    return <div>Loading business information...</div>;
  }

  const isPending = saveBusinessInfoMutation.isPending || uploadLogoMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Company Logo</h3>
          <p className="text-sm text-slate-500">
            Upload your company logo for invoices and documents. This will appear at the top of your invoices.
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="h-24 w-24 rounded-md border border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
            {logoPreview ? (
              <img 
                src={logoPreview} 
                alt="Company logo preview" 
                className="h-full w-full object-contain"
              />
            ) : businessInfo?.companyLogo ? (
              <img 
                src={`/api/business-logo/${businessInfo.companyLogo}`} 
                alt="Company logo" 
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="text-slate-400 text-xs text-center p-2">
                No logo uploaded
              </div>
            )}
          </div>
          
          {isEditing && (
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="max-w-xs"
              />
              <p className="text-xs text-slate-500 mt-1">
                Recommended: 200x200px, PNG or JPG format
              </p>
              {logoFile && (
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    console.log("Manual logo upload triggered");
                    if (logoFile) {
                      uploadLogoMutation.mutate(logoFile);
                    }
                  }}
                >
                  Upload Logo Only
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <Form {...form}>
        <form 
          onSubmit={(e) => {
            // Prevent automatic form submission
            // Only process submit via the Save button
            e.preventDefault();
            form.handleSubmit(onSubmit)(e);
          }} 
          className="space-y-4"
        >
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-1">Business Information</h3>
            <p className="text-sm text-slate-500">
              Your business information will appear on all invoices and documents.
            </p>
          </div>
          
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Your company name" 
                    {...field} 
                    disabled={!isEditing}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Street address" 
                    {...field} 
                    value={field.value || ''}
                    disabled={!isEditing}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="City" 
                      {...field} 
                      value={field.value || ''} 
                      disabled={!isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State/Province</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="State or province" 
                      {...field} 
                      value={field.value || ''} 
                      disabled={!isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="zip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal/ZIP Code</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Postal or ZIP code" 
                      {...field} 
                      value={field.value || ''} 
                      disabled={!isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Company phone number" 
                      {...field} 
                      value={field.value || ''} 
                      disabled={!isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="taxId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax ID / VAT Number</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Tax ID or VAT number" 
                    {...field} 
                    value={field.value || ''} 
                    disabled={!isEditing}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex space-x-2 pt-2">
            {isEditing ? (
              <>
                <Button 
                  type="button" 
                  disabled={isPending}
                  onClick={() => {
                    console.log("Save button clicked, manually submitting form");
                    form.handleSubmit(onSubmit)();
                  }}
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button 
                type="button" 
                onClick={handleEdit}
              >
                Edit Business Information
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export default BusinessInfoTab; 