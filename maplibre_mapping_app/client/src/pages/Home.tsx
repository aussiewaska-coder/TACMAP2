import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { Map, Settings, Layers, Database } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Map className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-800">MapLibre Australia</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
                {user?.role === "admin" && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <Button asChild>
                <a href={getLoginUrl()}>Login</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Comprehensive MapLibre GL JS Application
          </h2>
          <p className="text-xl text-gray-700 mb-8">
            A feature-rich, Australia-focused interactive mapping platform built with MapLibre GL JS. 
            Explore advanced mapping capabilities, plugins, and customization options.
          </p>
          
          <Link href="/map">
            <Button size="lg" className="text-lg px-8 py-6">
              <Map className="w-6 h-6 mr-2" />
              Launch Map Application
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <Map className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Australia-Focused</h3>
            <p className="text-gray-600">
              Centered on Australia with optimized bounds, zoom levels, and geographic features. 
              Quick navigation to major cities including Sydney, Melbourne, and Brisbane.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Layers className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Rich Plugin Ecosystem</h3>
            <p className="text-gray-600">
              Integrated plugins including Draw, Geocoder, Export, Compare, Measures, and more. 
              Full control over map layers, styles, and interactions.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Database className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Extensible Architecture</h3>
            <p className="text-gray-600">
              Built as a skeleton for custom data integration. Add your own layers, data sources, 
              and UI components with ease.
            </p>
          </div>
        </div>

        {/* Feature List */}
        <div className="mt-16 bg-white rounded-lg shadow-md p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Key Features</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">✓</span>
                <span>Interactive map with tilt, zoom, rotation, and fly-to controls</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">✓</span>
                <span>Navigation controls, scale bar, and compass</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">✓</span>
                <span>Drawing and geometry editing tools</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">✓</span>
                <span>Geocoding and location search</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">✓</span>
                <span>Map export to PDF and images</span>
              </li>
            </ul>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">✓</span>
                <span>Distance and area measurements</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">✓</span>
                <span>Layer opacity and visibility controls</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">✓</span>
                <span>Multiple basemap styles (street, satellite, terrain)</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">✓</span>
                <span>Admin dashboard for feature management</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">✓</span>
                <span>Mobile-responsive with touch gestures</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Built With</h3>
          <div className="flex flex-wrap justify-center gap-4">
            <span className="bg-white px-4 py-2 rounded-full shadow-sm">MapLibre GL JS</span>
            <span className="bg-white px-4 py-2 rounded-full shadow-sm">React 19</span>
            <span className="bg-white px-4 py-2 rounded-full shadow-sm">TypeScript</span>
            <span className="bg-white px-4 py-2 rounded-full shadow-sm">Tailwind CSS 4</span>
            <span className="bg-white px-4 py-2 rounded-full shadow-sm">tRPC</span>
            <span className="bg-white px-4 py-2 rounded-full shadow-sm">Drizzle ORM</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>MapLibre Australia - A comprehensive mapping application skeleton</p>
          <p className="text-sm mt-2">Ready for your custom data layers and integrations</p>
        </div>
      </footer>
    </div>
  );
}
