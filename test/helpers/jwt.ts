export function createJwt(payload: Record<string, unknown>): string {
	const header = {
		alg: "RS256",
		typ: "JWT",
	};
	const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
	const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
	return `${headerB64}.${payloadB64}.signature`;
}
