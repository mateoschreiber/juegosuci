import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(root, "src", "data", "edition.json");
const statusValues = new Set(["not_started", "in_progress", "official", "disabled"]);
const colorPattern = /^#[0-9A-Fa-f]{6}$/;
const isoWithOffset = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;
const errors = [];
const fail = (message) => errors.push(message);

const uniqueIds = (items, label) => {
  const ids = new Set();
  for (const item of items ?? []) {
    if (!item?.id || typeof item.id !== "string") fail(`${label}: cada elemento requiere un id de texto.`);
    else if (ids.has(item.id)) fail(`${label}: id duplicado "${item.id}".`);
    else ids.add(item.id);
  }
  return ids;
};

const validatePlacements = (placements, label, facultyIds) => {
  const entered = new Set();
  const byPosition = new Map();
  if (!Array.isArray(placements)) return fail(`${label}: placements debe ser un arreglo.`);
  for (const placement of placements) {
    if (!facultyIds.has(placement.facultyId)) fail(`${label}: facultad inexistente "${placement.facultyId}".`);
    if (entered.has(placement.facultyId)) fail(`${label}: facultad repetida "${placement.facultyId}".`);
    entered.add(placement.facultyId);
    if (!Number.isInteger(placement.position) || placement.position < 1) fail(`${label}: position debe ser un entero positivo.`);
    const samePosition = byPosition.get(placement.position) ?? [];
    samePosition.push(placement);
    byPosition.set(placement.position, samePosition);
  }
  for (const [position, entries] of byPosition) {
    if (position <= 3 && entries.length > 1 && !entries.every((entry) => entry.tied === true)) {
      fail(`${label}: las posiciones 1 a 3 repetidas requieren tied: true.`);
    }
  }
};

let edition;
try {
  edition = JSON.parse(await readFile(dataPath, "utf8"));
} catch (error) {
  console.error(`No se pudo leer src/data/edition.json: ${error.message}`);
  process.exit(1);
}

if (!isoWithOffset.test(edition.edition?.lastUpdated ?? "") || Number.isNaN(Date.parse(edition.edition.lastUpdated))) fail("edition.lastUpdated debe ser ISO 8601 válido con zona horaria.");
if (!["reference", "active", "completed"].includes(edition.edition?.status)) fail("edition.status no válido.");
if (!["provisional", "official"].includes(edition.regulation?.status)) fail("regulation.status no válido.");
if (!Array.isArray(edition.regulation?.generalTieBreakers)) fail("regulation.generalTieBreakers debe ser un arreglo.");

const facultyIds = uniqueIds(edition.faculties, "faculties");
for (const faculty of edition.faculties ?? []) {
  if (!faculty.name || !faculty.abbreviation) fail(`faculties.${faculty?.id ?? "?"}: name y abbreviation son obligatorios.`);
  if (!colorPattern.test(faculty.color ?? "")) fail(`faculties.${faculty?.id ?? "?"}: color debe usar #RRGGBB.`);
  if (faculty.logo) {
    if (!faculty.logo.startsWith("/assets/teams/")) fail(`faculties.${faculty.id}: logo debe vivir en /assets/teams/.`);
    else { try { await access(path.join(root, "public", faculty.logo.slice(1)), constants.R_OK); } catch { fail(`faculties.${faculty.id}: logo inexistente.`); } }
  }
}

const profileIds = uniqueIds(edition.scoringProfiles, "scoringProfiles");
for (const profile of edition.scoringProfiles ?? []) {
  for (const key of ["1", "2", "3"]) if (typeof profile.awards?.[key] !== "number" || profile.awards[key] < 0) fail(`scoringProfiles.${profile.id}: falta premio para posición ${key}.`);
  if (typeof profile.participation !== "number" || profile.participation < 0) fail(`scoringProfiles.${profile.id}: participation inválido.`);
}

uniqueIds(edition.groups, "groups");
const disciplineIds = new Set();
for (const group of edition.groups ?? []) {
  for (const discipline of group.disciplines ?? []) {
    if (!discipline.id || disciplineIds.has(discipline.id)) fail(`disciplines: id duplicado o ausente "${discipline.id ?? "?"}".`);
    disciplineIds.add(discipline.id);
    if (!profileIds.has(discipline.profileId)) fail(`disciplines.${discipline.id}: profileId inexistente.`);
    if (!statusValues.has(discipline.status)) fail(`disciplines.${discipline.id}: status inválido.`);
    if (!["ranked", "athletics"].includes(discipline.format)) fail(`disciplines.${discipline.id}: format inválido.`);
    if (discipline.format === "ranked") validatePlacements(discipline.placements, `disciplines.${discipline.id}`, facultyIds);
    if (discipline.format === "athletics") {
      if (!Array.isArray(discipline.athleticsEvents)) fail(`disciplines.${discipline.id}: athleticsEvents requerido.`);
      uniqueIds(discipline.athleticsEvents, `disciplines.${discipline.id}.athleticsEvents`);
      for (const event of discipline.athleticsEvents ?? []) {
        if (!statusValues.has(event.status)) fail(`athleticsEvents.${event.id}: status inválido.`);
        validatePlacements(event.placements, `athleticsEvents.${event.id}`, facultyIds);
      }
      validatePlacements(discipline.finalPlacements, `disciplines.${discipline.id}.finalPlacements`, facultyIds);
      if (discipline.status === "official" && discipline.finalPlacements.length === 0) fail(`disciplines.${discipline.id}: el cierre oficial requiere finalPlacements.`);
    }
  }
}

uniqueIds(edition.adjustments, "adjustments");
for (const adjustment of edition.adjustments ?? []) {
  if (!facultyIds.has(adjustment.facultyId)) fail(`adjustments.${adjustment.id}: facultad inexistente.`);
  if (typeof adjustment.points !== "number" || adjustment.points >= 0) fail(`adjustments.${adjustment.id}: points debe ser negativo.`);
  if (!adjustment.reason || !adjustment.reference) fail(`adjustments.${adjustment.id}: reason y reference son obligatorios.`);
  if (adjustment.status !== "official") fail(`adjustments.${adjustment.id}: solo se admiten ajustes oficiales.`);
}

if (errors.length > 0) {
  console.error("Validación de edición fallida:\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log("Edición de Juegos UCI válida.");
