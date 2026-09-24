/**
 * The pre-paint theme script.
 *
 * This runs in <head>, before the browser paints anything, and its only job
 * is to add `class="light"` to <html> when the visitor has chosen light. Dark
 * needs no class -- it is what :root already says -- so the common case does
 * nothing at all and there is no frame of the wrong theme either way.
 *
 * It has to be a blocking inline script. A React effect runs after first
 * paint, which is precisely one frame too late: someone who picked light
 * would see the dark page flash first, every single navigation.
 *
 * Nothing here can throw. Private windows and blocked site data make
 * localStorage access itself raise, so the read is wrapped and a failure
 * simply leaves the default in place.
 */

export const THEME_STORAGE_KEY = "jayree-theme";

const script = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"){document.documentElement.classList.add("light")}}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
