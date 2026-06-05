import type { Metadata } from 'next';
import './globals.css';
import { UserProvider } from '@/lib/UserContext';
import { ThemeProvider } from '@/lib/ThemeContext';

export const metadata: Metadata = {
    title: 'Scout — Multi-Sector Intelligence Dashboard',
    description: 'Real-time recruiting intent data and construction leads aggregated from across the web. Track GCs, subcontractors, telecom & energy talent pipelines.',
    keywords: ['intelligence', 'recruiting', 'construction', 'leads', 'scout', 'dashboard'],
    authors: [{ name: 'BlueJax' }],
    icons: {
        icon: '/favicon.png',
        apple: '/apple-icon.png',
    },
    openGraph: {
        title: 'Scout — Multi-Sector Intelligence',
        description: 'Real-time recruiting & lead intelligence across Construction, Telecom, and Energy sectors.',
        url: 'https://scout.bluejax.ai',
        siteName: 'Scout Intelligence',
        images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Scout Intelligence Dashboard' }],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Scout — Multi-Sector Intelligence',
        description: 'Real-time recruiting & lead intelligence across Construction, Telecom, and Energy sectors.',
        images: ['/og-image.png'],
    },
    other: {
        'theme-color': '#0a0a1a',
        'msapplication-TileColor': '#0a0a1a',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="manifest" href="/manifest.json" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
            </head>
            <body>
                <UserProvider><ThemeProvider>{children}</ThemeProvider></UserProvider>
            </body>
        </html>
    );
}
