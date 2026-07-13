import introJs from 'intro.js';
import 'intro.js/introjs.css';

export const useAppTour = (navigate: (path: string) => void) => {
  const startTour = () => {
    const intro = introJs();

    intro.setOptions({
      nextLabel: 'Next →',
      prevLabel: '← Back',
      doneLabel: 'Start Tracking 🚀',
      showProgress: true,
      showBullets: false,
      exitOnOverlayClick: false,
      disableInteraction: false,
      scrollToElement: true,
      tooltipClass: 'baka-intro-tooltip',
      steps: [
        {
          title: '🎮 Welcome to BakaTracker',
          intro: 'Your life, gamified. Every habit you track, every task you finish, every journal entry you write earns you XP and levels up your character. Let\'s take a 2-minute tour!',
        },
        {
          element: document.querySelector('#sidebar-level-bar') as HTMLElement || document.body,
          title: '⚡ Your Character Stats',
          intro: 'This is your <strong>Level</strong> and <strong>XP bar</strong>. Complete habits and tasks to fill it up and level up your character. You have 5 stats: Health, Discipline, Knowledge, Creativity, and Career.',
          position: 'right',
        },
        {
          element: document.querySelector('#sidebar-day-progress') as HTMLElement || document.body,
          title: '📊 Day Progress',
          intro: 'This shows how much of <strong>today\'s plan</strong> you\'ve completed — habits checked + today tasks done. Aim for 80%+ every day!',
          position: 'right',
        },
        {
          element: document.querySelector('#nav-habits') as HTMLElement || document.body,
          title: '🔥 Habits Page',
          intro: '<strong>Habits</strong> are your daily recurring actions. BakaTracker supports 5 types: checkbox, counter, mood tracker, energy tracker, and numeric input. Each habit earns XP and builds a stat.',
          position: 'right',
        },
        {
          element: document.querySelector('#habit-list-container') as HTMLElement || document.body,
          title: '✅ Your Habit Tracker',
          intro: 'Each row is one of your habits. Check it off for the day, log a counter count, or input a value like hours of sleep. You can view the last 5 days or the full month calendar.',
          position: 'bottom',
        },
        {
          element: document.querySelector('#add-habit-btn') as HTMLElement || document.body,
          title: '➕ Create New Habits',
          intro: 'Click here to add a new habit. Choose the type (checkbox, counter, numeric, mood, energy), which stat it builds, and how much XP it\'s worth.',
          position: 'bottom',
        },
        {
          element: document.querySelector('#nav-tasks') as HTMLElement || document.body,
          title: '📋 Tasks — Kanban Board',
          intro: '<strong>Tasks</strong> are one-off to-dos organised in a Kanban board with 4 columns: Backlog → Todo → Doing → Done. Each task is assigned to a life area (career, health, learning, etc.).',
          position: 'right',
        },
        {
          element: document.querySelector('#task-kanban-cols') as HTMLElement || document.body,
          title: '📌 Move Tasks Forward',
          intro: 'Use the <strong>arrow buttons</strong> on each card to move tasks between columns. Pin important ones to your <strong>Today board</strong> using the star ⭐ button.',
          position: 'top',
        },
        {
          element: document.querySelector('#nav-eisenhower') as HTMLElement || document.body,
          title: '⚔️ Eisenhower Matrix',
          intro: 'The <strong>Eisenhower Matrix</strong> helps you prioritise tasks by <em>urgency</em> and <em>importance</em>. Place tasks into 4 quadrants: Do First 🔥, Schedule 📅, Delegate 👥, or Delete 🗑️.',
          position: 'right',
        },
        {
          element: document.querySelector('#eisenhower-grid') as HTMLElement || document.body,
          title: '⚔️ The 2×2 Priority Grid',
          intro: 'Unassigned tasks appear in the <strong>Inbox</strong> below. Click a task to assign it to a quadrant. Tasks in <strong>Q1 (Do First)</strong> need your attention today. <strong>Q2 (Schedule)</strong> is where your important long-term goals live.',
          position: 'top',
        },
        {
          element: document.querySelector('#nav-today') as HTMLElement || document.body,
          title: '🎯 Today — Daily Focus',
          intro: 'The <strong>Today page</strong> is your daily command center. Only tasks you\'ve starred ⭐ show here. Use this every morning to plan your day.',
          position: 'right',
        },
        {
          element: document.querySelector('#nav-journal') as HTMLElement || document.body,
          title: '📓 Daily Journal',
          intro: 'The <strong>Journal</strong> is your daily reflection space. Log your mood 😊, write a highlight from the day, and track how you\'re feeling over time. Journal entries earn +10 XP.',
          position: 'right',
        },
        {
          element: document.querySelector('#nav-journey') as HTMLElement || document.body,
          title: '🗺️ Journey — Your Stats Hub',
          intro: 'The <strong>Journey page</strong> is your analytics dashboard. See your activity heatmap, XP over time, habit streaks, and character stat breakdown — all in one place.',
          position: 'right',
        },
        {
          element: document.querySelector('#journey-heatmap') as HTMLElement || document.body,
          title: '🟩 Activity Heatmap',
          intro: 'This heatmap shows every day you\'ve used BakaTracker. Darker = higher completion %. Click any day to see what you did. Your goal: build an unbroken chain! 🔥',
          position: 'top',
        },
        {
          element: document.querySelector('#journey-stat-bars') as HTMLElement || document.body,
          title: '📈 Character Stat Bars',
          intro: 'Each habit and task maps to a stat. As you track more, your bars grow. These reflect the actual balance of your life — are you a Health Warrior, Knowledge Sage, or Discipline Master?',
          position: 'top',
        },
        {
          element: document.querySelector('#settings-btn') as HTMLElement || document.body,
          title: '⚙️ Settings & Sync',
          intro: 'In <strong>Settings</strong> you can: connect <strong>Google Sheets</strong> for cloud backup, customise your accent colour, load demo data, or replay this tour anytime. All data syncs automatically once connected. You\'re all set — go build those habits! 🚀',
          position: 'left',
        },
      ],
    });

    // Navigate between pages as tour progresses
    intro.onbeforechange(function () {
      const stepIndex = this.currentStep();
      if (stepIndex !== undefined) {
        // Steps 4-5: Habits page
        if (stepIndex === 4 || stepIndex === 5) {
          navigate('/habits');
        }
        // Steps 6-7: Tasks page
        else if (stepIndex === 6 || stepIndex === 7) {
          navigate('/tasks');
        }
        // Steps 8-9: Eisenhower page
        else if (stepIndex === 8 || stepIndex === 9) {
          navigate('/eisenhower');
        }
        // Step 10: Today page
        else if (stepIndex === 10) {
          navigate('/today');
        }
        // Step 11: Journal page
        else if (stepIndex === 11) {
          navigate('/journal');
        }
        // Steps 12-14: Journey page
        else if (stepIndex >= 12 && stepIndex <= 14) {
          navigate('/journey');
        }
      }
      return true;
    });

    intro.start();
  };

  return { startTour };
};
