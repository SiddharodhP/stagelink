import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MusicianCardData } from '@/types/database';

interface SavedStore {
  savedArtists: MusicianCardData[];
  toggleSaveArtist: (artist: MusicianCardData) => void;
  isSaved: (artistId: string) => boolean;
}

export const useSavedStore = create<SavedStore>()(
  persist(
    (set, get) => ({
      savedArtists: [],
      toggleSaveArtist: (artist) => {
        const { savedArtists } = get();
        const exists = savedArtists.find(a => a.id === artist.id);
        if (exists) {
          set({ savedArtists: savedArtists.filter(a => a.id !== artist.id) });
        } else {
          set({ savedArtists: [...savedArtists, artist] });
        }
      },
      isSaved: (artistId) => {
        return get().savedArtists.some(a => a.id === artistId);
      }
    }),
    {
      name: 'saved-artists-storage',
    }
  )
);
