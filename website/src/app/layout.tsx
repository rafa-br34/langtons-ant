import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"

import "./globals.css"

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? ""
const basePath = rawBasePath && rawBasePath !== "/" ? `/${rawBasePath.replace(/^\/+|\/+$/g, "")}` : ""
const siteUrl = `https://rafa-br34.github.io${basePath || "/langtons-ant"}`

export const metadata: Metadata = {
	metadataBase: new URL("https://rafa-br34.github.io"),
	title: "Langton's Ant",
	description: "An interactive WebGL implementation of Langton's ant.",
	keywords: ["cellular automata", "langton's ant", "langtons ant", "turing machine", "webgl", "simulation"],
	authors: [{ name: "rafa_br34", url: "https://rafa-br34.dev" }],
	alternates: {
		canonical: `${basePath}/`,
	},
	icons: {
		icon: `${basePath}/favicon.ico`,
		shortcut: `${basePath}/favicon.ico`,
	},
	openGraph: {
		type: "website",
		siteName: "Langton's Ant",
		locale: "en_US",
		url: `${basePath}/`,
		title: "Langton's Ant",
		description: "An interactive WebGL implementation of Langton's ant.",
		images: [
			{
				url: `${siteUrl}/thumbnail.png`,
				width: 4321,
				height: 4320,
				alt: "LRRRRRLLR pattern on a 7680x4320 canvas after 76522574 iterations",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Langton's Ant",
		description: "An interactive WebGL implementation of Langton's ant.",
		images: [`${siteUrl}/thumbnail.png`],
	},
	robots: {
		index: true,
		follow: true,
	},
}

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	themeColor: "#222222", // Keep in sync with --color-canvas.
	colorScheme: "dark",
}

const LINKED_DATA = {
	"@context": "https://schema.org",
	"@type": "WebApplication",
	"name": "Langton's Ant",
	"url": `${siteUrl}/`,
	"applicationCategory": "EducationalApplication",
	"operatingSystem": "Any",
	"author": {
		"@type": "Person",
		"name": "rafa_br34",
		"url": "https://rafa-br34.dev",
	},
	"offers": {
		"@type": "Offer",
		"price": "0",
		"priceCurrency": "USD",
	},
}

export default function RootLayout({ children }: { readonly children: ReactNode }) {
	return (
		<html lang="en" className="dark">
			<head>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(LINKED_DATA) }}
				/>
				<meta name="google-site-verification" content="U_CvKNobjC-HUXNAntX0YWravxQr8mEmxmuNCWze14Q" />
			</head>
			<body>{children}</body>
		</html>
	)
}
