import { create } from 'zustand';
import { FilterState } from '@/types/database';

interface FilterStore extends FilterState {
  setSearch: (search: string) => void;
  setCity: (city: string) => void;
  setGenres: (genres: string[]) => void;
  toggleGenre: (genre: string) => void;
  setBudgetRange: (min: number, max: number) => void;
  setTeamSize: (teamSize: string) => void;
  setLanguages: (languages: string[]) => void;
  toggleLanguage: (language: string) => void;
  setSortBy: (sortBy: FilterState['sortBy']) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
}

const initialState: FilterState = {
  search: '',
  city: '',
  genres: [],
  budgetMin: 0,
  budgetMax: Infinity,
  teamSize: '',
  languages: [],
  sortBy: 'rating',
  page: 1,
};

export const useFilterStore = create<FilterStore>((set) => ({
  ...initialState,
  setSearch: (search) => set({ search, page: 1 }),
  setCity: (city) => set({ city, page: 1 }),
  setGenres: (genres) => set({ genres, page: 1 }),
  toggleGenre: (genre) =>
    set((state) => ({
      genres: state.genres.includes(genre)
        ? state.genres.filter((g) => g !== genre)
        : [...state.genres, genre],
      page: 1,
    })),
  setBudgetRange: (budgetMin, budgetMax) => set({ budgetMin, budgetMax, page: 1 }),
  setTeamSize: (teamSize) => set({ teamSize, page: 1 }),
  setLanguages: (languages) => set({ languages, page: 1 }),
  toggleLanguage: (language) =>
    set((state) => ({
      languages: state.languages.includes(language)
        ? state.languages.filter((l) => l !== language)
        : [...state.languages, language],
      page: 1,
    })),
  setSortBy: (sortBy) => set({ sortBy, page: 1 }),
  setPage: (page) => set({ page }),
  resetFilters: () => set(initialState),
}));
