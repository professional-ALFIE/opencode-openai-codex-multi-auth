import { promises as fs } from 'node:fs';

async function cleanup() {
    const filePath = 'index.ts';
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Remove the redundant duplicate code block
    // We search for the pattern where the tools start and the redundant part starts
    const marker = 'const enabledCount = accounts.filter((a) => a.enabled !== false).length;';
    const firstIndex = content.indexOf(marker);
    const secondIndex = content.indexOf(marker, firstIndex + 1);
    
    if (firstIndex !== -1 && secondIndex !== -1) {
        console.log("Detected duplicate tool logic block. Cleaning up...");
        // This is a bit risky with strings, but we know the structure from the read
        // The duplicate starts somewhere around line 1398 based on previous read
        // Let's just rewrite the whole tool section with a clean version to be safe.
    }
}
