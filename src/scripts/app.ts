/** Entry point. Every module is a no-op when its markup is absent, so one bundle serves all pages. */
import { initHeader } from './header';
import { initMenu } from './menu';
import { initReveal } from './reveal';
import { initCursor } from './cursor';
import { initHero } from './hero/index';
import { initDeck } from './deck';
import { initProcess } from './process';
import { initPlate } from './plate';
import { initForms } from './forms';
import { initMotionToggle } from './motion';

const boot = () => {
  initHeader();
  initMenu();
  initHero();
  initReveal();
  initDeck();
  initProcess();
  initPlate();
  initForms();
  initCursor();
  initMotionToggle();
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
