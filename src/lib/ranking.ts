import type {
  AwardedPlacement,
  Discipline,
  DisciplineCategory,
  EditionData,
  Faculty,
  Placement,
  RankedFaculty,
  ScoringProfile,
  TieBreaker,
} from "../types/edition";

const byName = (left: Faculty, right: Faculty) => left.name.localeCompare(right.name, "es");

export function getProfile(edition: EditionData, profileId: string): ScoringProfile {
  const profile = edition.scoringProfiles.find((candidate) => candidate.id === profileId);
  if (!profile) throw new Error(`Perfil de puntuación inexistente: ${profileId}`);
  return profile;
}

export function pointsForPlacement(placement: Placement, profile: ScoringProfile): number {
  const position = String(placement.position);
  if (placement.tied && profile.tieAwards?.[position] !== undefined) return profile.tieAwards[position];
  return profile.awards[position] ?? profile.participation;
}

function facultyFor(edition: EditionData, facultyId: string): Faculty {
  const faculty = edition.faculties.find((candidate) => candidate.id === facultyId);
  if (!faculty) throw new Error(`Facultad inexistente: ${facultyId}`);
  return faculty;
}

export function createAwardedPlacements(
  edition: EditionData,
  placements: Placement[],
  profileId: string,
): AwardedPlacement[] {
  const profile = getProfile(edition, profileId);
  return placements
    .map((placement) => ({
      faculty: facultyFor(edition, placement.facultyId),
      position: placement.position,
      points: pointsForPlacement(placement, profile),
      result: placement.result,
      isTied: placement.tied === true,
    }))
    .sort((left, right) => left.position - right.position || byName(left.faculty, right.faculty));
}

function allDisciplines(edition: EditionData): Discipline[] {
  return edition.groups.flatMap((group) => group.disciplines);
}

function officialPlacements(discipline: Discipline): Placement[] {
  if (discipline.status !== "official") return [];
  return discipline.format === "athletics"
    ? discipline.finalPlacements ?? []
    : discipline.placements ?? [];
}

function pointsByFaculty(edition: EditionData): Map<string, number> {
  const totals = new Map(edition.faculties.map((faculty) => [faculty.id, 0]));
  for (const discipline of allDisciplines(edition)) {
    for (const award of createAwardedPlacements(edition, officialPlacements(discipline), discipline.profileId)) {
      totals.set(award.faculty.id, (totals.get(award.faculty.id) ?? 0) + award.points);
    }
  }
  return totals;
}

function adjustmentByFaculty(edition: EditionData): Map<string, number> {
  const totals = new Map(edition.faculties.map((faculty) => [faculty.id, 0]));
  for (const adjustment of edition.adjustments) {
    totals.set(adjustment.facultyId, (totals.get(adjustment.facultyId) ?? 0) + adjustment.points);
  }
  return totals;
}

function placementCount(
  edition: EditionData,
  facultyId: string,
  category: DisciplineCategory | undefined,
  position: number | undefined,
): number {
  return allDisciplines(edition).reduce((count, discipline) => {
    if (discipline.category !== category) return count;
    return count + officialPlacements(discipline).filter(
      (placement) => placement.facultyId === facultyId && placement.position === position,
    ).length;
  }, 0);
}

function openingPoints(edition: EditionData, facultyId: string, sourceIds: string[] = []): number {
  return allDisciplines(edition)
    .filter((discipline) => sourceIds.includes(discipline.id))
    .flatMap((discipline) => createAwardedPlacements(edition, officialPlacements(discipline), discipline.profileId))
    .filter((award) => award.faculty.id === facultyId)
    .reduce((total, award) => total + award.points, 0);
}

function tieBreakValue(edition: EditionData, facultyId: string, rule: TieBreaker): number {
  if (rule.type === "placement_count") {
    return placementCount(edition, facultyId, rule.category, rule.position);
  }
  return openingPoints(edition, facultyId, rule.sourceDisciplineIds);
}

function sameGeneralRank(
  edition: EditionData,
  left: { faculty: Faculty; netPoints: number },
  right: { faculty: Faculty; netPoints: number },
): boolean {
  if (left.netPoints !== right.netPoints) return false;
  if (edition.edition.status !== "completed") return true;
  return edition.regulation.generalTieBreakers.every(
    (rule) => tieBreakValue(edition, left.faculty.id, rule) === tieBreakValue(edition, right.faculty.id, rule),
  );
}

export function createOverallRanking(edition: EditionData): RankedFaculty[] {
  const base = pointsByFaculty(edition);
  const adjustments = adjustmentByFaculty(edition);
  const entries = edition.faculties.map((faculty) => ({
    faculty,
    basePoints: base.get(faculty.id) ?? 0,
    adjustmentPoints: adjustments.get(faculty.id) ?? 0,
    netPoints: (base.get(faculty.id) ?? 0) + (adjustments.get(faculty.id) ?? 0),
  }));

  entries.sort((left, right) => {
    if (right.netPoints !== left.netPoints) return right.netPoints - left.netPoints;
    if (edition.edition.status === "completed") {
      for (const rule of edition.regulation.generalTieBreakers) {
        const difference = tieBreakValue(edition, right.faculty.id, rule) - tieBreakValue(edition, left.faculty.id, rule);
        if (difference !== 0) return difference;
      }
    }
    return byName(left.faculty, right.faculty);
  });

  let position = 0;
  return entries.map((entry, index) => {
    const previous = entries[index - 1];
    if (!previous || !sameGeneralRank(edition, entry, previous)) position = index + 1;
    return {
      ...entry,
      position,
      isTied: entries.some((other) => other !== entry && sameGeneralRank(edition, entry, other)),
    };
  });
}

export function createAthleticsInternalRanking(edition: EditionData, discipline: Discipline): AwardedPlacement[] {
  if (discipline.format !== "athletics") return [];
  const profile = getProfile(edition, "athletics-internal");
  const totals = new Map(edition.faculties.map((faculty) => [faculty.id, 0]));

  for (const event of discipline.athleticsEvents ?? []) {
    if (event.status !== "official") continue;
    for (const placement of event.placements) {
      totals.set(placement.facultyId, (totals.get(placement.facultyId) ?? 0) + pointsForPlacement(placement, profile));
    }
  }

  const sorted = edition.faculties
    .map((faculty) => ({ faculty, points: totals.get(faculty.id) ?? 0 }))
    .sort((left, right) => right.points - left.points || byName(left.faculty, right.faculty));
  let position = 0;
  return sorted.map((entry, index) => {
    if (index === 0 || entry.points !== sorted[index - 1].points) position = index + 1;
    return { ...entry, position, isTied: sorted.filter((candidate) => candidate.points === entry.points).length > 1 };
  });
}
