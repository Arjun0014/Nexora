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
import { initForms } from './forms';
import { initMotionToggle } from './motion';
import { initIntro } from './intro';
import { initScroll } from './core/scroll';
import { initPortal } from './scenes/portal';
import { initHeld } from './scenes/held';
import { initWorkforces } from './scenes/workforces';
import { initSectors } from './scenes/sectors';
import { initEngagement } from './scenes/engagement';
import { initExpect } from './scenes/expect';
import { initEmployers } from './scenes/employers';
import { initCandidates } from './scenes/candidates';
import { initFooter } from './scenes/footer';

const boot = () => {
  initHeader();
  initMenu();
  initHero();
  initIntro(); // after the hero: it reads the hero's real loading progress
  initScroll(); // after the hero, so the film's wheel listener runs first and can claim a gesture
  initReveal();
  initPortal();
  initHeld();
  initWorkforces();
  initSectors();
  initEngagement();
  initExpect();
  initEmployers();
  initCandidates();
  initFooter();
  initDeck();
  initProcess();
  initTurning();
  initZoom();
  initForms();
  initCursor();
  initMotionToggle();
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
