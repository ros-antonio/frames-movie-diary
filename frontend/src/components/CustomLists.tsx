import { ArrowLeft, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CustomList, MovieLog } from '../types';
import { useCustomLists } from '../hooks/useCustomLists';

export type { CustomList };

interface CustomListsProps {
  movieLogs: MovieLog[];
  customLists: CustomList[];
  onCreateList: (name: string, description: string) => void | Promise<boolean>;
  onUpdateList: (listId: string, name: string, description: string) => void | Promise<boolean>;
  onDeleteList: (listId: string) => void | Promise<boolean>;
  onAddMovieToList: (listId: string, movieId: string) => void | Promise<boolean>;
  onRemoveMovieFromList: (listId: string, movieId: string) => void | Promise<boolean>;
  accountMenu?: ReactNode;
}

export function CustomLists({
  movieLogs,
  customLists,
  onCreateList,
  onUpdateList,
  onDeleteList,
  onAddMovieToList,
  onRemoveMovieFromList,
  accountMenu,
}: CustomListsProps) {
  const {
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
    toggleCreateForm,
    cancelCreateForm,
    handleCreateList,
    handleUpdateList,
    selectList,
    beginEdit,
    cancelEdit,
    goBackToDiary,
    errors,
    editingErrors,
  } = useCustomLists({ movieLogs, customLists, onCreateList, onUpdateList });

  const handleDeleteSelectedList = async () => {
    if (!selectedList) {
      return;
    }

    const confirmed = window.confirm(`Delete "${selectedList.name}"?`);
    if (!confirmed) {
      return;
    }

    await onDeleteList(selectedList.id);
  };

  return (
    <div className="min-h-screen bg-[#261834] p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <button
            onClick={goBackToDiary}
            className="flex items-center text-[#B9A5D2] transition-colors hover:text-[#E0BAAA]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Diary
          </button>
          {accountMenu}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[#B9A5D2]">Custom Lists</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#B9A5D2]/80">
              Organize your diary into themed collections and manage each list from one dedicated workspace.
            </p>
          </div>
          <button
            onClick={toggleCreateForm}
            className="flex items-center rounded-md bg-[#E0BAAA] px-4 py-2 font-semibold text-[#261834] transition-opacity hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New List
          </button>
        </div>

        {showCreateForm && (
          <div className="rounded-2xl bg-[#223662] p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-[#F0E8FA]">Create New List</h2>
              <button
                type="button"
                onClick={cancelCreateForm}
                className="rounded-md border border-[#B9A5D2]/30 p-2 text-[#B9A5D2] hover:bg-[#B9A5D2]/10"
                aria-label="Close create list form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateList} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-start">
              <div>
                <label htmlFor="listName" className="mb-2 block text-sm text-[#B9A5D2]">
                  List Name
                </label>
                <input
                  id="listName"
                  type="text"
                  value={newListName}
                  onChange={(event) => setNewListName(event.target.value)}
                  placeholder="e.g., Sci-Fi Masterpieces"
                  required
                  className="w-full rounded-md border border-[#B9A5D2]/20 bg-[#261834] px-4 py-3 text-[#B9A5D2] outline-none focus:border-[#E0BAAA]"
                />
                {errors.name ? <p className="mt-2 text-sm text-red-300">{errors.name}</p> : null}
              </div>
              <div>
                <label htmlFor="listDescription" className="mb-2 block text-sm text-[#B9A5D2]">
                  Description
                </label>
                <textarea
                  id="listDescription"
                  value={newListDescription}
                  onChange={(event) => setNewListDescription(event.target.value)}
                  placeholder="What ties these movies together?"
                  rows={3}
                  className="w-full rounded-md border border-[#B9A5D2]/20 bg-[#261834] px-4 py-3 text-[#B9A5D2] outline-none focus:border-[#E0BAAA]"
                />
                {errors.description ? <p className="mt-2 text-sm text-red-300">{errors.description}</p> : null}
              </div>
              <div className="flex gap-2 md:pt-7">
                <button
                  type="submit"
                  className="rounded-md bg-[#E0BAAA] px-4 py-3 font-semibold text-[#261834] transition-opacity hover:opacity-90"
                >
                  Create List
                </button>
                <button
                  type="button"
                  onClick={cancelCreateForm}
                  className="rounded-md border border-[#B9A5D2]/40 px-4 py-3 font-semibold text-[#B9A5D2] hover:bg-[#B9A5D2]/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-2xl bg-[#223662] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#F0E8FA]">Your Lists</h2>
              <span className="rounded-full border border-[#E0BAAA]/30 px-3 py-1 text-xs text-[#E0BAAA]">
                {customLists.length} total
              </span>
            </div>

            <label className="mb-4 flex items-center gap-3 rounded-lg border border-[#B9A5D2]/20 bg-[#1A1F3A] px-3 py-2">
              <Search className="h-4 w-4 text-[#E0BAAA]" />
              <input
                type="search"
                value={listSearchQuery}
                onChange={(event) => setListSearchQuery(event.target.value)}
                placeholder="Search lists"
                className="w-full bg-transparent text-[#F0E8FA] outline-none placeholder:text-[#B9A5D2]/55"
                aria-label="Search lists"
              />
            </label>

            {visibleLists.length > 0 ? (
              <div className="space-y-3">
                {visibleLists.map((list) => {
                  const isSelected = list.id === selectedList?.id;

                  return (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => selectList(list.id)}
                      className={`w-full rounded-xl border p-4 text-left transition-all ${
                        isSelected
                          ? 'border-[#E0BAAA]/60 bg-[#1A1F3A] shadow-lg shadow-black/10'
                          : 'border-[#B9A5D2]/10 bg-[#1F2D52]/60 hover:border-[#E0BAAA]/25 hover:bg-[#1A1F3A]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#F0E8FA]">{list.name}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-[#B9A5D2]/75">
                            {list.description || 'No description yet.'}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#E0BAAA]/15 px-2.5 py-1 text-xs text-[#E0BAAA]">
                          {list.movieIds.length}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : customLists.length > 0 ? (
              <div className="rounded-xl border border-dashed border-[#B9A5D2]/20 bg-[#1A1F3A]/60 p-6 text-center text-[#B9A5D2]/75">
                No lists match that search.
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#B9A5D2]/20 bg-[#1A1F3A]/60 p-6 text-center text-[#B9A5D2]/75">
                No custom lists created yet. Click "Create New List" to get started!
              </div>
            )}
          </aside>

          <section className="rounded-2xl bg-[#223662] p-6">
            {selectedList ? (
              <div className="space-y-6">
                {editingListId === selectedList.id ? (
                  <form onSubmit={handleUpdateList} className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="flex-1">
                        <label htmlFor="editing-list-name" className="mb-2 block text-sm text-[#B9A5D2]">
                          List Name
                        </label>
                        <input
                          id="editing-list-name"
                          type="text"
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          className="w-full rounded-md border border-[#B9A5D2]/20 bg-[#261834] px-4 py-3 text-[#F0E8FA] outline-none focus:border-[#E0BAAA]"
                        />
                        {editingErrors.name ? <p className="mt-2 text-sm text-red-300">{editingErrors.name}</p> : null}
                      </div>
                      <div className="flex gap-2 md:pt-7">
                        <button
                          type="submit"
                          className="rounded-md bg-[#E0BAAA] px-4 py-3 font-semibold text-[#261834] hover:opacity-90"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-md border border-[#B9A5D2]/40 px-4 py-3 text-[#B9A5D2] hover:bg-[#B9A5D2]/10"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="editing-list-description" className="mb-2 block text-sm text-[#B9A5D2]">
                        Description
                      </label>
                      <textarea
                        id="editing-list-description"
                        value={editingDescription}
                        onChange={(event) => setEditingDescription(event.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-[#B9A5D2]/20 bg-[#261834] px-4 py-3 text-[#B9A5D2] outline-none focus:border-[#E0BAAA]"
                      />
                      {editingErrors.description ? <p className="mt-2 text-sm text-red-300">{editingErrors.description}</p> : null}
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-3xl font-bold text-[#F0E8FA]">{selectedList.name}</h2>
                      <p className="mt-2 max-w-2xl text-[#B9A5D2]/80">
                        {selectedList.description || 'Add a short description to explain the taste or mood behind this collection.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={beginEdit}
                        className="flex items-center rounded-md border border-[#E0BAAA]/40 px-4 py-2 text-[#E0BAAA] hover:bg-[#E0BAAA]/10"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit List
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSelectedList()}
                        className="flex items-center rounded-md border border-red-400/40 px-4 py-2 text-red-100 hover:bg-red-500/10"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete List
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl bg-[#1A1F3A] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[#E0BAAA]">Movies in list</p>
                    <p className="mt-2 text-3xl font-bold text-[#F0E8FA]">{selectedListMovies.length}</p>
                  </div>
                  <div className="rounded-xl bg-[#1A1F3A] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[#E0BAAA]">Available to add</p>
                    <p className="mt-2 text-3xl font-bold text-[#F0E8FA]">{availableMovies.length}</p>
                  </div>
                  <div className="rounded-xl bg-[#1A1F3A] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[#E0BAAA]">Total diary movies</p>
                    <p className="mt-2 text-3xl font-bold text-[#F0E8FA]">{movieLogs.length}</p>
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-xl border border-[#B9A5D2]/20 bg-[#1A1F3A] px-4 py-3">
                  <Search className="h-4 w-4 text-[#E0BAAA]" />
                  <input
                    type="search"
                    value={movieSearchQuery}
                    onChange={(event) => setMovieSearchQuery(event.target.value)}
                    placeholder="Search movies inside and outside this list"
                    className="w-full bg-transparent text-[#F0E8FA] outline-none placeholder:text-[#B9A5D2]/55"
                    aria-label="Search movies in list workspace"
                  />
                </label>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[#E0BAAA]">Movies in This List</h3>
                      <span className="text-sm text-[#B9A5D2]/75">{selectedListMovies.length} selected</span>
                    </div>
                    {selectedListMovies.length > 0 ? (
                      <div className="space-y-3">
                        {selectedListMovies.map((movie) => (
                          <div
                            key={movie.id}
                            className="flex items-center justify-between gap-4 rounded-xl bg-[#1A1F3A] p-4"
                          >
                            <div>
                              <p className="font-medium text-[#F0E8FA]">{movie.movieName}</p>
                              <p className="mt-1 text-sm text-[#B9A5D2]/75">
                                Watched on {new Date(movie.watchDate).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void onRemoveMovieFromList(selectedList.id, movie.id)}
                              className="rounded-md border border-red-400/35 px-3 py-2 text-sm text-red-100 hover:bg-red-500/10"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-[#B9A5D2]/20 bg-[#1A1F3A] p-6 text-[#B9A5D2]/75">
                        {movieSearchQuery.trim()
                          ? 'No movies in this list match that search.'
                          : 'No movies in this list yet.'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[#E0BAAA]">Add from Diary</h3>
                      <span className="text-sm text-[#B9A5D2]/75">{availableMovies.length} available</span>
                    </div>
                    {availableMovies.length > 0 ? (
                      <div className="space-y-3">
                        {availableMovies.map((movie) => (
                          <div
                            key={movie.id}
                            className="flex items-center justify-between gap-4 rounded-xl bg-[#1A1F3A] p-4"
                          >
                            <div>
                              <p className="font-medium text-[#F0E8FA]">{movie.movieName}</p>
                              <p className="mt-1 text-sm text-[#B9A5D2]/75">
                                Watched on {new Date(movie.watchDate).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void onAddMovieToList(selectedList.id, movie.id)}
                              className="rounded-md bg-[#E0BAAA] px-3 py-2 text-sm font-semibold text-[#261834] hover:opacity-90"
                            >
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : movieLogs.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#B9A5D2]/20 bg-[#1A1F3A] p-6 text-[#B9A5D2]/75">
                        No movies logged yet. Add some movies to your diary to build lists.
                      </div>
                    ) : movieSearchQuery.trim() ? (
                      <div className="rounded-xl border border-dashed border-[#B9A5D2]/20 bg-[#1A1F3A] p-6 text-[#B9A5D2]/75">
                        No available movies match that search.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-[#B9A5D2]/20 bg-[#1A1F3A] p-6 text-[#B9A5D2]/75">
                        Every logged movie is already in this list.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[20rem] items-center justify-center rounded-xl border border-dashed border-[#B9A5D2]/20 bg-[#1A1F3A] p-6 text-center text-[#B9A5D2]/75">
                Create your first list to start grouping movies into collections that actually feel curated.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
