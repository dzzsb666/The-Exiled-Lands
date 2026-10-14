export interface Category {
  id: number;
  groupId: number;
  title: string;
  name: string | null;
  icon: string;
  color: string;
  count: number;
}
export interface Group {
  id: number;
  title: string;
  name: string;
  color: string;
}
export interface Point {
  id: number;
  categoryId: number;
  title: string;
  name: string | null;
  x: number;
  y: number;
  translationSource: string | null;
  note: string | null;
}
export interface MapData {
  version: number;
  snapshotDate: string;
  source: string;
  groups: Group[];
  categories: Category[];
  points: Point[];
}
export interface PersonalPin {
  id: string;
  x: number;
  y: number;
  name: string;
  note: string;
}
export interface Progress {
  version: 1;
  found: number[];
  notes: Record<string, string>;
  pins: PersonalPin[];
}
