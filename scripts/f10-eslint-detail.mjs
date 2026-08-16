// Dump per-file error details for the files of interest (F10a)
let d = '';
process.stdin.on('data', c => (d += c));
process.stdin.on('end', () => {
  const files = JSON.parse(d);
  const focus = ['LightTunnel.tsx', 'useFocusTrap.ts', 'Landing.tsx', 'Today.tsx', 'AppBackground.tsx', 'Layout.tsx', 'Habits.tsx', 'Journal.tsx', 'Journey.tsx', 'AuthProvider.tsx', 'calculateHabitStreak.ts', 'generateInsights.ts', 'useStore.ts', 'apiClient.ts'];
  for (const f of files) {
    const name = f.filePath.replace(/\\/g, '/').split('/').pop();
    if (!focus.includes(name)) continue;
    console.log(`\n=== ${name} (${f.errorCount}) ===`);
    for (const m of f.messages) {
      console.log(`  ${m.line}:${m.column} ${m.ruleId} — ${m.message.slice(0, 110)}`);
    }
  }
});
