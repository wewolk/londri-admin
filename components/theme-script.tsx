// Inline script to prevent FOUC — runs before React hydration
export default function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function(){
  var t = localStorage.getItem('londri_theme') || 'system';
  var d = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme:dark)').matches);
  if(d) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
})();`,
      }}
    />
  );
}
