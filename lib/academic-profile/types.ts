/** Private self-reported academic context, separate from public RAG evidence. */
export type Term = {
  season: 'Fall' | 'Spring' | 'Summer';
  year: number;
};
export type CourseAttempt = {
  code: string;
  title: string;
  credits: number;
  term: Term;
  status: 'completed' | 'in-progress' | 'failed' | 'withdrawn' | 'transfer-pending';
  grade: string | null;
  repeated: boolean;
  blockId: string | null;
  disposition: 'applied' | 'fall-through' | 'insufficient';
  transferAccepted?: boolean;
};
export type RequirementBlock = {
  id: string;
  title: string;
  requiredCredits: number;
  courseCodes: string[];
  children?: RequirementBlock[];
};
export type AcademicProfile = {
  schemaVersion: 1;
  degree: 'Bachelor' | 'Master' | 'PhD';
  level: 'UG' | 'PG';
  displayName: string;
  classification: string;
  studentStatus: string;
  holds: string[];
  program: string;
  college: string;
  minors: string[];
  track: string | null;
  admitTerm: Term;
  catalogYear: string;
  currentTerm: Term;
  modelPosition: {
    year: number;
    semester: 1 | 2;
  };
  academicStanding: 'good' | 'probation' | 'unknown';
  overallGpa: number | null;
  requiredCredits: number;
  blocks: RequirementBlock[];
  courses: CourseAttempt[];
  planner: {
    term: Term;
    courseCodes: string[];
    status: 'proposed' | 'confirmed-by-student';
  }[];
  provenance: {
    kind: 'self-reported' | 'fictional-tester';
    updatedAt: string;
    sourceUrls: string[];
  };
};
export type PlanCourse = {
  code: string | null;
  options: string[];
  title: string;
  credits: number;
  type: string;
  elective: boolean;
  catalogUrl: string | null;
  catalogVerified: boolean;
  optionCatalogs?: {
    code: string;
    url: string;
  }[];
};
export type StudyPlan = {
  id: string;
  track?: string | null;
  program: string;
  cohortStart: number;
  cohortOnwards?: boolean;
  catalogYear: string;
  entrySeason: 'Fall' | 'Spring';
  totalCredits: number;
  sourceUrl: string;
  sourceSha256: string;
  sourceFetchedAt: string;
  page: number;
  validation: {
    totalsPass: boolean;
    issues: string[];
    unlinkedCourseCodes: string[];
    allCatalogLinksVerified: boolean;
  };
  terms: {
    ordinal: number;
    year: number;
    semester: number;
    season: string | null;
    printedCredits: number;
    computedCredits: number;
    courses: PlanCourse[];
  }[];
};
