import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(root, "src", "data", "games.json");
const allowedStatuses = new Set(["pending", "in_progress", "completed"]);
const colorPattern = /^#[0-9A-Fa-f]{6}$/;
const isoWithOffset = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;

const errors = [];
const fail = (message) => errors.push(message);
const uniqueIds = (items, label) => {
  const ids = new Set();
  for (const item of items) {
    if (!item?.id || typeof item.id !== "string") fail(`${label}: cada elemento requiere un id de texto.`);
    else if (ids.has(item.id)) fail(`${label}: id duplicado "${item.id}".`);
    else ids.add(item.id);
  }
  return ids;
};

let games;
try {
  games = JSON.parse(await readFile(dataPath, "utf8"));
} catch (error) {
  console.error(`No se pudo leer src/data/games.json: ${error.message}`);
  process.exit(1);
}

if (!isoWithOffset.test(games.lastUpdated ?? "") || Number.isNaN(Date.parse(games.lastUpdated))) {
  fail("lastUpdated debe ser una fecha ISO 8601 válida con zona horaria, por ejemplo 2026-09-10T18:42:00-03:00.");
}

if (!games.rankingRules || !Array.isArray(games.rankingRules.overall) || !Array.isArray(games.rankingRules.categories)) {
  fail("rankingRules debe incluir los arreglos overall y categories.");
}

if (!Array.isArray(games.teams) || games.teams.length === 0) {
  fail("teams debe contener al menos una facultad.");
}
const teamIds = uniqueIds(games.teams ?? [], "teams");

for (const team of games.teams ?? []) {
  if (!team.name || !team.abbreviation) fail(`teams.${team?.id ?? "?"}: name y abbreviation son obligatorios.`);
  if (!colorPattern.test(team.color ?? "")) fail(`teams.${team?.id ?? "?"}: color debe ser hexadecimal #RRGGBB.`);
  if (team.logo) {
    if (typeof team.logo !== "string" || !team.logo.startsWith("/assets/teams/")) {
      fail(`teams.${team.id}: logo debe ser una ruta local dentro de /assets/teams/.`);
    } else {
      const logoPath = path.join(root, "public", team.logo.replace(/^\//, ""));
      try { await access(logoPath, constants.R_OK); } catch { fail(`teams.${team.id}: no existe el logo ${team.logo}.`); }
    }
  }
}

if (!Array.isArray(games.categories) || games.categories.length === 0) {
  fail("categories debe contener al menos una categoría.");
}
uniqueIds(games.categories ?? [], "categories");
const resultIds = new Set();

for (const category of games.categories ?? []) {
  if (!category.name) fail(`categories.${category?.id ?? "?"}: name es obligatorio.`);
  if (!allowedStatuses.has(category.status)) fail(`categories.${category?.id ?? "?"}: status no válido.`);
  if (!Array.isArray(category.scores)) fail(`categories.${category?.id ?? "?"}: scores debe ser un arreglo.`);
  if (!Array.isArray(category.results)) fail(`categories.${category?.id ?? "?"}: results debe ser un arreglo.`);

  const scoredTeams = new Set();
  for (const score of category.scores ?? []) {
    if (!teamIds.has(score.teamId)) fail(`categories.${category.id}: score referencia facultad inexistente "${score.teamId}".`);
    if (scoredTeams.has(score.teamId)) fail(`categories.${category.id}: puntaje duplicado para "${score.teamId}".`);
    scoredTeams.add(score.teamId);
    if (typeof score.points !== "number" || !Number.isFinite(score.points) || score.points < 0) {
      fail(`categories.${category.id}: points para "${score.teamId}" debe ser un número no negativo.`);
    }
  }

  for (const result of category.results ?? []) {
    if (!result?.id || typeof result.id !== "string") fail(`categories.${category.id}: cada resultado requiere id.`);
    else if (resultIds.has(result.id)) fail(`results: id duplicado "${result.id}".`);
    else resultIds.add(result.id);
    if (!result?.title || !result?.summary) fail(`results.${result?.id ?? "?"}: title y summary son obligatorios.`);
    if (result.date && (!isoWithOffset.test(result.date) || Number.isNaN(Date.parse(result.date)))) {
      fail(`results.${result.id}: date debe usar ISO 8601 con zona horaria.`);
    }
    if (result.teamIds && !Array.isArray(result.teamIds)) fail(`results.${result.id}: teamIds debe ser un arreglo.`);
    for (const teamId of result.teamIds ?? []) {
      if (!teamIds.has(teamId)) fail(`results.${result.id}: referencia facultad inexistente "${teamId}".`);
    }
  }
}

if (errors.length > 0) {
  console.error("Validación de datos fallida:\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log("Datos de Juegos UCI válidos.");
