// Node.js script to generate fragments from text files
// Run this with: node generate_fragments.js

const fs = require('fs');

// Common stop words to exclude
const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its',
    'our', 'their', 'what', 'which', 'who', 'when', 'where', 'why',
    'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 's', 't', 'just', 'there', 'also',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'about', 'didn', 'wasn', 'weren', 'wouldn', 'couldn',
    'shouldn', 'haven', 'hasn', 'hadn', 'wasn'
]);

try {
    // Read text files
    const essayText = fs.readFileSync('gehry_essay.txt', 'utf8');
    const interviewText = fs.readFileSync('gehry_interview.txt', 'utf8');

    // Combine texts
    const combinedText = essayText + ' ' + interviewText;

    // Split into sentences
    const sentences = combinedText
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 20);

    console.log(`Found ${sentences.length} sentences`);

    // Extract keywords - each word appears once, but sentences can be reused
    const fragments = [];
    const usedWords = new Set();

    // First pass: extract unique words from all sentences
    for (let sentence of sentences) {
        // Split sentence into words
        const words = sentence
            .toLowerCase()
            .replace(/[^\w\s'-]/g, ' ') // Keep hyphens and apostrophes
            .split(/\s+/)
            .filter(word =>
                word.length > 3 && // At least 4 characters
                !stopWords.has(word) &&
                !/^\d+$/.test(word) && // Not a number
                !word.includes("'") // Skip contractions
            );

        // Add all unique words from this sentence
        for (let word of words) {
            if (!usedWords.has(word)) {
                fragments.push({
                    fragment: word,
                    sentence: sentence.trim()
                });
                usedWords.add(word);
            }
        }
    }

    // Ensure we have at least 400 keywords
    console.log(`Extracted ${fragments.length} unique keywords from ${sentences.length} sentences`);

    if (fragments.length < 400) {
        console.warn(`Warning: Only found ${fragments.length} keywords. Need 400 for 20x20 grid.`);
        console.warn('Consider: 1) Adding more source text, 2) Relaxing word length requirements, or 3) Including more word types');
    }

    console.log(`Extracted ${fragments.length} unique keywords`);
    console.log(`First 10 keywords: ${fragments.slice(0, 10).map(f => f.fragment).join(', ')}`);

    // Generate JavaScript file
    let output = '// Auto-generated fragments from Gehry texts\n';
    output += '// DO NOT EDIT - run generate_fragments.js to regenerate\n\n';
    output += 'const essayData = [\n';

    for (let item of fragments) {
        output += '    {\n';
        output += `        fragment: "${item.fragment}",\n`;
        output += `        sentence: "${item.sentence.replace(/"/g, '\\"')}",\n`;
        output += '        isPunctuation: false\n';
        output += '    },\n';
    }

    // Add punctuation
    output += '    // Punctuation nodes\n';
    output += '    {\n';
    output += '        fragment: ",",\n';
    output += '        sentence: "",\n';
    output += '        isPunctuation: true\n';
    output += '    },\n';
    output += '    {\n';
    output += '        fragment: ".",\n';
    output += '        sentence: "",\n';
    output += '        isPunctuation: true\n';
    output += '    },\n';
    output += '    {\n';
    output += '        fragment: "\\n",\n';
    output += '        sentence: "",\n';
    output += '        isPunctuation: true\n';
    output += '    }\n';
    output += '];\n\n';

    // Add the getRandomFragments function (fixed order version)
    output += '// Fixed fragments - same for every user, same positions every time\n';
    output += 'function getRandomFragments(count, includePunctuation = true) {\n';
    output += '    let pool = essayData.filter(item => !item.isPunctuation);\n';
    output += '    let punctuation = essayData.filter(item => item.isPunctuation);\n\n';
    output += '    // NO SHUFFLING - use fixed order so every user sees the same bubbles in same positions\n';
    output += '    let selected = pool.slice(0, count);\n\n';
    output += '    // Add punctuation at fixed positions\n';
    output += '    if (includePunctuation) {\n';
    output += '        let numPunctuation = Math.floor(count * 0.15);\n';
    output += '        // Insert punctuation at predetermined positions (always the same)\n';
    output += '        let punctPositions = [5, 12, 18, 23]; // Fixed positions\n\n';
    output += '        for (let i = 0; i < numPunctuation && i < punctPositions.length; i++) {\n';
    output += '            let punctIndex = i % punctuation.length;\n';
    output += '            let insertPos = punctPositions[i] % selected.length;\n';
    output += '            selected.splice(insertPos, 0, punctuation[punctIndex]);\n';
    output += '        }\n';
    output += '    }\n\n';
    output += '    return selected;\n';
    output += '}\n';

    // Write to fragments.js
    fs.writeFileSync('fragments.js', output);

    console.log('\n✅ Successfully generated fragments.js');
    console.log(`Total fragments: ${fragments.length}`);

} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}
