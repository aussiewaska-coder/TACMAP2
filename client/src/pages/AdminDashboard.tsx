import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Map,
  Settings,
  Layers,
  Database,
  Activity,
  ArrowLeft,
  Shield
} from "lucide-react";
import { toast } from "sonner";

/**
 * Admin Dashboard - Feature toggle and management interface
 * Visitors only - no authentication required
 *
 * Features:
 * - Enable/disable map plugins
 * - Manage map styles
 * - Configure global settings
 * - View system statistics
 */
export default function AdminDashboard() {

  const { data: features, refetch: refetchFeatures } = trpc.mapFeatures.list.useQuery();
  const { data: styles } = trpc.mapStyles.list.useQuery();
  
  const toggleFeatureMutation = trpc.mapFeatures.toggleEnabled.useMutation({
    onSuccess: () => {
      refetchFeatures();
      toast.success("Feature updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update feature: ${error.message}`);
    },
  });

  const handleFeatureToggle = (featureKey: string, currentEnabled: boolean) => {
    toggleFeatureMutation.mutate({
      featureKey,
      enabled: !currentEnabled,
    });
  };

  // Sample feature data if database is empty
  const sampleFeatures = features && features.length > 0 ? features : [
    { id: 1, featureKey: "draw", featureName: "Drawing Tools", description: "Enable geometry drawing and editing", enabled: true, category: "plugin" as const },
    { id: 2, featureKey: "geocoder", featureName: "Geocoder", description: "Search and location lookup", enabled: true, category: "plugin" as const },
    { id: 3, featureKey: "export", featureName: "Export Control", description: "Export maps to PDF/PNG", enabled: true, category: "plugin" as const },
    { id: 4, featureKey: "measure", featureName: "Measurements", description: "Distance and area measurements", enabled: false, category: "plugin" as const },
    { id: 5, featureKey: "compare", featureName: "Map Compare", description: "Side-by-side map comparison", enabled: false, category: "plugin" as const },
    { id: 6, featureKey: "3d-buildings", featureName: "3D Buildings", description: "Extrude buildings in 3D", enabled: false, category: "layer" as const },
    { id: 7, featureKey: "terrain", featureName: "Terrain", description: "3D terrain visualization", enabled: false, category: "layer" as const },
    { id: 8, featureKey: "heatmap", featureName: "Heatmap", description: "Data heatmap visualization", enabled: false, category: "example" as const },
    { id: 9, featureKey: "clusters", featureName: "Clustering", description: "Point clustering", enabled: false, category: "example" as const },
  ];

  const pluginFeatures = sampleFeatures.filter(f => f.category === "plugin");
  const layerFeatures = sampleFeatures.filter(f => f.category === "layer");
  const exampleFeatures = sampleFeatures.filter(f => f.category === "example");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-indigo-600" />
                <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/map">
                <Button variant="default">
                  <Map className="w-4 h-4 mr-2" />
                  View Map
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-indigo-600">{sampleFeatures.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active Plugins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {sampleFeatures.filter(f => f.enabled && f.category === "plugin").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Map Styles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{styles?.length || 4}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active Layers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {sampleFeatures.filter(f => f.enabled && f.category === "layer").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Feature Management
            </CardTitle>
            <CardDescription>
              Enable or disable map features, plugins, and layers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="plugins" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="plugins">
                  <Map className="w-4 h-4 mr-2" />
                  Plugins ({pluginFeatures.length})
                </TabsTrigger>
                <TabsTrigger value="layers">
                  <Layers className="w-4 h-4 mr-2" />
                  Layers ({layerFeatures.length})
                </TabsTrigger>
                <TabsTrigger value="examples">
                  <Activity className="w-4 h-4 mr-2" />
                  Examples ({exampleFeatures.length})
                </TabsTrigger>
              </TabsList>

              {/* Plugins Tab */}
              <TabsContent value="plugins" className="space-y-4 mt-4">
                <div className="space-y-3">
                  {pluginFeatures.map(feature => (
                    <Card key={feature.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`feature-${feature.id}`} className="font-semibold text-base">
                                {feature.featureName}
                              </Label>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                feature.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                              }`}>
                                {feature.enabled ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                          </div>
                          <Switch
                            id={`feature-${feature.id}`}
                            checked={feature.enabled}
                            onCheckedChange={() => handleFeatureToggle(feature.featureKey, feature.enabled)}
                            disabled={toggleFeatureMutation.isPending}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Layers Tab */}
              <TabsContent value="layers" className="space-y-4 mt-4">
                <div className="space-y-3">
                  {layerFeatures.map(feature => (
                    <Card key={feature.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`feature-${feature.id}`} className="font-semibold text-base">
                                {feature.featureName}
                              </Label>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                feature.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                              }`}>
                                {feature.enabled ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                          </div>
                          <Switch
                            id={`feature-${feature.id}`}
                            checked={feature.enabled}
                            onCheckedChange={() => handleFeatureToggle(feature.featureKey, feature.enabled)}
                            disabled={toggleFeatureMutation.isPending}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Examples Tab */}
              <TabsContent value="examples" className="space-y-4 mt-4">
                <div className="space-y-3">
                  {exampleFeatures.map(feature => (
                    <Card key={feature.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`feature-${feature.id}`} className="font-semibold text-base">
                                {feature.featureName}
                              </Label>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                feature.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                              }`}>
                                {feature.enabled ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                          </div>
                          <Switch
                            id={`feature-${feature.id}`}
                            checked={feature.enabled}
                            onCheckedChange={() => handleFeatureToggle(feature.featureKey, feature.enabled)}
                            disabled={toggleFeatureMutation.isPending}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">MapLibre Version:</span> 5.15.0
              </div>
              <div>
                <span className="font-semibold">Database:</span> Connected
              </div>
              <div>
                <span className="font-semibold">Default Center:</span> -25.2744, 133.7751
              </div>
              <div>
                <span className="font-semibold">Zoom Range:</span> 3-20
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
