const fs = require('fs');
const path = require('path');

// Cấu hình: Các thư mục và file cần BỎ QUA
const IGNORE_DIRS = ['node_modules', '.git', '.vscode', 'dist', 'build', 'coverage', '.next', 'public'];
const IGNORE_FILES = ['package-lock.json', 'yarn.lock', '.DS_Store', '.env'];
const ALLOWED_EXTS = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.json', '.html', '.vue', '.ejs'];

// Tên file kết quả đầu ra
const OUTPUT_FILE = 'FULL_PROJECT_CODE.txt';

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (!IGNORE_FILES.includes(file) && ALLOWED_EXTS.includes(path.extname(file))) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

const projectFiles = getAllFiles(__dirname);
let content = `=== PROJECT STRUCTURE ===\n`;

// Ghi cấu trúc thư mục trước
projectFiles.forEach(f => content += `${path.relative(__dirname, f)}\n`);
content += `\n=========================\n\n`;

// Ghi nội dung từng file
projectFiles.forEach(filePath => {
  const relativePath = path.relative(__dirname, filePath);
  // Bỏ qua chính file script này và file output
  if (relativePath === 'scan_project.js' || relativePath === OUTPUT_FILE) return;

  console.log(`Đang đọc: ${relativePath}`);
  content += `\n\n--- START OF FILE: ${relativePath} ---\n`;
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    content += fileContent;
  } catch (e) {
    content += `[Error reading file]`;
  }
  content += `\n--- END OF FILE: ${relativePath} ---\n`;
});

fs.writeFileSync(OUTPUT_FILE, content, 'utf8');
console.log(`\n✅ XONG! Toàn bộ code đã được gom vào file: ${OUTPUT_FILE}`);
console.log(`👉 Hãy upload file ${OUTPUT_FILE} này cho AI.`);