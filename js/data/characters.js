/**
 * Base de datos local de respaldo para personajes (vacía o mínima para tirar de Supabase)
 */
const AC_BASE = {
  "aihoshino": { "id": "aihoshino", "name": "Ai Hoshino", "anime": "Oshi no Ko", "file": "ai-hoshino.png" },
  "mai": { "id": "mai", "name": "Mai Sakurajima", "anime": "Rascal Does Not Dream of Bunny Girl Senpai", "file": "mai.png" }
};

const DT = [
  { "id": "t0", "label": "The Only Number One Waifu", "color": "#ff4757", "chars": ["ai-hoshino"] },
  { "id": "t1", "label": "S - Perfection", "color": "#ff6b35", "chars": ["mai"] }
];

const DP = ["aihoshino", "mai"];

// Copia editable en tiempo de ejecución
let AC = JSON.parse(JSON.stringify(AC_BASE));