-- Habits schema extension (type, icon, xp, stat, preset, archived)
ALTER TABLE habits ADD COLUMN type TEXT NOT NULL DEFAULT 'checkbox';
ALTER TABLE habits ADD COLUMN icon TEXT NOT NULL DEFAULT '💪';
ALTER TABLE habits ADD COLUMN xp INTEGER NOT NULL DEFAULT 5;
ALTER TABLE habits ADD COLUMN stat TEXT NOT NULL DEFAULT 'health';
ALTER TABLE habits ADD COLUMN preset TEXT;
ALTER TABLE habits ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
