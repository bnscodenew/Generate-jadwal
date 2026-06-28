import { CalendarScheduler } from './scheduler';

const ctx: Worker = self as any;

ctx.onmessage = function (e: MessageEvent) {
  const {
    guru,
    mapel,
    kelas,
    ruangan,
    jamPelajaran,
    pengampu,
    preferensi,
    hariAktif,
    batasJamHari,
    algorithm,
    isPro
  } = e.data;

  try {
    const solver = new CalendarScheduler(
      guru,
      mapel,
      kelas,
      ruangan,
      jamPelajaran,
      pengampu,
      preferensi,
      hariAktif,
      batasJamHari
    );

    // Helper to send progress logs back to the main thread
    const callback = (msg: string, percent?: number) => {
      ctx.postMessage({ type: 'progress', message: msg, percent });
    };

    let result;
    if (algorithm === 'csp') {
      result = solver.solveCSP(callback);
    } else {
      result = solver.solveGenetic(callback, isPro);
    }

    ctx.postMessage({ type: 'success', result });
  } catch (err: any) {
    ctx.postMessage({ type: 'error', error: err.message || String(err) });
  }
};
