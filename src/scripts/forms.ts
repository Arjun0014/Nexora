/**
 * Form engine for every form[data-form].
 *  - multi-step fieldsets ([data-step]) with a progress label; focus moves to the new step's legend
 *  - validation on blur and on submit; messages are text under the field and summarised at the top with links
 *  - ?workforce= / ?sector= query parameters pre-select matching controls, so context survives between pages
 *  - posts multipart FormData to data-endpoint; with no endpoint it runs in a clearly-labelled PREVIEW mode
 *  - honeypot + minimum time-to-submit instead of a third-party CAPTCHA
 */
import { $, $$ } from './core/env';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s().-]{7,20}$/;

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function initForms() {
  $$<HTMLFormElement>('form[data-form]').forEach(enhance);
}

function enhance(form: HTMLFormElement) {
  const wrap = form.closest<HTMLElement>('[data-form-wrap]') ?? form.parentElement!;
  const done = $('[data-form-done]', wrap);
  const summary = $('[data-form-summary]', form)!;
  const steps = $$('[data-step]', form);
  const endpoint = form.dataset.endpoint ?? '';
  const t0 = performance.now();
  let step = 0;

  form.dataset.enhanced = '';

  // ── validation ──────────────────────────────────────────────────────────────────────────
  const fieldOf = (el: Element) => el.closest<HTMLElement>('.field');

  function problem(el: Control): string {
    const msg = el.dataset.msg ?? 'Please complete this field.';
    const v = el.value.trim();
    if (el instanceof HTMLInputElement && el.type === 'file') {
      const f = el.files?.[0];
      if (!f) return el.required ? msg : '';
      const max = Number(el.dataset.maxMb ?? 5) * 1024 * 1024;
      const okType = /\.(pdf|docx?)$/i.test(f.name);
      return !okType || f.size > max ? msg : '';
    }
    if (el instanceof HTMLInputElement && el.type === 'checkbox') return el.required && !el.checked ? msg : '';
    if (el.dataset.rule === 'phone') {
      const bare = v.replace(/^\+974\s*$/, '');
      if (!bare) return el.required ? msg : '';
      return PHONE.test(v) && v.replace(/\D/g, '').length >= 8 ? '' : msg;
    }
    if (!v) return el.required ? msg : '';
    if (el instanceof HTMLInputElement && el.type === 'email' && !EMAIL.test(v)) return msg;
    return '';
  }

  function mark(field: HTMLElement, target: Element | null, message: string) {
    const err = $('[data-error]', field);
    if (message) {
      field.dataset.invalid = '';
      if (err) { err.textContent = message; if (!err.id) err.id = `e-${Math.random().toString(36).slice(2, 8)}`; }
      if (target instanceof HTMLElement) { target.setAttribute('aria-invalid', 'true'); if (err) target.setAttribute('aria-describedby', [target.getAttribute('aria-describedby')?.replace(err.id, '').trim(), err.id].filter(Boolean).join(' ')); }
    } else {
      delete field.dataset.invalid;
      if (err) err.textContent = '';
      if (target instanceof HTMLElement) target.removeAttribute('aria-invalid');
    }
  }

  function validate(scope: ParentNode): { field: HTMLElement; target: HTMLElement; message: string }[] {
    const issues: { field: HTMLElement; target: HTMLElement; message: string }[] = [];
    // grouped choices (radio / checkbox chips, consent)
    $$('.field[data-group][data-required]', scope).forEach((field) => {
      const inputs = $$<HTMLInputElement>('input[type=radio], input[type=checkbox]', field);
      const ok = inputs.some((i) => i.checked);
      const message = ok ? '' : field.dataset.msg ?? 'Please choose an option.';
      mark(field, null, message);
      if (message) issues.push({ field, target: inputs[0], message });
    });
    $$<Control>('input:not([type=radio]):not([type=hidden]), select, textarea', scope).forEach((el) => {
      if (el.name === '_gotcha' || el.closest('[data-group]')) return;
      const field = fieldOf(el);
      if (!field) return;
      const message = problem(el);
      mark(field, el, message);
      if (message) issues.push({ field, target: el, message });
    });
    return issues;
  }

  function summarise(issues: { target: HTMLElement; message: string }[], lead?: string) {
    if (!issues.length && !lead) { summary.hidden = true; summary.innerHTML = ''; return; }
    summary.hidden = false;
    summary.innerHTML = '';
    const p = document.createElement('p');
    p.textContent = lead ?? (issues.length === 1 ? 'There is 1 thing to fix:' : `There are ${issues.length} things to fix:`);
    summary.append(p);
    if (issues.length) {
      const ul = document.createElement('ul');
      for (const it of issues) {
        if (!it.target.id) it.target.id = `f-${Math.random().toString(36).slice(2, 8)}`;
        const li = document.createElement('li'), a = document.createElement('a');
        a.href = `#${it.target.id}`; a.textContent = it.message;
        a.addEventListener('click', (e) => { e.preventDefault(); it.target.focus(); });
        li.append(a); ul.append(li);
      }
      summary.append(ul);
    }
    summary.focus();
  }

  // Pressing a button blurs the focused field. If that blur revealed an error message, the layout would
  // shift under the pointer and the click would land off the button — the press would be lost. The
  // button's own handler validates everything anyway, so blur-validation is skipped for that press.
  let pressedAt = -1e9;
  form.addEventListener('pointerdown', (e) => { if ((e.target as Element).closest('button')) pressedAt = performance.now(); }, true);

  form.addEventListener('focusout', (e) => {
    if (performance.now() - pressedAt < 500) return;
    const el = e.target as Element;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) return;
    if (el.name === '_gotcha' || el.type === 'radio' || el.closest('[data-group]')) return;
    const field = fieldOf(el);
    if (field && (el.value.trim() || field.dataset.invalid !== undefined)) mark(field, el, problem(el));
  });
  form.addEventListener('change', (e) => {
    const group = (e.target as Element).closest<HTMLElement>('.field[data-group]');
    if (group?.dataset.invalid !== undefined) mark(group, null, '');
  });

  // ── steps ───────────────────────────────────────────────────────────────────────────────
  const progress = $('[data-form-progress]', form);
  const stepName = $('[data-form-stepname]', form);
  const bar = $('[data-form-bar]', form);

  function show(i: number, focus = true) {
    step = i;
    steps.forEach((s, k) => { if (k === i) s.dataset.current = ''; else delete s.dataset.current; });
    if (stepName) stepName.textContent = `Step ${i + 1} of ${steps.length}`;
    bar?.style.setProperty('--p', String((i + 1) / steps.length));
    if (focus) {
      const legend = $('legend', steps[i]);
      legend?.focus({ preventScroll: true });
      const top = form.getBoundingClientRect().top + scrollY - 120;
      if (scrollY > top) scrollTo({ top, behavior: 'auto' });
    }
  }
  if (steps.length > 1) {
    if (progress) progress.hidden = false;
    $$('[data-form-nextwrap]', form).forEach((el) => (el.hidden = false));
    $$('[data-back]', form).forEach((el) => (el.hidden = false));
    show(0, false);
    $$('[data-next]', form).forEach((b) => b.addEventListener('click', () => {
      const issues = validate(steps[step]);
      summarise(issues);
      if (!issues.length) show(step + 1);
    }));
    $$('[data-back]', form).forEach((b) => b.addEventListener('click', () => { summarise([]); show(step - 1); }));
  }

  // ── prefill from the query string ───────────────────────────────────────────────────────
  new URLSearchParams(location.search).forEach((value, key) => {
    const choice = form.querySelector<HTMLInputElement>(`input[name="${CSS.escape(key)}"][value="${CSS.escape(value)}"]`);
    if (choice) { choice.checked = true; return; }
    const control = form.querySelector<HTMLSelectElement | HTMLInputElement>(`select[name="${CSS.escape(key)}"], input[type=text][name="${CSS.escape(key)}"]`);
    if (control) control.value = value;
  });

  // ── submit ──────────────────────────────────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const issues = validate(form);
    if (issues.length) {
      // Jump to the first step that contains a problem.
      const at = steps.findIndex((s) => s.contains(issues[0].field));
      if (steps.length > 1 && at >= 0 && at !== step) show(at, false);
      summarise(issues);
      return;
    }
    summarise([]);
    const bot = form.querySelector<HTMLInputElement>('input[name="_gotcha"]')?.value || performance.now() - t0 < 2500;
    const btn = form.querySelector<HTMLButtonElement>('button[type=submit]');
    const label = btn?.firstChild?.textContent ?? '';
    const finish = (preview: boolean) => {
      form.hidden = true;
      if (done) {
        const flag = $('[data-form-preview]', done);
        if (flag) flag.hidden = !preview;
        done.hidden = false;
        done.focus({ preventScroll: true });
        done.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    };

    if (bot) { finish(!endpoint); return; } // silently accept and drop
    if (!endpoint) { finish(true); return; }

    try {
      if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); if (btn.firstChild) btn.firstChild.textContent = 'Sending…'; }
      const data = new FormData(form);
      data.append('_form', form.dataset.form ?? '');
      data.append('_page', location.pathname);
      const res = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      finish(false);
    } catch {
      summarise([], 'We could not send this just now. Your answers are still here — please try again in a moment.');
    } finally {
      if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); if (btn.firstChild) btn.firstChild.textContent = label; }
    }
  });
}
