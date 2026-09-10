export type CompetitionStatus = "not_started" | "in_progress" | "official" | "disabled";
export type RegulationStatus = "provisional" | "official";
export type DisciplineCategory = "artistic" | "collective" | "individual";

export interface Faculty {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  logo?: string;
}

export interface ScoringProfile {
  id: string;
  label: string;
  awards: Record<string, number>;
  participation: number;
  tieAwards?: Record<string, number>;
}

export interface Placement {
  facultyId: string;
  position: number;
  tied?: boolean;
  result?: string;
}

export interface AthleticsEvent {
  id: string;
  name: string;
  branch: string;
  status: CompetitionStatus;
  placements: Placement[];
}

export interface Discipline {
  id: string;
  name: string;
  category: DisciplineCategory;
  branch?: string;
  mode?: string;
  status: CompetitionStatus;
  profileId: string;
  format: "ranked" | "athletics";
  placements?: Placement[];
  athleticsEvents?: AthleticsEvent[];
  finalPlacements?: Placement[];
  note?: string;
}

export interface DisciplineGroup {
  id: string;
  name: string;
  description: string;
  disciplines: Discipline[];
}

export interface Adjustment {
  id: string;
  facultyId: string;
  points: number;
  reason: string;
  reference: string;
  status: "official";
}

export interface TieBreaker {
  type: "placement_count" | "opening_points";
  category?: DisciplineCategory;
  position?: number;
  sourceDisciplineIds?: string[];
}

export interface EditionData {
  edition: {
    year: number;
    label: string;
    status: "reference" | "active" | "completed";
    isDemo: boolean;
    lastUpdated: string;
  };
  regulation: {
    referenceYear: number;
    status: RegulationStatus;
    sourceLabel: string;
    generalTieBreakers: TieBreaker[];
  };
  faculties: Faculty[];
  scoringProfiles: ScoringProfile[];
  groups: DisciplineGroup[];
  adjustments: Adjustment[];
}

export interface RankedFaculty {
  faculty: Faculty;
  basePoints: number;
  adjustmentPoints: number;
  netPoints: number;
  position: number;
  isTied: boolean;
}

export interface AwardedPlacement {
  faculty: Faculty;
  position: number;
  points: number;
  result?: string;
  isTied: boolean;
}
