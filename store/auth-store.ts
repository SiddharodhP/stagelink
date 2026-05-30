import { create } from 'zustand';
import { User, MusicianProfile, OrganizerProfile } from '@/types/database';

interface AuthStore {
  user: User | null;
  musicianProfile: MusicianProfile | null;
  organizerProfile: OrganizerProfile | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setMusicianProfile: (profile: MusicianProfile | null) => void;
  setOrganizerProfile: (profile: OrganizerProfile | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  musicianProfile: null,
  organizerProfile: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setMusicianProfile: (musicianProfile) => set({ musicianProfile }),
  setOrganizerProfile: (organizerProfile) => set({ organizerProfile }),
  setIsLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, musicianProfile: null, organizerProfile: null, isLoading: false }),
}));
