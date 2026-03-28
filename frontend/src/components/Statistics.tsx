import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { MovieLog } from '../types';

interface StatisticsProps {
  movieLogs: MovieLog[];
}

interface RatingDataEntry {
  rating: string;
  count: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: RatingDataEntry }>;
}

// Color gradient from cool blue to bright gold
const getBarColor = (rating: string, count: number) => {
  if (count === 0) return 'rgba(74, 144, 226, 0.2)';

  const colorMap: { [key: string]: string } = {
    '0': '#4A90E2',     // Muted cool blue
    '0.5': '#4A9EE2',   // Slightly warmer blue
    '1': '#4A90E2',     // Cool blue
    '1.5': '#4AA8D8',   // Blue-teal
    '2': '#4BC0C0',     // Teal
    '2.5': '#5FD3BC',   // Cyan-teal
    '3': '#7FD8A0',     // Light green
    '3.5': '#A8DB7A',   // Green-yellow
    '4': '#D4D85A',     // Yellow
    '4.5': '#EFC842',   // Warm yellow
    '5': '#FFD700',     // Bright gold
  };

  return colorMap[rating] || '#E0BAAA';
};

// Custom tooltip component
const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg p-3 shadow-lg" style={{ backgroundColor: '#223662', border: '1px solid rgba(185, 165, 210, 0.2)' }}>
        <p className="font-medium" style={{ color: '#E0BAAA' }}>
          {payload[0].payload.rating} ★
        </p>
        <p className="text-sm" style={{ color: '#B9A5D2' }}>
          {payload[0].value} {payload[0].value === 1 ? 'movie' : 'movies'}
        </p>
      </div>
    );
  }
  return null;
};

export function Statistics({ movieLogs }: StatisticsProps) {
  const navigate = useNavigate();

  // Generate rating distribution data from actual movie logs
  const ratingData = [
    { rating: '0.5', count: 0 },
    { rating: '1', count: 0 },
    { rating: '1.5', count: 0 },
    { rating: '2', count: 0 },
    { rating: '2.5', count: 0 },
    { rating: '3', count: 0 },
    { rating: '3.5', count: 0 },
    { rating: '4', count: 0 },
    { rating: '4.5', count: 0 },
    { rating: '5', count: 0 },
  ];

  // Count movies by rating
  movieLogs.forEach((movie) => {
    if (movie.rating !== undefined) {
      const ratingEntry = ratingData.find((item) => parseFloat(item.rating) === movie.rating);
      if (ratingEntry) {
        ratingEntry.count++;
      }
    }
  });

  // Calculate statistics
  const totalMovies = movieLogs.length;
  const ratedMovies = movieLogs.filter((m) => m.rating !== undefined);
  const averageRating = ratedMovies.length > 0
    ? ratedMovies.reduce((sum, movie) => sum + (movie.rating || 0), 0) / ratedMovies.length
    : 0;

  const mostCommonRating = ratedMovies.length > 0
    ? ratingData.reduce((prev, current) => (prev.count > current.count ? prev : current)).rating
    : '-';

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#261834' }}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/diary')}
          className="flex items-center mb-4 text-[#B9A5D2] hover:text-[#E0BAAA] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Diary
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="w-8 h-8" style={{ color: '#E0BAAA' }} />
          <h1 className="text-4xl font-bold" style={{ color: '#B9A5D2' }}>
            Rating Statistics
          </h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg p-6 space-y-2" style={{ backgroundColor: '#223662' }}>
            <p className="text-sm opacity-70" style={{ color: '#B9A5D2' }}>
              Total Movies
            </p>
            <p className="text-3xl font-bold" style={{ color: '#E0BAAA' }}>
              {totalMovies}
            </p>
          </div>
          <div className="rounded-lg p-6 space-y-2" style={{ backgroundColor: '#223662' }}>
            <p className="text-sm opacity-70" style={{ color: '#B9A5D2' }}>
              Average Rating
            </p>
            <p className="text-3xl font-bold" style={{ color: '#E0BAAA' }}>
              {averageRating.toFixed(1)} ★
            </p>
          </div>
          <div className="rounded-lg p-6 space-y-2" style={{ backgroundColor: '#223662' }}>
            <p className="text-sm opacity-70" style={{ color: '#B9A5D2' }}>
              Most Common Rating
            </p>
            <p className="text-3xl font-bold" style={{ color: '#FFD700' }}>
              {mostCommonRating === '-' ? '-' : `${mostCommonRating} ★`}
            </p>
          </div>
        </div>

        {/* Chart */}
        {movieLogs.length > 0 ? (
          <div className="rounded-lg p-8" style={{ backgroundColor: '#223662' }}>
            <h2 className="text-2xl mb-6" style={{ color: '#B9A5D2' }}>
              Rating Distribution
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={ratingData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(185, 165, 210, 0.1)"
                  vertical={false}
                />
                <XAxis
                  dataKey="rating"
                  stroke="#B9A5D2"
                  tick={{ fill: '#B9A5D2', fontSize: 14 }}
                  label={{
                    value: 'Rating (Stars)',
                    position: 'insideBottom',
                    offset: -10,
                    style: { fill: '#B9A5D2', fontSize: 14 },
                  }}
                />
                <YAxis
                  stroke="#B9A5D2"
                  tick={{ fill: '#B9A5D2', fontSize: 14 }}
                  label={{
                    value: 'Number of Movies',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: '#B9A5D2', fontSize: 14 },
                  }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(224, 186, 170, 0.1)' }} />
                <Bar dataKey="count" fill="#E0BAAA" radius={[8, 8, 0, 0]}>
                  {ratingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.rating, entry.count)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p
              className="text-sm text-center mt-6 opacity-70"
              style={{ color: '#B9A5D2' }}
            >
              Showing the distribution of ratings from 0 to 5 stars (0.5 increments)
            </p>
          </div>
        ) : (
          <div className="rounded-lg p-8" style={{ backgroundColor: '#223662' }}>
            <p className="text-center text-lg opacity-70" style={{ color: '#B9A5D2' }}>
              No movies logged yet. Add some movies to see rating statistics!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}




