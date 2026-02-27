/**
 * Main App Component with Routing
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { QueryPanel } from './components/query/QueryPanel';
import { Dashboard } from './components/layout/Dashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <main className="py-8">
          <Routes>
            {/* Search Page */}
            <Route
              path="/"
              element={
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <QueryPanel />
                </div>
              }
            />

            {/* Dashboard Page */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* 404 Not Found */}
            <Route
              path="*"
              element={
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600 mb-8">Page not found</p>
                  <a href="/" className="btn-primary inline-block">
                    Go Home
                  </a>
                </div>
              }
            />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                EPAM AI Architecture Course - Module 3.2: RAG
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Powered by OpenAI & Cohere</span>
                <span>•</span>
                <span>2,500+ papers from JMLR</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
