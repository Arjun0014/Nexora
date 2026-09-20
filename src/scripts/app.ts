/** Entry point. Every module is a no-op when its markup is absent, so one bundle serves all pages. */
import { initHeader } from './header';
import { initMenu } from './menu';
import { initReveal } from './reveal';
import { initCursor } from './cursor';
import { initHero } from './hero/index';
import { initDeck } from './deck';
import { initProcess } from './process';
import { initTurning } from './turning';
import { initZoom } from './zoom';
import { initSound } from './sound';
import { initForms } from './forms';
import { initMotionToggle } from './motion';
import { initIntro } from './intro';

const boot = () => {
  initHeader();
  initMenu();
  initHero();
  initIntro(); // after the hero: it reads the hero's real loading progress
  initReveal();
  initDeck();
  initProcess();
  initTurning();
  initZoom();
  initSound();
  initForms();
  initCursor();
  initMotionToggle();
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
