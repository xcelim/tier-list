/**
 * Configuración global, credenciales y constantes del sistema
 */
const SB_URL = 'https://texqcwfxzoeghyrcqwob.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRleHFjd2Z4em9lZ2h5cmNxd29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTQzMjEsImV4cCI6MjA5NjMzMDMyMX0.4zt5T9bY96o5yzLpVtl724tlghSrKE2CxBBnlVVlR9Q';
const BUCKET_BASE = 'https://texqcwfxzoeghyrcqwob.supabase.co/storage/v1/object/public/tierlists/';

const DEFAULT_TIERS = [
  { id: 't1', label: 'The Only Number One Waifu', color: '#ff4757', chars: [] },
  { id: 't2', label: 'S - Perfection', color: '#ff6b35', chars: [] },
  { id: 't3', label: 'A - Hot', color: '#ffd32a', chars: [] },
  { id: 't4', label: 'B - Decent', color: '#2ed573', chars: [] },
  { id: 't5', label: 'C - Just Alright', color: '#1e90ff', chars: [] }
];

const ALIASES = {
  "yofukashi no uta": "Call of the Night", "yofukashi": "Call of the Night",
  "shingeki no kyojin": "Attack on Titan", "aot": "Attack on Titan", "attack on titan": "Attack on Titan",
  "kimetsu no yaiba": "Demon Slayer", "kimetsu": "Demon Slayer", "demon slayer": "Demon Slayer",
  "jujutsu kaisen": "Jujutsu Kaisen", "jjk": "Jujutsu Kaisen",
  "boku no hero academia": "My Hero Academia", "bnha": "My Hero Academia", "mha": "My Hero Academia",
  "re zero": "Re:Zero", "rezero": "Re:Zero", "re:zero": "Re:Zero",
  "chainsaw man": "Chainsaw Man", "chainsaw": "Chainsaw Man",
  "sword art online": "Sword Art Online", "sao": "Sword Art Online",
  "naruto": "Naruto", "one piece": "One Piece", "bleach": "Bleach", "fairy tail": "Fairy Tail"
};