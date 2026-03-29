import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CustomList, MovieLog } from '../types';

interface UseCustomListsOptions {
  movieLogs: MovieLog[];
  customLists: CustomList[];
  onCreateList: (name: string, description: string) => void;
}

interface FormErrors {
  name?: string;
  description?: string;
}

function validateListForm(name: string, description: string): FormErrors {
  const errors: FormErrors = {};

  const trimmedName = name.trim();
  if (!trimmedName) {
    errors.name = 'List name is required';
  } else if (trimmedName.length > 100) {
    errors.name = 'List name must be less than 100 characters';
  }

  if (description && description.length > 500) {
    errors.description = 'Description must be less than 500 characters';
  }

  return errors;
}

export function useCustomLists({ movieLogs, customLists, onCreateList }: UseCustomListsOptions) {
  const navigate = useNavigate();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = validateListForm(newListName, newListDescription);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    onCreateList(newListName.trim(), newListDescription.trim());
    setNewListName('');
    setNewListDescription('');
    setShowCreateForm(false);
    setErrors({});
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
      setErrors({});
    },
    handleCreateList,
    toggleViewList: (listId: string) => {
      setSelectedListId((current) => (current === listId ? null : listId));
    },
    goBackToDiary: () => navigate('/diary'),
    errors,
  };
}
