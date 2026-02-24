import Link from "next/link";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-brand-700">
            <span className="text-2xl">ð</span> LocalBoost
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/browse" className="hover:text-brand-600 transition-colors">Find providers</Link>
            <Link href="/pricing" className="hover:text-brand-600 transition-colors">Pricing</Link>
            <Link href="/industries" className="hover:text-brand-600 transition-colors">Industries</Link>
            <Link href="/faq" className="hover:text-brand-600 transition-colors">FAQ</Link>
            <Link href="/contact" className="hover:text-brand-600 transition-colors">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm">Log in</Link>
            <Link href="/signup" className="btn-primary text-sm">Start free â</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="text-white font-bold text-lg mb-3">ð LocalBoost</div>
              <p className="text-sm">Helping Cyprus businesses reduce no-shows and grow reviews â automatically.</p>
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold mb-3 uppercase tracking-wide">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/industries" className="hover:text-white transition-colors">Industries</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold mb-3 uppercase tracking-wide">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold mb-3 uppercase tracking-wide">Get Started</h4>
              <Link href="/signup" className="btn-primary text-sm inline-block">Try Free â</Link>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-sm text-center">
            Â© {new Date().getFullYear()} LocalBoost. Built for Cyprus businesses.
          </div>
        </div>
      </footer>
    </div>
  );
}
