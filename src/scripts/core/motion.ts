/**
 * The site's one motion language. Eases and durations are ERA Residence's measured values (read from its
 * production script): arrivals are `out`, departures `in`, camera moves `inOut`, and the long reveals `dive`
 * (slow to leave, then gone). Nothing else in the codebase defines an ease.
 */
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(CustomEase, ScrollTrigger, SplitText);

export const EASE = {
  inOut: CustomEase.create('nx-inOut', '0.75,0,0.25,1'),
  out: CustomEase.create('nx-out', '0.25,1,0.5,1'),
  in: CustomEase.create('nx-in', '0.5,0,0.75,0'),
  ease: CustomEase.create('nx-ease', '0.25,0.1,0.25,1'),
  dive: CustomEase.create('nx-dive', '0.6,0,0,1'),
};

export const DUR = { s: 0.4, m: 0.8, l: 1.2 };
export const STAGGER = 0.08;

export { gsap, ScrollTrigger, SplitText };
