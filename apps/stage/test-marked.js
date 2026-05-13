const { marked } = require('marked');

const markdown = `\`\`\`mermaid
graph LR
A["Test"]
\`\`\``;

const html = marked(markdown);
console.log('HTML output:');
console.log(html);
