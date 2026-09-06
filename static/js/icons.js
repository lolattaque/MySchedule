/* Minimal hand-rolled icon set (Feather-style strokes) shared by every page. */
window.ICONS = {
  'calendar-clock':'<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="17" cy="17" r="5"/><path d="M17 15.5V17l1 1"/>',
  'clock-4':'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  'moon':'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  'plus':'<path d="M12 5v14M5 12h14"/>',
  'list-checks':'<path d="m3 7 2 2 4-4M3 15l2 2 4-4"/><path d="M11 7h10M11 15h10"/>',
  'notebook-pen':'<path d="M4 6a2 2 0 0 1 2-2h11.5a.5.5 0 0 1 .5.5v14a.5.5 0 0 1-.5.5H6a2 2 0 0 1-2-2Z"/><path d="M8 4v18M15.5 9.5 18 12l-1.2 3.5L13 16.5l.3-3.4Z"/>',
  'database':'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  'download':'<path d="M12 3v13m0 0-4-4m4 4 4-4"/><path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/>',
  'upload':'<path d="M12 21V8m0 0-4 4m4-4 4 4"/><path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/>',
  'trash-2':'<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/><path d="M10 11v6M14 11v6"/>',
  'x':'<path d="M18 6 6 18M6 6l12 12"/>',
  'check':'<path d="M20 6 9 17l-5-5"/>',
  'graduation-cap':'<path d="m22 10-10-5L2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5"/><path d="M22 10v6"/>',
  'dumbbell':'<path d="m6.5 6.5 11 11"/><path d="m21 21-1.5-1.5M3 3l1.5 1.5M18.5 3l-3 3 3 3 3-3-3-3ZM5.5 15l-3 3 3 3 3-3-3-3Z"/><path d="m15.5 5.5-1 1M8.5 17.5l-1 1"/>',
  'sparkles':'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"/>',
  'edit':'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  'chevron-left':'<path d="m15 18-6-6 6-6"/>',
  'chevron-right':'<path d="m9 18 6-6-6-6"/>',
  'log-out':'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  'refresh-ccw':'<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M8 16H3v5"/>'
};

window.icon = function(name, size){
  size = size || 16;
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(window.ICONS[name]||'')+'</svg>';
};

window.paintIcons = function(root){
  (root||document).querySelectorAll('[data-icon]').forEach(function(el){
    el.innerHTML = window.icon(el.getAttribute('data-icon'), el.getAttribute('data-size')||16);
  });
};

document.addEventListener('DOMContentLoaded', function(){ window.paintIcons(); });
