const SB_URL = 'https://texqcwfxzoeghyrcqwob.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRleHFjd2Z4em9lZ2h5cmNxd29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTQzMjEsImV4cCI6MjA5NjMzMDMyMX0.4zt5T9bY96o5yzLpVtl724tlghSrKE2CxBBnlVVlR9Q';
const BUCKET_BASE = 'https://texqcwfxzoeghyrcqwob.supabase.co/storage/v1/object/public/tierlists/';

// Valores por defecto para nuevas tierlists
const DEFAULT_TIERS = [
  { id: 't1', label: 'S', color: '#ff4757', chars: [] },
  { id: 't2', label: 'A', color: '#ffa502', chars: [] },
  { id: 't3', label: 'B', color: '#2ed573', chars: [] },
  { id: 't4', label: 'C', color: '#1e90ff', chars: [] },
  { id: 't5', label: 'D', color: '#a29bfe', chars: [] }
];

const ALIASES = {
    "yofukashi no uta": "Call of the Night",
    "shingeki no kyojin": "Attack on Titan",
    "aot": "Attack on Titan",
    "kimetsu no yaiba": "Demon Slayer",
    "jjk": "Jujutsu Kaisen",
    "bnha": "My Hero Academia",
    "mha": "My Hero Academia",
    "re zero": "Re:Zero",
    "fma": "Fullmetal Alchemist",
    "opm": "One-Punch Man",
    "tensura": "That Time I Got Reincarnated as a Slime",
    "sao": "Sword Art Online",
    "ditf": "Darling in the FranXX",
    "nge": "Neon Genesis Evangelion",
    "cote": "Classroom of the Elite",
    "hxh": "Hunter x Hunter",
    "oshinoko": "Oshi no Ko"
};
