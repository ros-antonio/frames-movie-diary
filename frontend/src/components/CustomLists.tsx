import { ArrowLeft, Plus, Eye, Trash2 } from 'lucide-react';
import type { CustomList, MovieLog } from '../types';
import { useCustomLists } from '../hooks/useCustomLists';

export type { CustomList };

interface CustomListsProps {
  movieLogs: MovieLog[];
  customLists: CustomList[];
  onCreateList: (name: string, description: string) => void;
  onDeleteList: (listId: string) => void;
  onAddMovieToList: (listId: string, movieId: string) => void;
  onRemoveMovieFromList: (listId: string, movieId: string) => void;
}

export function CustomLists({
  movieLogs,
  customLists,
  onCreateList,
  onDeleteList,
  onAddMovieToList,
  onRemoveMovieFromList,
}: CustomListsProps) {
  const {
    showCreateForm,
    newListName,
    newListDescription,
    selectedList,
    selectedListMovies,
    availableMovies,
    setNewListName,
    setNewListDescription,
    toggleCreateForm,
    cancelCreateForm,
    handleCreateList,
    toggleViewList,
    goBackToDiary,
  } = useCustomLists({ movieLogs, customLists, onCreateList });

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#261834' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        <button
          onClick={goBackToDiary}
          className="flex items-center mb-4 text-[#B9A5D2] hover:text-[#E0BAAA] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Diary
        </button>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#B9A5D2' }}>
            Custom Lists
          </h1>
          <button
            onClick={toggleCreateForm}
            className="flex items-center px-4 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#E0BAAA', color: '#261834' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New List
          </button>
        </div>

        {showCreateForm && (
          <div className="rounded-lg p-6 space-y-4" style={{ backgroundColor: '#223662' }}>
            <h2 className="text-xl font-semibold" style={{ color: '#B9A5D2' }}>
              Create New List
            </h2>
            <form onSubmit={handleCreateList} className="space-y-4">
              <div>
                <label htmlFor="listName" className="block text-sm mb-2" style={{ color: '#B9A5D2' }}>
                  List Name
                </label>
                <input
                  id="listName"
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g., Sci-Fi Masterpieces"
                  required
                  className="w-full px-4 py-2 rounded-md bg-[#261834] text-[#B9A5D2] border border-[#B9A5D2]/20 outline-none focus:border-[#E0BAAA]"
                />
              </div>
              <div>
                <label
                  htmlFor="listDescription"
                  className="block text-sm mb-2"
                  style={{ color: '#B9A5D2' }}
                >
                  Description
                </label>
                <textarea
                  id="listDescription"
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  placeholder="Describe this list..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-md bg-[#261834] text-[#B9A5D2] border border-[#B9A5D2]/20 outline-none focus:border-[#E0BAAA]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md font-semibold text-[#261834] hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#E0BAAA' }}
                >
                  Create List
                </button>
                <button
                  type="button"
                  onClick={cancelCreateForm}
                  className="px-4 py-2 rounded-md font-semibold border"
                  style={{ borderColor: '#B9A5D2', color: '#B9A5D2' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {customLists.length > 0 ? (
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#223662' }}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(185, 165, 210, 0.2)' }}>
                  <th className="p-4 font-semibold" style={{ color: '#B9A5D2' }}>
                    List Name
                  </th>
                  <th className="p-4 font-semibold" style={{ color: '#B9A5D2' }}>
                    Description
                  </th>
                  <th className="p-4 font-semibold" style={{ color: '#B9A5D2' }}>
                    Movies
                  </th>
                  <th className="p-4 font-semibold text-right" style={{ color: '#B9A5D2' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {customLists.map((list) => (
                  <tr
                    key={list.id}
                    style={{ borderBottom: '1px solid rgba(185, 165, 210, 0.2)' }}
                    className="hover:bg-[#1a1f3a] transition-colors"
                  >
                    <td className="p-4" style={{ color: '#B9A5D2' }}>
                      {list.name}
                    </td>
                    <td className="p-4 opacity-80" style={{ color: '#B9A5D2' }}>
                      {list.description}
                    </td>
                    <td className="p-4" style={{ color: '#E0BAAA' }}>
                      {list.movieIds.length}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => toggleViewList(list.id)}
                          className="flex items-center px-3 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: '#E0BAAA', color: '#261834' }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </button>
                        <button
                          onClick={() => onDeleteList(list.id)}
                          className="flex items-center px-3 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: '#ff6b6b', color: '#fff' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg p-8 text-center" style={{ backgroundColor: '#223662' }}>
            <p className="text-lg opacity-70" style={{ color: '#B9A5D2' }}>
              No custom lists created yet. Click "Create New List" to get started!
            </p>
          </div>
        )}

        {selectedList && (
          <div className="rounded-lg p-6 space-y-4" style={{ backgroundColor: '#223662' }}>
            <h2 className="text-2xl font-bold" style={{ color: '#B9A5D2' }}>
              {selectedList.name}
            </h2>
            <p style={{ color: '#B9A5D2' }} className="opacity-80">
              {selectedList.description}
            </p>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold" style={{ color: '#E0BAAA' }}>
                Movies in List ({selectedListMovies.length})
              </h3>
              {selectedListMovies.length > 0 ? (
                <div className="space-y-2">
                  {selectedListMovies.map((movie) => (
                    <div
                      key={movie.id}
                      className="flex items-center justify-between p-3 rounded-md"
                      style={{ backgroundColor: '#1a1f3a' }}
                    >
                      <div>
                        <p style={{ color: '#B9A5D2' }}>{movie.movieName}</p>
                        <p className="text-sm opacity-70" style={{ color: '#B9A5D2' }}>
                          {new Date(movie.watchDate).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => onRemoveMovieFromList(selectedList.id, movie.id)}
                        className="px-2 py-1 rounded text-sm"
                        style={{ backgroundColor: '#ff6b6b', color: '#fff' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="opacity-70" style={{ color: '#B9A5D2' }}>
                  No movies in this list yet.
                </p>
              )}
            </div>

            {availableMovies.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#B9A5D2]/20">
                <h3 className="text-lg font-semibold" style={{ color: '#E0BAAA' }}>
                  Add Movies
                </h3>
                <div className="space-y-2">
                  {availableMovies.map((movie) => (
                    <div
                      key={movie.id}
                      className="flex items-center justify-between p-3 rounded-md"
                      style={{ backgroundColor: '#1a1f3a' }}
                    >
                      <div>
                        <p style={{ color: '#B9A5D2' }}>{movie.movieName}</p>
                        <p className="text-sm opacity-70" style={{ color: '#B9A5D2' }}>
                          {new Date(movie.watchDate).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => onAddMovieToList(selectedList.id, movie.id)}
                        className="px-3 py-1 rounded text-sm font-semibold hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: '#E0BAAA', color: '#261834' }}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {movieLogs.length === 0 && (
              <p className="opacity-70 text-center" style={{ color: '#B9A5D2' }}>
                No movies logged yet. Add some movies to your diary to add them to lists!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

