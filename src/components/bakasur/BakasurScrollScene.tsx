import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BakasurSceneAdapter } from './BakasurSceneAdapter';
import { Sparkles, Sword, Zap } from 'lucide-react';

if (typeof window !== 'undefined' && !(gsap as unknown as { __bakasurRegistered?: boolean }).__bakasurRegistered) {
  gsap.registerPlugin(ScrollTrigger);
  (gsap as unknown as { __bakasurRegistered?: boolean }).__bakasurRegistered = true;
}

interface StoryStep {
  title: string;
  subtitle: string;
  badge: string;
  bossHp: number;
  playerXp: number;
  unlockedAttribute: string;
}

const STORY_STEPS: StoryStep[] = [
  {
    title: 'THE WORKLOAD DEVOURER AWAKENS',
    subtitle: 'Every unworked task feeds chaos. Bakasur waits in the abyss, ready to consume your backlog.',
    badge: 'STAGE 1: ENTRY',
    bossHp: 100,
    playerXp: 0,
    unlockedAttribute: 'INITIATIVE +10',
  },
  {
    title: 'DEVOUR YOUR TASKS. GAIN POWER.',
    subtitle: 'Feed Bakasur your daily quests. One check-in turns friction into pure character experience.',
    badge: 'STAGE 2: ENGAGEMENT',
    bossHp: 65,
    playerXp: 150,
    unlockedAttribute: 'STRENGTH +25 ⚔️',
  },
  {
    title: 'CHAIN HABITS & UNLOCK ATTRIBUTES',
    subtitle: 'Five daily interaction types stream XP straight into Intellect, Vitality, and Focus.',
    badge: 'STAGE 3: COMBO STREAK',
    bossHp: 30,
    playerXp: 350,
    unlockedAttribute: 'INTELLECT +40 🧠',
  },
  {
    title: 'BOSS DEFEATED. YOUR LIFE LEVELED.',
    subtitle: 'The ledger is clear. Chaos is transformed into real-world mastery and consistency.',
    badge: 'STAGE 4: VICTORY',
    bossHp: 0,
    playerXp: 500,
    unlockedAttribute: 'LEVEL UP! 🌟',
  },
];

export const BakasurScrollScene: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const crtFrameRef = useRef<HTMLDivElement | null>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // GSAP ScrollTrigger Pinned Frame Scrubbing
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || reducedMotion) return;

    const lastStepRef = { current: 0 };

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: '+=200%',
        pin: true,
        scrub: 0.2,
        onUpdate: (self) => {
          const prog = self.progress;
          setScrollProgress(prog);

          // Calculate current story step (0..3)
          const newStepIndex = Math.min(
            STORY_STEPS.length - 1,
            Math.floor(prog * STORY_STEPS.length)
          );

          if (newStepIndex !== lastStepRef.current) {
            lastStepRef.current = newStepIndex;
            setActiveStepIndex(newStepIndex);

            // Trigger screen shake on step transition
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 350);
          }
        },
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  const currentStep = STORY_STEPS[activeStepIndex];
  // Calculate dynamic HP and XP based on smooth scrollProgress
  const currentBossHp = Math.round(100 - scrollProgress * 100);
  const currentPlayerXp = Math.round(scrollProgress * 500);
  const sceneTime = scrollProgress * 10; // 0 to 10 seconds

  return (
    <section
      ref={sectionRef}
      id="bakasur-scroll-scene"
      className="relative min-h-screen w-full bg-[#0B0C10] text-[#E9E6F2] py-16 px-4 md:px-8 flex flex-col justify-center overflow-hidden border-y border-[rgba(255,204,0,0.15)]"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,51,102,0.06) 0%, rgba(11,12,16,1) 80%)',
      }}
    >
      {/* Retro Grid Lines & CRT Scanline Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(255, 204, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 204, 0, 0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.5), rgba(0,0,0,0.5) 2px, transparent 2px, transparent 4px)',
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* LEFT COLUMN: CRT Cabinet & 16-Bit Bakasur Viewport (5 cols) */}
        <div className="lg:col-span-6 flex flex-col items-center">
          {/* CRT Cabinet Header */}
          <div className="w-full flex items-center justify-between px-4 py-2 bg-[#12141D] border border-[rgba(255,204,0,0.3)] rounded-t-xl font-mono text-[11px]">
            <span className="flex items-center gap-2 text-[#FFCC00]">
              <span className="w-2 h-2 rounded-full bg-[#FFCC00] animate-ping" />
              BAKASUR · 16-BIT RETRO CRT
            </span>
            <span className="text-[rgba(233,230,242,0.6)]">{currentStep.badge}</span>
          </div>

          {/* Main CRT Screen Box */}
          <div
            ref={crtFrameRef}
            className={`w-full relative aspect-square max-w-[500px] bg-[#07080D] border-4 border-[#1E2235] rounded-b-xl overflow-hidden shadow-[0_0_40px_rgba(255,51,102,0.25)] transition-transform duration-75 ${
              isShaking ? 'translate-x-1 -translate-y-1 rotate-1' : ''
            }`}
          >
            {/* Fallback & Adapter Renderer */}
            <div className="w-full h-full relative flex items-center justify-center">
              <BakasurSceneAdapter
                sceneId="bakasur-awakening"
                time={sceneTime}
                autoplay={false}
                loop={false}
                width={500}
                height={500}
                className="w-full h-full object-cover"
              />

              {/* CRT Glass Reflection Effect */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-tr from-transparent via-white to-transparent"
                aria-hidden="true"
              />

              {/* In-CRT Overlay HUD Info */}
              <div className="absolute bottom-4 left-4 right-4 bg-[rgba(11,12,16,0.85)] backdrop-blur-md border border-[rgba(255,204,0,0.3)] p-3 rounded-lg flex items-center justify-between font-mono text-xs">
                <div>
                  <div className="text-[#FFCC00] font-bold tracking-wider">BAKASUR LVL 99</div>
                  <div className="text-[10px] text-[rgba(233,230,242,0.6)]">STATUS: DEVOURING QUESTS</div>
                </div>
                <div className="text-right">
                  <div className="text-[#FF3366] font-bold">HP {currentBossHp}/100</div>
                  <div className="w-24 h-2 bg-[#1A1C29] border border-[rgba(255,51,102,0.4)] rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-[#FF3366] transition-all duration-150"
                      style={{ width: `${currentBossHp}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Pinned Story Scene & Live Arcade Quest HUD (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          
          {/* Scroll Progress Bar */}
          <div className="flex items-center gap-3 font-mono text-xs text-[#FFCC00]">
            <span>SCROLL PROGRESS</span>
            <div className="flex-1 h-1.5 bg-[#12141D] border border-[rgba(255,204,0,0.3)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FFCC00] to-[#FF3366] transition-all duration-75"
                style={{ width: `${Math.round(scrollProgress * 100)}%` }}
              />
            </div>
            <span>{Math.round(scrollProgress * 100)}%</span>
          </div>

          {/* Stepped Lore Typography Box */}
          <div className="p-6 bg-[rgba(18,20,29,0.8)] border-2 border-[rgba(255,204,0,0.3)] rounded-xl backdrop-blur-md shadow-2xl relative">
            <span className="px-2.5 py-1 bg-[rgba(255,204,0,0.15)] border border-[#FFCC00] text-[#FFCC00] font-mono text-[10px] uppercase rounded tracking-widest inline-block mb-3">
              {currentStep.badge}
            </span>

            <h2
              className="text-2xl md:text-3xl font-black text-[#E9E6F2] tracking-wide mb-3 uppercase"
              style={{ fontFamily: '"VT323", "IBM Plex Mono", monospace' }}
            >
              {currentStep.title}
            </h2>

            <p className="text-sm md:text-base text-[rgba(233,230,242,0.8)] leading-relaxed font-sans mb-6">
              {currentStep.subtitle}
            </p>

            {/* Live Quest & Attribute Unlocks */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs pt-4 border-t border-[rgba(255,204,0,0.15)]">
              <div className="flex items-center gap-2 p-2.5 bg-[rgba(255,51,102,0.1)] border border-[rgba(255,51,102,0.3)] rounded-lg">
                <Sword className="w-4 h-4 text-[#FF3366] shrink-0" />
                <div>
                  <div className="text-[10px] text-[rgba(233,230,242,0.6)]">BOSS DAMAGE</div>
                  <div className="text-[#FF3366] font-bold">-{100 - currentBossHp} HP</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-[rgba(255,204,0,0.1)] border border-[rgba(255,204,0,0.3)] rounded-lg">
                <Sparkles className="w-4 h-4 text-[#FFCC00] shrink-0" />
                <div>
                  <div className="text-[10px] text-[rgba(233,230,242,0.6)]">PLAYER GAIN</div>
                  <div className="text-[#FFCC00] font-bold">+{currentPlayerXp} XP</div>
                </div>
              </div>
            </div>
          </div>

          {/* Player Stats & Attribute Unlock Banner */}
          <div className="flex items-center justify-between px-5 py-3 bg-[rgba(11,12,16,0.9)] border border-[rgba(0,240,255,0.3)] rounded-lg font-mono text-xs">
            <div className="flex items-center gap-2 text-[#00F0FF]">
              <Zap className="w-4 h-4 text-[#00F0FF]" />
              <span>UNLOCKED STAT:</span>
              <strong className="text-white">{currentStep.unlockedAttribute}</strong>
            </div>
            <span className="text-[10px] text-[rgba(233,230,242,0.5)] hidden sm:inline">
              [SCROLL TO DEVOUR]
            </span>
          </div>

        </div>

      </div>
    </section>
  );
};
