export type CategoryStatus = "pending" | "in_progress" | "completed";

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  logo?: string;
}

export interface Score {
  teamId: string;
  points: number;
}

export interface EditorialResult {
  id: string;
  title: string;
  summary: string;
  date?: string;
  teamIds?: string[];
}

export interface Category {
  id: string;
  name: string;
  status: CategoryStatus;
  scores: Score[];
  results: EditorialResult[];
}

export interface GamesData {
  lastUpdated: string;
  rankingRules: {
    overall: string[];
    categories: string[];
  };
  teams: Team[];
  categories: Category[];
}

export interface RankedTeam {
  team: Team;
  points: number;
  position: number;
  isTied: boolean;
}
