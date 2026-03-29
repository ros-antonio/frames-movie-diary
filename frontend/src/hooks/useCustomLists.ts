import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CustomList, MovieLog } from '../types';

interface UseCustomListsOptions {
  movieLogs: MovieLog[];
  customLists: CustomList[];
  onCreateList: (name: string, description: string) => void;
}

export function useCustomLists({ movieLogs, customLists, onCreateList }: UseCustomListsOptions) {
  const navigate = useNavigate();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListName.trim()) {
      onCreateList(newListName, newListDescription);
      setNewListName('');
      setNewListDescription('');
      setShowCreateForm(false);
    }
  };

  const selectedList = useMemo(
    () => (selectedListId ? customLists.find((list) => list.id === selectedListId) ?? null : null),
    [customLists, selectedListId],
  );

  const selectedListMovies = useMemo(
    () => (selectedList ? movieLogs.filter((movie) => selectedList.movieIds.includes(movie.id)) : []),
    [movieLogs, selectedList],
  );

  const availableMovies = useMemo(
    () => (selectedList ? movieLogs.filter((movie) => !selectedList.movieIds.includes(movie.id)) : []),
    [movieLogs, selectedList],
  );

  return {
    showCreateForm,
    newListName,
    newListDescription,
    selectedList,
    selectedListMovies,
    availableMovies,
    setNewListName,
    setNewListDescription,
    toggleCreateForm: () => setShowCreateForm((current) => !current),
    cancelCreateForm: () => {
      setShowCreateForm(false);
      setNewListName('');
      setNewListDescription('');
    },
    handleCreateList,
    toggleViewList: (listId: string) => {
      setSelectedListId((current) => (current === listId ? null : listId));
    },
    goBackToDiary: () => navigate('/diary'),
  };
}
