import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { BrandingConfig } from './types';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check, Upload, RefreshCw } from 'lucide-react';

const brandingSchema = z.object({
  organizationName: z.string().min(2, {
    message: 'Organization name must be at least 2 characters.',
  }),
  colorScheme: z.string(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  logoUrl: z.string().optional(),
});

type BrandingFormValues = z.infer<typeof brandingSchema>;

// Color scheme presets
const colorSchemes = [
  {
    id: 'default',
    name: 'ThrivioHR Default',
    primaryColor: '#00A389',
    secondaryColor: '#232E3E',
    accentColor: '#FFA500',
    preview: 'bg-gradient-to-r from-[#00A389] to-[#232E3E]',
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    primaryColor: '#1E88E5',
    secondaryColor: '#0D47A1',
    accentColor: '#4FC3F7',
    preview: 'bg-gradient-to-r from-[#1E88E5] to-[#0D47A1]',
  },
  {
    id: 'forest',
    name: 'Forest Green',
    primaryColor: '#388E3C',
    secondaryColor: '#1B5E20',
    accentColor: '#81C784',
    preview: 'bg-gradient-to-r from-[#388E3C] to-[#1B5E20]',
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    primaryColor: '#E64A19',
    secondaryColor: '#BF360C',
    accentColor: '#FFAB91',
    preview: 'bg-gradient-to-r from-[#E64A19] to-[#BF360C]',
  },
  {
    id: 'lavender',
    name: 'Lavender Purple',
    primaryColor: '#7B1FA2',
    secondaryColor: '#4A148C',
    accentColor: '#CE93D8',
    preview: 'bg-gradient-to-r from-[#7B1FA2] to-[#4A148C]',
  },
  {
    id: 'custom',
    name: 'Custom Colors',
    primaryColor: '',
    secondaryColor: '',
    accentColor: '',
    preview: 'bg-gradient-to-r from-gray-300 to-gray-400',
  },
];

const BrandingPage = () => {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current branding
  const { data: branding, isLoading } = useQuery<BrandingConfig>({
    queryKey: ['/api/hr/branding'],
    staleTime: 60000, // 1 minute
  });

  // Form setup
  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      organizationName: '',
      colorScheme: 'default',
      primaryColor: '',
      secondaryColor: '',
      accentColor: '',
      logoUrl: '',
    },
  });

  // Update form with data when available
  useEffect(() => {
    if (branding) {
      // Find which color scheme matches the current colors
      const currentScheme = colorSchemes.find(
        (scheme) =>
          scheme.primaryColor === branding.primaryColor &&
          scheme.secondaryColor === branding.secondaryColor &&
          scheme.accentColor === branding.accentColor
      );

      form.reset({
        organizationName: branding.organizationName || 'ThrivioHR',
        colorScheme: currentScheme?.id || 'custom',
        primaryColor: branding.primaryColor || '#00A389',
        secondaryColor: branding.secondaryColor || '#232E3E',
        accentColor: branding.accentColor || '#FFA500',
        logoUrl: branding.logoUrl || '',
      });

      if (branding.logoUrl) {
        setLogoPreview(branding.logoUrl);
      }
    }
  }, [branding, form]);

  // Handle color scheme change
  const handleColorSchemeChange = (schemeId: string) => {
    const scheme = colorSchemes.find((s) => s.id === schemeId);
    if (scheme && scheme.id !== 'custom') {
      form.setValue('primaryColor', scheme.primaryColor);
      form.setValue('secondaryColor', scheme.secondaryColor);
      form.setValue('accentColor', scheme.accentColor);
    }
  };

  // Handle logo file change
  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && !logoUploadMutation.isPending) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setLogoFile(file);

      // Clear the input value to prevent double triggers
      event.target.value = '';

      // Automatically upload the file immediately after selection
      logoUploadMutation.mutate();
    }
  };

  // Logo upload mutation
  const logoUploadMutation = useMutation<any, Error, void>({
    mutationFn: async () => {
      if (!logoFile) return null;

      // Convert the uploaded file to base64
      return new Promise<any>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(logoFile);
        reader.onload = async () => {
          try {
            const logoUrl = reader.result as string;

            // Send the base64 data instead of FormData
            const res = await apiRequest('POST', '/api/hr/branding/logo', {
              logoUrl,
            });

            if (!res.ok) {
              throw new Error('Failed to upload logo');
            }

            return resolve(await res.json());
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => {
          reject(new Error('Failed to read logo file'));
        };
      });
    },
    onSuccess: (data: any) => {
      if (data && data.logoUrl) {
        form.setValue('logoUrl', data.logoUrl);
        toast({
          title: 'Logo uploaded',
          description: 'Your logo has been successfully uploaded.',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Save branding mutation
  const brandingMutation = useMutation({
    mutationFn: async (data: BrandingFormValues) => {
      const res = await apiRequest('POST', '/api/hr/branding', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/branding'] });
      toast({
        title: 'Branding updated',
        description: 'Your branding settings have been saved.',
      });

      // Force refresh to ensure theme is applied fully
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: 'Save failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const onSubmit = async (data: BrandingFormValues) => {
    // If there's a new logo file, upload it first
    if (logoFile) {
      await logoUploadMutation.mutateAsync();
    }

    // Then save the branding data
    brandingMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">
          Brand Identity
        </h1>

        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="branding">Branding Settings</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="branding">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Organization Information</CardTitle>
                    <CardDescription>
                      Set your organization name and logo as they will appear
                      throughout the platform.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="organizationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            This name will be displayed in the header and
                            various places across the platform.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <Label htmlFor="logo">Organization Logo</Label>
                      <div className="mt-2">
                        <div className="flex items-center gap-4">
                          <div className="bg-gray-100 border rounded-lg h-20 w-20 flex items-center justify-center overflow-hidden">
                            {logoPreview ? (
                              <img
                                src={logoPreview}
                                alt="Logo Preview"
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <div className="text-gray-400 text-xs text-center p-2">
                                No logo uploaded
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <label className="relative">
                                <Button
                                  type="button"
                                  variant="outline"
                                  asChild
                                  disabled={logoUploadMutation.isPending}
                                >
                                  <span className="cursor-pointer">
                                    {logoUploadMutation.isPending ? (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Uploading...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Select & Upload Logo
                                      </>
                                    )}
                                  </span>
                                </Button>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  onChange={handleLogoChange}
                                  disabled={logoUploadMutation.isPending}
                                />
                              </label>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              Recommended size: 200x200px. PNG or SVG with
                              transparent background.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Color Theme</CardTitle>
                    <CardDescription>
                      Choose a color scheme or customize your brand colors.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="colorScheme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color Scheme</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => {
                                field.onChange(value);
                                handleColorSchemeChange(value);
                              }}
                              value={field.value}
                              className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                            >
                              {colorSchemes.map((scheme) => (
                                <div key={scheme.id} className="relative">
                                  <RadioGroupItem
                                    value={scheme.id}
                                    id={`color-scheme-${scheme.id}`}
                                    className="sr-only"
                                  />
                                  <Label
                                    htmlFor={`color-scheme-${scheme.id}`}
                                    className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:border-primary cursor-pointer ${
                                      field.value === scheme.id
                                        ? 'border-primary'
                                        : ''
                                    }`}
                                  >
                                    <div
                                      className={`h-12 w-full rounded-md mb-2 ${scheme.preview}`}
                                    ></div>
                                    <span className="text-sm font-medium">
                                      {scheme.name}
                                    </span>
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Always show color customization below schemes */}
                    <div className="space-y-4 border rounded-md p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-700">
                          Customize Colors
                        </h3>
                        <p className="text-xs text-gray-500">
                          Click color boxes to open palette
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <FormField
                          control={form.control}
                          name="primaryColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Primary Color</FormLabel>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={field.value || '#1976D2'}
                                    onChange={(e) => {
                                      field.onChange(e.target.value);
                                      form.setValue('colorScheme', 'custom');
                                    }}
                                    className="w-12 h-10 rounded border cursor-pointer bg-white"
                                    title="Click to open color picker"
                                  />
                                  <FormControl>
                                    <Input
                                      type="text"
                                      {...field}
                                      placeholder="#1976D2"
                                      className="flex-1"
                                      onChange={(e) => {
                                        field.onChange(e.target.value);
                                        form.setValue('colorScheme', 'custom');
                                      }}
                                    />
                                  </FormControl>
                                </div>
                                <div
                                  className="w-full h-6 rounded border shadow-sm"
                                  style={{
                                    backgroundColor: field.value || '#1976D2',
                                  }}
                                  title={`Preview: ${field.value || '#1976D2'}`}
                                ></div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="secondaryColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Secondary Color</FormLabel>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={field.value || '#0D47A1'}
                                    onChange={(e) => {
                                      field.onChange(e.target.value);
                                      form.setValue('colorScheme', 'custom');
                                    }}
                                    className="w-12 h-10 rounded border cursor-pointer bg-white"
                                    title="Click to open color picker"
                                  />
                                  <FormControl>
                                    <Input
                                      type="text"
                                      {...field}
                                      placeholder="#0D47A1"
                                      className="flex-1"
                                      onChange={(e) => {
                                        field.onChange(e.target.value);
                                        form.setValue('colorScheme', 'custom');
                                      }}
                                    />
                                  </FormControl>
                                </div>
                                <div
                                  className="w-full h-6 rounded border shadow-sm"
                                  style={{
                                    backgroundColor: field.value || '#0D47A1',
                                  }}
                                  title={`Preview: ${field.value || '#0D47A1'}`}
                                ></div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="accentColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Accent Color</FormLabel>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={field.value || '#90CAF9'}
                                    onChange={(e) => {
                                      field.onChange(e.target.value);
                                      form.setValue('colorScheme', 'custom');
                                    }}
                                    className="w-12 h-10 rounded border cursor-pointer bg-white"
                                    title="Click to open color picker"
                                  />
                                  <FormControl>
                                    <Input
                                      type="text"
                                      {...field}
                                      placeholder="#90CAF9"
                                      className="flex-1"
                                      onChange={(e) => {
                                        field.onChange(e.target.value);
                                        form.setValue('colorScheme', 'custom');
                                      }}
                                    />
                                  </FormControl>
                                </div>
                                <div
                                  className="w-full h-6 rounded border shadow-sm"
                                  style={{
                                    backgroundColor: field.value || '#90CAF9',
                                  }}
                                  title={`Preview: ${field.value || '#90CAF9'}`}
                                ></div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Inline Color Preview */}
                    <div className="space-y-4 border rounded-md p-4 bg-white">
                      <h3 className="text-sm font-medium text-gray-700">
                        Color Preview
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Navigation Preview */}
                        <div className="border rounded-md overflow-hidden">
                          <div
                            className="p-3 flex items-center justify-between text-white text-sm"
                            style={{
                              backgroundColor:
                                form.watch('primaryColor') || '#1976D2',
                            }}
                          >
                            <span className="font-medium">
                              {form.watch('organizationName') || 'Organization'}
                            </span>
                            <div className="w-5 h-5 bg-white/20 rounded"></div>
                          </div>
                        </div>

                        {/* Button Preview */}
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-2 rounded text-white text-xs font-medium flex-1"
                            style={{
                              backgroundColor:
                                form.watch('primaryColor') || '#1976D2',
                            }}
                          >
                            Primary
                          </button>
                          <button
                            className="px-3 py-2 rounded text-gray-800 text-xs font-medium flex-1"
                            style={{
                              backgroundColor:
                                form.watch('accentColor') || '#90CAF9',
                            }}
                          >
                            Accent
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={brandingMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {brandingMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Branding Settings'
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>
                  See how your branding will appear across the platform.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="rounded-lg border overflow-hidden">
                    <div
                      className="bg-white p-4 border-b flex items-center justify-between"
                      style={{
                        backgroundColor:
                          form.watch('primaryColor') || '#00A389',
                        color: 'white',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Logo"
                            className="h-8 w-8 object-contain"
                          />
                        ) : (
                          <div className="bg-white text-black h-8 w-8 rounded-full flex items-center justify-center font-bold">
                            T
                          </div>
                        )}
                        <span className="font-bold">
                          {form.watch('organizationName') || 'ThrivioHR'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            backgroundColor:
                              form.watch('accentColor') || '#FFA500',
                            color: 'white',
                          }}
                        >
                          1,250 Points
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
                          U
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50">
                      <div className="flex space-x-3 mb-4">
                        <div className="w-32 rounded bg-gray-200 h-10"></div>
                        <div className="w-32 rounded bg-gray-200 h-10"></div>
                        <div
                          className="w-32 rounded"
                          style={{
                            backgroundColor:
                              form.watch('secondaryColor') || '#232E3E',
                            height: '2.5rem',
                          }}
                        ></div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-full h-32 rounded bg-white border p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                            <div>
                              <div className="h-4 w-24 bg-gray-200 rounded"></div>
                              <div className="h-3 w-16 bg-gray-200 rounded mt-1"></div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="h-3 w-full bg-gray-100 rounded"></div>
                            <div className="h-3 w-4/5 bg-gray-100 rounded"></div>
                          </div>
                        </div>
                        <div className="w-full h-32 rounded bg-white border p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                            <div>
                              <div className="h-4 w-24 bg-gray-200 rounded"></div>
                              <div className="h-3 w-16 bg-gray-200 rounded mt-1"></div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="h-3 w-full bg-gray-100 rounded"></div>
                            <div className="h-3 w-4/5 bg-gray-100 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-2">
                      Button Styles Preview
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="default"
                        style={{
                          backgroundColor:
                            form.watch('primaryColor') || '#00A389',
                        }}
                      >
                        Primary Button
                      </Button>
                      <Button
                        variant="secondary"
                        style={{
                          backgroundColor:
                            form.watch('secondaryColor') || '#232E3E',
                        }}
                      >
                        Secondary Button
                      </Button>
                      <Button
                        variant="outline"
                        style={{
                          borderColor: form.watch('primaryColor') || '#00A389',
                          color: form.watch('primaryColor') || '#00A389',
                        }}
                      >
                        Outline Button
                      </Button>
                      <Button
                        variant="ghost"
                        style={{
                          color: form.watch('primaryColor') || '#00A389',
                        }}
                      >
                        Ghost Button
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BrandingPage;
