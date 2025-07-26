import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  ArrowLeft,
  Plus,
  Save,
  Users,
  Settings,
  Globe,
  Lock,
  Shield,
  Hash,
} from 'lucide-react';

const spaceSchema = z.object({
  name: z.string().min(1, 'Space name is required').max(50, 'Name too long'),
  description: z.string().optional(),
  type: z.enum(['public', 'private', 'restricted']),
  category: z.string().min(1, 'Category is required'),
  isActive: z.boolean().default(true),
  allowGuests: z.boolean().default(false),
  requireApproval: z.boolean().default(false),
  tags: z.string().optional(),
});

type SpaceFormData = z.infer<typeof spaceSchema>;

const spaceCategories = [
  'Teams',
  'Projects', 
  'Interests',
  'Departments',
  'Locations',
  'Learning',
  'Social',
  'Other',
];

const spaceTypes = [
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone in the organization can join and see content',
    icon: Globe,
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Only invited members can join and see content',
    icon: Lock,
  },
  {
    value: 'restricted',
    label: 'Restricted',
    description: 'Requires admin approval to join',
    icon: Shield,
  },
];

export default function SpaceManagement() {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SpaceFormData>({
    resolver: zodResolver(spaceSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'public',
      category: '',
      isActive: true,
      allowGuests: false,
      requireApproval: false,
      tags: '',
    },
  });

  const createSpaceMutation = useMutation({
    mutationFn: async (data: SpaceFormData) => {
      const spaceData = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()) : [],
      };
      return await apiRequest('/api/channels', {
        method: 'POST',
        body: JSON.stringify(spaceData),
      });
    },
    onSuccess: (newSpace) => {
      toast({
        title: 'Success',
        description: `Space "${newSpace.name}" created successfully`,
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create space',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: SpaceFormData) => {
    setIsCreating(true);
    createSpaceMutation.mutate(data);
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = spaceTypes.find(t => t.value === type);
    return typeConfig?.icon || Globe;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'public': return 'bg-green-100 text-green-800';
      case 'private': return 'bg-blue-100 text-blue-800';
      case 'restricted': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/workspaces/space-directory">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Directory
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Create New Space</h1>
            <p className="text-muted-foreground">
              Set up a new space for collaboration and community
            </p>
          </div>
        </div>
      </div>

      {/* Space Creation Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Space Details
              </CardTitle>
              <CardDescription>
                Provide basic information about your new space
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Space Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter space name" {...field} />
                          </FormControl>
                          <FormDescription>
                            Choose a clear, descriptive name
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {spaceCategories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Helps organize and discover spaces
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the purpose and goals of this space..."
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Help members understand what this space is about
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="javascript, frontend, development"
                              className="pl-10"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Comma-separated tags for better discoverability
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Space Type Selection */}
                  <div className="space-y-4">
                    <FormLabel>Space Type *</FormLabel>
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {spaceTypes.map((type) => {
                                const IconComponent = type.icon;
                                const isSelected = field.value === type.value;
                                return (
                                  <Card 
                                    key={type.value}
                                    className={`cursor-pointer transition-all ${
                                      isSelected 
                                        ? 'ring-2 ring-primary bg-primary/5' 
                                        : 'hover:shadow-md'
                                    }`}
                                    onClick={() => field.onChange(type.value)}
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex items-center gap-3 mb-2">
                                        <IconComponent className="h-5 w-5 text-primary" />
                                        <span className="font-medium">{type.label}</span>
                                        {isSelected && (
                                          <Badge className="ml-auto">Selected</Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {type.description}
                                      </p>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Advanced Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Advanced Settings</h3>
                    
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Active Space</FormLabel>
                            <FormDescription>
                              Allow members to join and post content
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="requireApproval"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Require Approval</FormLabel>
                            <FormDescription>
                              New members need admin approval to join
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="allowGuests"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Allow Guests</FormLabel>
                            <FormDescription>
                              Enable guest access for external collaborators
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="submit"
                      disabled={createSpaceMutation.isPending}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {createSpaceMutation.isPending ? 'Creating Space...' : 'Create Space'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.reset()}
                    >
                      Reset Form
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Space Preview</CardTitle>
              <CardDescription>
                How your space will appear to members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">
                  {form.watch('name') || 'Space Name'}
                </h3>
                <Badge className={getTypeColor(form.watch('type'))}>
                  {form.watch('type')}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {form.watch('description') || 'No description provided'}
                </p>
                <div className="text-sm">
                  <span className="font-medium">Category:</span> {form.watch('category') || 'Not selected'}
                </div>
                {form.watch('tags') && (
                  <div className="flex flex-wrap gap-1">
                    {form.watch('tags').split(',').map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        #{tag.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Space Settings Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Active</span>
                <Badge variant={form.watch('isActive') ? 'default' : 'secondary'}>
                  {form.watch('isActive') ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Requires Approval</span>
                <Badge variant={form.watch('requireApproval') ? 'default' : 'secondary'}>
                  {form.watch('requireApproval') ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Guest Access</span>
                <Badge variant={form.watch('allowGuests') ? 'default' : 'secondary'}>
                  {form.watch('allowGuests') ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tips for Success</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Choose a clear, memorable name</li>
                <li>• Write a descriptive purpose statement</li>
                <li>• Use relevant tags for discoverability</li>
                <li>• Select appropriate privacy settings</li>
                <li>• Consider your target audience</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}