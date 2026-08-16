// Summarize eslint JSON output by file (F10a lint baseline)
let d = '';
process.stdin.on('data', c => (d += c));
process.stdin.on('end', () => {
  const files = JSON.parse(d);
  const withErr = files.filter(f => f.errorCount > 0).sort((a, b) => b.errorCount - a.errorCount);
  for (const f of withErr) {
    console.log(f.errorCount, f.filePath.replace(/\\/g, '/').replace('D:/Portfilo_build.srivatsa/BakaTracker/', ''));
  }
  console.log('TOTAL', files.reduce((a, f) => a + f.errorCount, 0), 'files-with-errors', withErr.length);
});
