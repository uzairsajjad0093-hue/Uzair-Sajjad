import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  activeView: 'landing' | 'survey' | 'thank-you' | 'admin-login' | 'admin-dashboard';
  onNavigateHome: () => void;
  onStartSurveyAction: () => void;
  onNavigateAdmin: () => void;
}

export function Navbar({
  activeView,
  onNavigateHome,
  onStartSurveyAction,
  onNavigateAdmin,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#F8BBD0]/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark */}
        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            onNavigateHome();
          }}
          className="text-lg sm:text-xl font-bold tracking-tight text-[#333333] hover:text-[#E75480] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Women&apos;s Health Survey
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#666666]"
        >
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigateHome();
            }}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'landing' ? 'text-[#E75480] font-semibold' : 'hover:text-[#E75480]'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigateAdmin();
            }}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'admin-login' || activeView === 'admin-dashboard'
                ? 'text-[#E75480] font-semibold'
                : 'hover:text-[#E75480]'
            }`}
          >
            Admin Portal
          </button>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {activeView !== 'survey' && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onStartSurveyAction();
              }}
              className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white rounded-full bg-gradient-to-r from-[#E75480] to-[#D94F8A] hover:opacity-95 shadow-sm transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
            >
              Start Survey
            </button>
          )}
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl border border-[#F8BBD0] text-[#333333] hover:bg-[#FFF0F5] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden border-t border-[#F8BBD0]/60 bg-white px-4 py-4 space-y-2"
        >
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigateHome();
            }}
            className="block w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#333333] hover:bg-[#FFF0F5]"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigateAdmin();
            }}
            className="block w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#333333] hover:bg-[#FFF0F5]"
          >
            Admin Portal
          </button>
          {activeView !== 'survey' && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onStartSurveyAction();
              }}
              className="w-full mt-2 px-5 py-3 text-sm font-semibold text-white rounded-full bg-gradient-to-r from-[#E75480] to-[#D94F8A]"
            >
              Start Survey
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
