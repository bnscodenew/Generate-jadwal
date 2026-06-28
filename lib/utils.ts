import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitialGuru(nama: string): string {
  if (!nama) return '??';
  
  // Bersihkan gelar akademik umum (prefix & suffix) di Indonesia
  let cleanName = nama
    .replace(/\b(Drs|Dr|Ir|H|Hj|Pdt|Bpk|Ibu|S\.Pd|M\.Pd|S\.T|S\.Kom|M\.Kom|S\.E|M\.E|S\.Si|M\.Si|LcA|LcB|Prof|K\.H|KH)\b\.?/gi, '')
    .replace(/,\s*(S\.Pd|M\.Pd|S\.T|S\.Kom|M\.Kom|S\.E|M\.E|S\.Si|M\.Si|Lc|Prof|K\.H|A\.Md|S\.Ag|M\.Ag|M\.A|Ph\.D|B\.Sc|M\.Sc)\.?/gi, '')
    .trim();

  // Jika nama menjadi kosong karena pembersihan, gunakan nama asli
  if (!cleanName) cleanName = nama;

  // Split kata dalam nama
  const words = cleanName.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return '??';

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  // Ambil huruf pertama kata pertama dan kata kedua
  const first = words[0][0];
  const second = words[1][0];
  return (first + second).toUpperCase();
}
