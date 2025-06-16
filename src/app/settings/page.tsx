"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { AlertCircle, Plus, Trash2, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<{
    id: string;
    name: string;
    baseUrl?: string | null;
    model: string;
    apiKey: string;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    baseUrl: "",
    apiKey: "",
    model: "",
  });

  // Fetch providers
  const { data: providers, refetch: refetchProviders } = api.providers.list.useQuery();

  // Mutations
  const createProvider = api.providers.create.useMutation({
    onSuccess: () => {
      toast.success("Provider added successfully");
      setIsAddDialogOpen(false);
      setFormData({ name: "", baseUrl: "", apiKey: "", model: "" });
      void refetchProviders();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateProvider = api.providers.update.useMutation({
    onSuccess: () => {
      toast.success("Provider updated successfully");
      setIsEditDialogOpen(false);
      setSelectedProvider(null);
      void refetchProviders();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteProvider = api.providers.delete.useMutation({
    onSuccess: () => {
      toast.success("Provider deleted successfully");
      void refetchProviders();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleProvider = api.providers.update.useMutation({
    onSuccess: () => {
      toast.success("Provider status updated");
      void refetchProviders();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProvider) {
      updateProvider.mutate({
        id: selectedProvider.id,
        ...formData,
      });
    } else {
      createProvider.mutate(formData);
    }
  };

  // Handle edit
  const handleEdit = (provider: NonNullable<typeof providers>[0]) => {
    setSelectedProvider(provider);
    setFormData({
      name: provider.name,
      baseUrl: provider.baseUrl ?? "",
      apiKey: "", // Don't show the API key
      model: provider.model,
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-8 text-3xl font-bold">Settings</h1>

      {/* Custom Providers Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Custom AI Providers</CardTitle>
          <CardDescription>
            Add and manage your custom AI model providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-end">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Provider
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Custom Provider</DialogTitle>
                  <DialogDescription>
                    Add a new AI model provider with your API key
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Provider Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., My OpenAI"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="baseUrl">Base URL (Optional)</Label>
                    <Input
                      id="baseUrl"
                      value={formData.baseUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, baseUrl: e.target.value })
                      }
                      placeholder="e.g., https://api.openai.com/v1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) =>
                        setFormData({ ...formData, apiKey: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="model">Default Model</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) =>
                        setFormData({ ...formData, model: e.target.value })
                      }
                      placeholder="e.g., gpt-4"
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createProvider.isLoading}>
                      {createProvider.isLoading ? "Adding..." : "Add Provider"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {providers?.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No custom providers</AlertTitle>
              <AlertDescription>
                Add your first custom provider to start using it in conversations
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {providers?.map((provider) => (
                <Card key={provider.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{provider.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Model: {provider.model}
                      </p>
                      {provider.baseUrl && (
                        <p className="text-sm text-muted-foreground">
                          URL: {provider.baseUrl}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={provider.isActive}
                          onCheckedChange={(checked) =>
                            toggleProvider.mutate({
                              id: provider.id,
                              isActive: checked,
                            })
                          }
                        />
                        <Label>Active</Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(provider)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to delete this provider?",
                            )
                          ) {
                            deleteProvider.mutate({ id: provider.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Provider</DialogTitle>
            <DialogDescription>
              Update your custom AI model provider settings
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Provider Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-baseUrl">Base URL (Optional)</Label>
              <Input
                id="edit-baseUrl"
                value={formData.baseUrl}
                onChange={(e) =>
                  setFormData({ ...formData, baseUrl: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-apiKey">API Key (Leave blank to keep current)</Label>
              <Input
                id="edit-apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) =>
                  setFormData({ ...formData, apiKey: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-model">Default Model</Label>
              <Input
                id="edit-model"
                value={formData.model}
                onChange={(e) =>
                  setFormData({ ...formData, model: e.target.value })
                }
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedProvider(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateProvider.isLoading}>
                {updateProvider.isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 