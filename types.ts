
export interface Character {
  id: string;
  image: string | null;
  prompt: string;
  style: string;
  selected: boolean;
  isLoading: boolean;
}

export interface Background {
  image: string | null;
  prompt: string;
  useAsReference: boolean;
  isLoading: boolean;
}

export interface GeneratedImage {
  id: string;
  src: string;
}

export type LoadingStates = {
  characters: { [key: string]: boolean };
  background: boolean;
  final: boolean;
};
