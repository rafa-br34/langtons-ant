import type { NextConfig } from "next"

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? ""
const basePath = rawBasePath && rawBasePath !== "/"
	? `/${rawBasePath.replace(/^\/+|\/+$/g, "")}`
	: ""

const nextConfig: NextConfig = {
	output: "export",
	trailingSlash: true,
	reactStrictMode: true,
	images: {
		unoptimized: true,
	},
	...(basePath ? { basePath } : {}),
}

export default nextConfig
