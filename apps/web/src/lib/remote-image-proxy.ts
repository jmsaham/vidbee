import { apiUrl, getAuthToken } from "./orpc-client";

const IMAGE_PROXY_PATH = "images/proxy";

export const buildImageProxyUrl = (sourceUrl: string): string => {
	const proxyUrl = new URL(`${apiUrl}/${IMAGE_PROXY_PATH}`);
	proxyUrl.searchParams.set("url", sourceUrl);
	if (typeof window !== "undefined") {
		const token = getAuthToken();
		if (token) proxyUrl.searchParams.set("token", token);
	}
	return proxyUrl.toString();
};

export const resolveImageProxyUrl = async (
	sourceUrl: string,
): Promise<string> => {
	return buildImageProxyUrl(sourceUrl);
};
