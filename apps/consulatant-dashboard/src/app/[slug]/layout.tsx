
import { Metadata } from 'next';
import { consultantApi } from "@/lib/api";
import { Inter, Poppins } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

// Generate dynamic metadata for consultant pages
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const profileData = await consultantApi.getPublicProfile(resolvedParams.slug);
    
    const consultant = profileData?.consultant;
    const consultantName = consultant ? `${consultant.firstName} ${consultant.lastName}` : 'Consultant';
    const title = `${consultantName} - Professional Consulting Services | Nakksha`;
    const description = consultant?.description 
      ? `Get expert consulting services from ${consultantName}. ${consultant.description.substring(0, 150)}...`
      : `Professional consulting services by ${consultantName}. Book personal sessions and webinars.`;

    return {
      title,
      description,
      keywords: `${consultantName}, consulting, ${consultant?.consultancySector || 'business'}, expert advice, professional services`,
      authors: [{ name: consultantName }],
      openGraph: {
        title,
        description,
        type: 'profile',
        images: consultant?.profilePhotoUrl ? [consultant.profilePhotoUrl] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: consultant?.profilePhotoUrl ? [consultant.profilePhotoUrl] : [],
      }
    };
  } catch (error) {
    console.error('Error generating metadata for consultant page:', error);
    return {
      title: 'Consultant Profile | Nakksha',
      description: 'Professional consulting services - Book sessions and get expert advice.',
    };
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>
      
            {children}
      
      </body>
    </html>
  );
}