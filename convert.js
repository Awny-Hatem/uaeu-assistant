const fs = require('fs');
const content = fs.readFileSync('results.txt', 'utf16le');
fs.writeFileSync('C:\\Users\\USER\\.gemini\\antigravity\\brain\\82fa52ff-0f38-4d36-bbb0-acfe40250dee\\artifacts\\results.md', content, 'utf8');
