const fs = require('fs');
const file = '/Users/su/Desktop/code/项目/零碳项目收益评估软件前端/components/ProjectEntry.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix the spaces in closing tags
content = content.replace(/<\/div \>/g, '</div>');
content = content.replace(/<\/section \>/g, '</section>');
content = content.replace(/< div className =/g, '<div className=');

fs.writeFileSync(file, content);
console.log('Fixed tags');
