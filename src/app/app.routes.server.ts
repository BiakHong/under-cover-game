import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender // ✅ Prerender homepage if needed
  },
  {
    path: 'lobby/:roomCode',
    renderMode: RenderMode.Server // ✅ Use correct Ssr for dynamic route
  },
  {
    path: 'game/:roomCode',
    renderMode: RenderMode.Server // ✅ Correct usage for game route
  },
  {
    path: '**',
    renderMode: RenderMode.Server // ✅ Correct usage for wildcard route
  }
];

