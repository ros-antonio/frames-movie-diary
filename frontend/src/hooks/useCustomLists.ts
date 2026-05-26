import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CustomList, MovieLog } from '../types';

interface UseCustomListsOptions {
  movieLogs: MovieLog[];
  customLists: CustomList[];
  onCreateList: (name: string, description: string) => void | Promise<boolean>;
  onUpdateList: (listId: string, name: string, description: string) => void | Promise<boolean>;
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

  if (description.length > 500) {
    errors.description = 'Description must be less than 500 characters';
  }

  return errors;
}

export function useCustomLists({ movieLogs, customLists, onCreateList, onUpdateList }: UseCustomListsOptions) {
  const navigate = useNavigate();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [movieSearchQuery, setMovieSearchQuery] = useState('');
  const [selectedListId, setSelectedListId] = useState<string | null>(customLists[0]?.id ?? null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingErrors, setEditingErrors] = useState<FormErrors>({});

  const visibleLists = useMemo(() => {
    const normalizedQuery = listSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return customLists;
    }

    return customLists.filter((list) => (
      list.name.toLowerCase().includes(normalizedQuery)
      || list.description.toLowerCase().includes(normalizedQuery)
    ));
  }, [customLists, listSearchQuery]);

  const selectedList = useMemo(() => {
    if (selectedListId) {
      const exactMatch = visibleLists.find((list) => list.id === selectedListId);
      if (exactMatch) {
        return exactMatch;
      }
    }

    return visibleLists[0] ?? null;
  }, [selectedListId, visibleLists]);

  const normalizedMovieQuery = movieSearchQuery.trim().toLowerCase();

  const selectedListMovies = useMemo(
    () => (selectedList
      ? movieLogs.filter((movie) => (
        selectedList.movieIds.includes(movie.id)
        && movie.movieName.toLowerCase().includes(normalizedMovieQuery)
      ))
      : []),
    [movieLogs, normalizedMovieQuery, selectedList],
  );

  const availableMovies = useMemo(
    () => (selectedList
      ? movieLogs.filter((movie) => (
        !selectedList.movieIds.includes(movie.id)
        && movie.movieName.toLowerCase().includes(normalizedMovieQuery)
      ))
      : []),
    [movieLogs, normalizedMovieQuery, selectedList],
  );

  const handleCreateList = async (event: React.FormEvent) => {
    event.preventDefault();

    const newErrors = validateListForm(newListName, newListDescription);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    await onCreateList(newListName.trim(), newListDescription.trim());
    setNewListName('');
    setNewListDescription('');
    setShowCreateForm(false);
    setErrors({});
  };

  const beginEdit = () => {
    if (!selectedList) {
      return;
    }

    setEditingListId(selectedList.id);
    setEditingName(selectedList.name);
    setEditingDescription(selectedList.description);
    setEditingErrors({});
  };

  const cancelEdit = () => {
    setEditingListId(null);
    setEditingName('');
    setEditingDescription('');
    setEditingErrors({});
  };

  const handleUpdateList = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedList) {
      return;
    }

    const newErrors = validateListForm(editingName, editingDescription);
    setEditingErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const saved = await onUpdateList(selectedList.id, editingName.trim(), editingDescription.trim());
    if (saved !== false) {
      cancelEdit();
    }
  };

  return {
    showCreateForm,
    newListName,
    newListDescription,
    listSearchQuery,
    movieSearchQuery,
    visibleLists,
    selectedList,
    selectedListMovies,
    availableMovies,
    editingListId,
    editingName,
    editingDescription,
    setNewListName,
    setNewListDescription,
    setListSearchQuery,
    setMovieSearchQuery,
    setEditingName,
    setEditingDescription,
    toggleCreateForm: () => setShowCreateForm((current) => !current),
    cancelCreateForm: () => {
      setShowCreateForm(false);
      setNewListName('');
      setNewListDescription('');
      setErrors({});
    },
    handleCreateList,
    handleUpdateList,
    selectList: (listId: string) => {
      setSelectedListId(listId);
      if (editingListId && editingListId !== listId) {
        cancelEdit();
      }
    },
    beginEdit,
    cancelEdit,
    goBackToDiary: () => navigate('/diary'),
    errors,
    editingErrors,
  };
}
