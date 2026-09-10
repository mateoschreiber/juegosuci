import type { Category, GamesData, RankedTeam, Team } from "../types/games";

const alphabetically = (left: Team, right: Team) =>
  left.name.localeCompare(right.name, "es");

function assignPositions(entries: Array<{ team: Team; points: number }>): RankedTeam[] {
  const sorted = [...entries].sort(
    (left, right) => right.points - left.points || alphabetically(left.team, right.team),
  );
  const countsByPoints = new Map<number, number>();

  for (const entry of sorted) {
    countsByPoints.set(entry.points, (countsByPoints.get(entry.points) ?? 0) + 1);
  }

  let previousPoints: number | undefined;
  let position = 0;

  return sorted.map((entry, index) => {
    if (entry.points !== previousPoints) {
      position = index + 1;
      previousPoints = entry.points;
    }

    return {
      ...entry,
      position,
      isTied: (countsByPoints.get(entry.points) ?? 0) > 1,
    };
  });
}

export function createOverallRanking(games: GamesData): RankedTeam[] {
  const totals = new Map(games.teams.map((team) => [team.id, 0]));

  for (const category of games.categories) {
    for (const score of category.scores) {
      totals.set(score.teamId, (totals.get(score.teamId) ?? 0) + score.points);
    }
  }

  return assignPositions(
    games.teams.map((team) => ({ team, points: totals.get(team.id) ?? 0 })),
  );
}

export function createCategoryRanking(category: Category, teams: Team[]): RankedTeam[] {
  const scoreByTeam = new Map(category.scores.map((score) => [score.teamId, score.points]));

  return assignPositions(
    teams.map((team) => ({ team, points: scoreByTeam.get(team.id) ?? 0 })),
  );
}

export function hasPublishedScores(category: Category): boolean {
  return category.scores.length > 0;
}
