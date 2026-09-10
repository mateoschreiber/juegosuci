import assert from "node:assert/strict";
import editionJson from "../src/data/edition.json";
import {
  createAthleticsInternalRanking,
  createOverallRanking,
  getProfile,
  pointsForPlacement,
} from "../src/lib/ranking";
import type { EditionData } from "../src/types/edition";

const edition = structuredClone(editionJson) as EditionData;
const caravana = getProfile(edition, "caravana");
assert.equal(pointsForPlacement({ facultyId: "ingenieria", position: 1 }, caravana), 50);
assert.equal(pointsForPlacement({ facultyId: "ingenieria", position: 1, tied: true }, caravana), 45);
assert.equal(pointsForPlacement({ facultyId: "ingenieria", position: 4 }, caravana), 15);

const major = getProfile(edition, "major");
assert.equal(pointsForPlacement({ facultyId: "ingenieria", position: 1, tied: true }, major), 90);
assert.equal(pointsForPlacement({ facultyId: "ingenieria", position: 2, tied: true }, major), 60);
assert.equal(pointsForPlacement({ facultyId: "ingenieria", position: 3 }, major), 50);

const initial = createOverallRanking(edition);
assert.equal(initial.find((entry) => entry.faculty.id === "medicina")?.netPoints, 150);
assert.equal(initial.find((entry) => entry.faculty.id === "ingenieria")?.netPoints, 130);
assert.equal(initial.find((entry) => entry.faculty.id === "derecho")?.position, 3);
assert.equal(initial.find((entry) => entry.faculty.id === "economia")?.position, 3);

const athletics = edition.groups.flatMap((group) => group.disciplines).find((discipline) => discipline.id === "atletismo");
assert.ok(athletics);
assert.equal(createAthleticsInternalRanking(edition, athletics)[0].faculty.id, "medicina");
assert.equal(createOverallRanking(edition).find((entry) => entry.faculty.id === "medicina")?.basePoints, 150);

const completed = structuredClone(edition);
const completedAthletics = completed.groups.flatMap((group) => group.disciplines).find((discipline) => discipline.id === "atletismo");
assert.ok(completedAthletics);
completedAthletics.status = "official";
completedAthletics.finalPlacements = [
  { facultyId: "ingenieria", position: 1 },
  { facultyId: "medicina", position: 2 },
  { facultyId: "economia", position: 3 },
  { facultyId: "derecho", position: 4 },
  { facultyId: "arquitectura", position: 4 },
  { facultyId: "politecnica", position: 4 }
];
assert.equal(createOverallRanking(completed).find((entry) => entry.faculty.id === "ingenieria")?.basePoints, 230);

const adjusted = structuredClone(edition);
adjusted.adjustments.push({ id: "test-adjustment", facultyId: "ingenieria", points: -50, reason: "Prueba", reference: "Artículo 81", status: "official" });
assert.equal(createOverallRanking(adjusted).find((entry) => entry.faculty.id === "ingenieria")?.netPoints, 80);

console.log("Pruebas de puntuación aprobadas.");
